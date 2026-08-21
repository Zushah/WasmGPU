/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as WasmGPU from "../../release/WasmGPU.js";
import { summarize } from "./stats.js";

const now = () => performance.now();
const benchmarkTypes = new Set(["micro", "throughput", "latency", "frame", "e2e"]);
const softwareAdapterPattern = /swiftshader|llvmpipe|lavapipe|software|warp/i;

const installWebGPUMonitor = () => {
    const counts = { devices: 0, submissions: 0 };
    const wrappedAdapters = new WeakSet(), wrappedQueues = new WeakSet();
    const requestAdapter = navigator.gpu.requestAdapter.bind(navigator.gpu);
    navigator.gpu.requestAdapter = async (...adapterArguments) => {
        const adapter = await requestAdapter(...adapterArguments);
        if (!adapter || wrappedAdapters.has(adapter)) return adapter;
        wrappedAdapters.add(adapter);
        const requestDevice = adapter.requestDevice.bind(adapter);
        adapter.requestDevice = async (...deviceArguments) => {
            const device = await requestDevice(...deviceArguments);
            counts.devices++;
            const queue = device.queue;
            if (!wrappedQueues.has(queue)) {
                wrappedQueues.add(queue);
                const submit = queue.submit.bind(queue);
                queue.submit = (...submitArguments) => {
                    const result = submit(...submitArguments);
                    counts.submissions++;
                    return result;
                };
            }
            return device;
        };
        return adapter;
    };
    return counts;
};

const adapterMetadata = (adapter) => {
    const info = adapter.info ?? {};
    const metadata = {
        vendor: info.vendor ?? null,
        architecture: info.architecture ?? null,
        device: info.device ?? null,
        description: info.description ?? null,
        isFallbackAdapter: info.isFallbackAdapter ?? null
    };
    const identity = Object.values(metadata).filter((value) => typeof value === "string").join(" ");
    metadata.isSoftwareAdapter = metadata.isFallbackAdapter === true || softwareAdapterPattern.test(identity);
    metadata.isNativeAdapter = metadata.isFallbackAdapter === false && !metadata.isSoftwareAdapter;
    return metadata;
};

const measureBatch = async (definition, state, context, size, repetitions) => {
    const start = now();
    for (let repeat = 0; repeat < repetitions; repeat++) await definition.run(state, context, size);
    if (definition.gpu) await context.device.queue.onSubmittedWorkDone();
    return now() - start;
};

export const runBenchmarks = async ({ definitions, mode, allowFallback = false, onProgress }) => {
    if (!navigator.gpu) throw new Error("WebGPU is unavailable in the benchmark browser.");
    const monitor = installWebGPUMonitor();
    await WasmGPU.initWebAssembly(new URL("../../release/", import.meta.url).toString());
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance", forceFallbackAdapter: false });
    if (!adapter) throw new Error("No native WebGPU adapter was available. Software/fallback adapters are not accepted by default.");
    const adapterInfo = adapterMetadata(adapter);
    if (!adapterInfo.isNativeAdapter && !allowFallback) throw new Error("A native hardware WebGPU adapter could not be verified. Fallback, software, and unidentified adapters are rejected. Use --allow-fallback only for local harness diagnostics, never tracked performance results.");
    const device = await adapter.requestDevice();
    const deviceErrors = [];
    device.addEventListener("uncapturederror", (event) => deviceErrors.push(event.error?.message ?? String(event.error)));
    let unexpectedLoss = null;
    device.lost.then((info) => { if (info.reason !== "destroyed") unexpectedLoss = `${info.reason}: ${info.message}`; });
    const compute = new WasmGPU.Compute(device, device.queue);
    const context = { WasmGPU, adapter, device, queue: device.queue, compute };
    const results = [];
    try {
        for (let definitionIndex = 0; definitionIndex < definitions.length; definitionIndex++) {
            const definition = definitions[definitionIndex], benchmarkStart = now(), devicesAtStart = monitor.devices, submissionsAtStart = monitor.submissions;
            if (!benchmarkTypes.has(definition.type)) throw new Error(`Invalid benchmark type for ${definition.name}: ${definition.type}`);
            const sizes = definition.sizes[mode];
            const cases = [];
            for (const size of sizes) {
                const state = await definition.setup(context, size, mode);
                try {
                    const warmup = definition.warmup?.[mode] ?? (mode === "full" ? 3 : 2);
                    const sampleCount = definition.samples?.[mode] ?? (mode === "full" ? 12 : 5);
                    for (let i = 0; i < warmup; i++) {
                        await definition.run(state, context, size);
                        if (definition.gpu) await device.queue.onSubmittedWorkDone();
                        await definition.afterSample?.(state, context);
                    }
                    const batchable = definition.type === "throughput" || definition.type === "micro";
                    const minimumMeasurementMilliseconds = definition.minimumMeasurementMilliseconds?.[mode] ?? (mode === "full" ? 50 : 25);
                    const maximumRepetitions = definition.maximumRepetitions ?? 65_536;
                    let repetitions = 1;
                    if (batchable) {
                        let calibrationMilliseconds = await measureBatch(definition, state, context, size, repetitions);
                        await definition.afterSample?.(state, context);
                        while (calibrationMilliseconds < minimumMeasurementMilliseconds && repetitions < maximumRepetitions) {
                            repetitions = Math.min(maximumRepetitions, repetitions * 2);
                            calibrationMilliseconds = await measureBatch(definition, state, context, size, repetitions);
                            await definition.afterSample?.(state, context);
                        }
                    }
                    const milliseconds = [], repetitionsPerSample = [];
                    for (let i = 0; i < sampleCount; i++) {
                        let elapsed = await measureBatch(definition, state, context, size, repetitions);
                        await definition.afterSample?.(state, context);
                        while (batchable && elapsed < minimumMeasurementMilliseconds && repetitions < maximumRepetitions) {
                            repetitions = Math.min(maximumRepetitions, repetitions * 2);
                            elapsed = await measureBatch(definition, state, context, size, repetitions);
                            await definition.afterSample?.(state, context);
                        }
                        milliseconds.push(elapsed);
                        repetitionsPerSample.push(repetitions);
                    }
                    const operations = definition.operations(size, state);
                    const latencyMetric = definition.type === "latency" || definition.type === "frame" || definition.type === "e2e";
                    const primarySamples = latencyMetric ? milliseconds : milliseconds.map((ms, index) => (operations * repetitionsPerSample[index]) / (ms / 1000));
                    try {
                        cases.push({
                            size,
                            workload: definition.workload(size, state),
                            minimumMeasurementMilliseconds: batchable ? minimumMeasurementMilliseconds : null,
                            repetitions: repetitionsPerSample,
                            milliseconds,
                            primarySamples,
                            statistics: summarize(primarySamples),
                            millisecondsStatistics: summarize(milliseconds)
                        });
                    } catch (error) { throw new Error(`${definition.subsystem}/${definition.name} (size ${size}): ${error.message}`); }
                } finally { await definition.teardown?.(state, context); }
            }
            results.push({
                name: definition.name,
                subsystem: definition.subsystem,
                type: definition.type,
                unit: definition.unit,
                description: definition.description,
                mode, cases
            });
            await onProgress?.({
                index: definitionIndex + 1,
                total: definitions.length,
                subsystem: definition.subsystem,
                name: definition.name,
                elapsedMilliseconds: now() - benchmarkStart,
                devices: monitor.devices - devicesAtStart,
                submissions: monitor.submissions - submissionsAtStart
            });
        }
        await device.queue.onSubmittedWorkDone();
        if (deviceErrors.length) throw new Error(`WebGPU reported errors: ${deviceErrors.join("; ")}`);
        if (unexpectedLoss) throw new Error(`WebGPU device lost: ${unexpectedLoss}`);
        return {
            results, runtime: {
                userAgent: navigator.userAgent,
                adapter: adapterInfo,
                fallbackAllowed: allowFallback,
                features: [...device.features].sort(),
                limits: Object.fromEntries(Object.keys(Object.getPrototypeOf(device.limits)).map((key) => [key, device.limits[key]]).filter(([, value]) => typeof value === "number"))
            }
        };
    } finally { compute.destroy(); await device.queue.onSubmittedWorkDone().catch(() => {}); device.destroy(); }
};
