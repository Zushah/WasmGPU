/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, destroyTestDevice, setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../dist/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers(1e-5);

const { device } = await setupTest({ initWebAssembly: WasmGPU.initWebAssembly, webgpu: true });

const { Compute, ScaleService, normalizeScaleTransform, packScaleTransform, applyScaleTransformCPU, PointCloud, GlyphField, DataMaterial } = WasmGPU;

assert.ok(Compute, "Missing export: Compute");
assert.ok(ScaleService, "Missing export: ScaleService");
assert.ok(PointCloud, "Missing export: PointCloud");
assert.ok(GlyphField, "Missing export: GlyphField");
assert.ok(DataMaterial, "Missing export: DataMaterial");

const compute = new Compute(device, device.queue);
const scale = new ScaleService(compute);

// 1) ScaleTransform normalization/validation + uniform packing.
{
    const t = normalizeScaleTransform({
        mode: "symlog",
        clampMode: "percentile",
        valueMode: "magnitude",
        componentCount: 9,
        componentIndex: 9,
        stride: 1,
        offset: -5,
        domainMin: -10,
        domainMax: 20,
        clampMin: -4,
        clampMax: 7,
        percentileLow: -5,
        percentileHigh: 120,
        logBase: 1,
        symlogLinThresh: 0,
        gamma: 0,
        invert: true
    });

    assert.strictEqual(t.componentCount, 4, "componentCount normalization failed");
    assert.strictEqual(t.componentIndex, 3, "componentIndex normalization failed");
    assert.strictEqual(t.stride, 4, "stride normalization failed");
    assert.strictEqual(t.offset, 0, "offset normalization failed");
    assert.strictEqual(t.percentileLow, 0, "percentileLow normalization failed");
    assert.strictEqual(t.percentileHigh, 100, "percentileHigh normalization failed");
    assert.ok(t.logBase > 1, "logBase should be > 1");
    assert.ok(t.symlogLinThresh > 0, "symlogLinThresh should be > 0");
    assert.ok(t.gamma > 0, "gamma should be > 0");
    assert.strictEqual(t.invert, true, "invert normalization failed");

    const packed = new Float32Array(20);
    packScaleTransform(t, packed, 0);
    numberApproxEqual(packed[0], 4, 1e-6, "packed.componentCount");
    numberApproxEqual(packed[1], 3, 1e-6, "packed.componentIndex");
    numberApproxEqual(packed[3], 4, 1e-6, "packed.stride");
    numberApproxEqual(packed[4], -10, 1e-6, "packed.domainMin");
    numberApproxEqual(packed[5], 20, 1e-6, "packed.domainMax");
    numberApproxEqual(packed[8], -4, 1e-6, "packed.clampMin");
    numberApproxEqual(packed[9], 7, 1e-6, "packed.clampMax");
    numberApproxEqual(packed[10], 0, 1e-6, "packed.percentileLow");
    numberApproxEqual(packed[11], 100, 1e-6, "packed.percentileHigh");
    numberApproxEqual(packed[16], 1, 1e-6, "packed.invert flag");

    assert.throws(() => {
        normalizeScaleTransform({ percentileLow: 50, percentileHigh: 50 });
    }, /percentileHigh > percentileLow/, "Expected normalization validation for invalid percentile range");
}

// 2) Compute remap parity (linear/log/symlog) against CPU reference.
{
    const cases = [
        {
            name: "linear",
            values: new Float32Array([-2, -1, -0.5, 0, 0.5, 1, 2]),
            transform: normalizeScaleTransform({ mode: "linear", clampMode: "range", clampMin: -2, clampMax: 2, domainMin: -2, domainMax: 2, gamma: 1.2 })
        },
        {
            name: "log",
            values: new Float32Array([0.1, 0.2, 0.5, 1, 2, 5, 10]),
            transform: normalizeScaleTransform({ mode: "log", clampMode: "range", clampMin: 0.1, clampMax: 10, domainMin: 0.1, domainMax: 10, logBase: 10, gamma: 0.9 })
        },
        {
            name: "symlog",
            values: new Float32Array([-100, -10, -1, -0.1, 0, 0.1, 1, 10, 100]),
            transform: normalizeScaleTransform({ mode: "symlog", clampMode: "range", clampMin: -100, clampMax: 100, domainMin: -100, domainMax: 100, symlogLinThresh: 0.25, logBase: 10, gamma: 1.1, invert: true })
        }
    ];

    for (const testCase of cases) {
        const src = compute.createStorageBuffer({
            label: `scaling:parity:${testCase.name}:src`,
            data: testCase.values,
            copySrc: false
        });
        const remapped = compute.kernels.remapScaleF32(src, {
            count: testCase.values.length,
            transform: testCase.transform
        });
        await device.queue.onSubmittedWorkDone();
        const gpuOut = await remapped.readAs(Float32Array);
        const cpuOut = new Float32Array(testCase.values.length);
        for (let i = 0; i < testCase.values.length; i++) cpuOut[i] = applyScaleTransformCPU(testCase.values[i], testCase.transform);
        arraysApproxEqual(gpuOut, cpuOut, 2e-4, `GPU remap parity mismatch (${testCase.name})`);
        src.destroy();
        remapped.destroy();
    }
}

// 3) Async min/max stats correctness on GPU buffers (non-finite ignored).
{
    const values = new Float32Array([3, 1, Number.NaN, -7, 2, Number.POSITIVE_INFINITY, -1, 9]);
    const src = compute.createStorageBuffer({
        label: "scaling:stats:minmax:src",
        data: values,
        copySrc: false
    });

    const stats = await scale.requestStats({
        source: {
            buffer: src.buffer,
            count: values.length,
            componentCount: 1,
            componentIndex: 0,
            stride: 1,
            offset: 0,
            revision: 0
        }
    });

    assert.strictEqual(stats.count, values.length, "stats.count mismatch");
    assert.strictEqual(stats.finiteCount, 6, "stats.finiteCount should ignore NaN/Inf");
    numberApproxEqual(stats.min, -7, 1e-6, "stats.min mismatch");
    numberApproxEqual(stats.max, 9, 1e-6, "stats.max mismatch");
    assert.strictEqual(stats.percentileMin, null, "percentileMin should be null when not requested");
    assert.strictEqual(stats.percentileMax, null, "percentileMax should be null when not requested");

    src.destroy();
}

// 4) Histogram-percentile clamping behavior on skewed datasets.
{
    const values = new Float32Array(1000);
    values.fill(0, 0, 900);
    values.fill(1, 900, 990);
    values.fill(100, 990, 1000);

    const src = compute.createStorageBuffer({
        label: "scaling:stats:percentile:src",
        data: values,
        copySrc: false
    });

    const stats = await scale.requestStats({
        source: {
            buffer: src.buffer,
            count: values.length,
            componentCount: 1,
            componentIndex: 0,
            stride: 1,
            offset: 0,
            revision: 0
        },
        percentiles: {
            low: 2,
            high: 98,
            bins: 128
        }
    });

    numberApproxEqual(stats.min, 0, 1e-6, "percentile test min mismatch");
    numberApproxEqual(stats.max, 100, 1e-6, "percentile test max mismatch");
    assert.ok(stats.percentileMin !== null && stats.percentileMin >= 0 && stats.percentileMin <= 0.5, `Unexpected percentileMin: ${stats.percentileMin}`);
    assert.ok(stats.percentileMax !== null && stats.percentileMax > 0.5 && stats.percentileMax < 10, `Unexpected percentileMax: ${stats.percentileMax}`);
    assert.strictEqual(stats.histogramBins, 128, "histogram bin count mismatch");

    src.destroy();
}

// 5) Cache behavior: miss -> hit -> invalidate/revision -> recompute.
{
    const values = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const src = compute.createStorageBuffer({
        label: "scaling:cache:src",
        data: values,
        copySrc: false
    });

    const baseRequest = {
        source: {
            buffer: src.buffer,
            count: values.length,
            componentCount: 1,
            componentIndex: 0,
            stride: 1,
            offset: 0,
            revision: 1
        },
        percentiles: {
            low: 10,
            high: 90,
            bins: 64
        }
    };

    const p1 = scale.requestStats(baseRequest);
    const p2 = scale.requestStats(baseRequest);
    assert.strictEqual(p1, p2, "Expected cache hit to return the same pending promise");
    await p1;

    scale.invalidate(src.buffer);
    const p3 = scale.requestStats(baseRequest);
    assert.notStrictEqual(p3, p1, "Expected invalidate() to force cache miss");
    await p3;

    const p4 = scale.requestStats({
        ...baseRequest,
        source: { ...baseRequest.source, revision: 2 }
    });
    assert.notStrictEqual(p4, p3, "Expected revision change to force recomputation");
    await p4;

    src.destroy();
}

// 6) PointCloud/GlyphField/DataMaterial integration: transform-only remapping (no data-buffer rewrite).
{
    const pointData = new Float32Array([
        0, 0, 0, 0.1,
        1, 0, 0, 1.0,
        2, 0, 0, 10.0
    ]);
    const pointCloud = new PointCloud({
        data: pointData,
        scaleTransform: {
            componentCount: 4,
            componentIndex: 3,
            stride: 4,
            offset: 0,
            mode: "linear",
            clampMode: "range",
            domainMin: 0,
            domainMax: 10,
            clampMin: 0,
            clampMax: 10
        }
    });
    pointCloud.upload(device, device.queue);
    assert.ok(pointCloud.pointsBuffer, "PointCloud pointsBuffer should exist after upload");
    const pcBufferRef = pointCloud.pointsBuffer;
    const pcUniformBefore = pointCloud.getUniformData().slice();
    pointCloud.setScaleTransform({
        componentCount: 4,
        componentIndex: 3,
        stride: 4,
        offset: 0,
        mode: "symlog",
        clampMode: "range",
        domainMin: 0.1,
        domainMax: 10,
        clampMin: 0.1,
        clampMax: 10,
        symlogLinThresh: 0.5,
        gamma: 0.8,
        invert: true
    });
    const pcUniformAfter = pointCloud.getUniformData().slice();
    assert.strictEqual(pointCloud.pointsBuffer, pcBufferRef, "PointCloud data buffer should not be rewritten for remap-only changes");
    assert.notDeepStrictEqual(Array.from(pcUniformBefore), Array.from(pcUniformAfter), "PointCloud uniform data should change after setScaleTransform");

    const glyphField = new GlyphField({
        positions: new Float32Array([0, 0, 0, 0, 1, 0, 0, 0]),
        rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
        scales: new Float32Array([1, 1, 1, 0, 1, 1, 1, 0]),
        attributes: new Float32Array([0.1, 0.2, 0.3, 1.0, 10.0, 0.1, 0.2, 1.0]),
        scaleTransform: {
            componentCount: 4,
            componentIndex: 0,
            stride: 4,
            offset: 0,
            mode: "linear",
            clampMode: "range",
            domainMin: 0,
            domainMax: 10,
            clampMin: 0,
            clampMax: 10
        }
    });
    glyphField.upload(device, device.queue);
    assert.ok(glyphField.attributesBuffer, "GlyphField attributesBuffer should exist after upload");
    const gfBufferRef = glyphField.attributesBuffer;
    const gfUniformBefore = glyphField.getUniformData().slice();
    glyphField.setScaleTransform({
        componentCount: 4,
        componentIndex: 0,
        stride: 4,
        offset: 0,
        mode: "log",
        clampMode: "range",
        domainMin: 0.1,
        domainMax: 10,
        clampMin: 0.1,
        clampMax: 10,
        logBase: 10,
        gamma: 1.3
    });
    const gfUniformAfter = glyphField.getUniformData().slice();
    assert.strictEqual(glyphField.attributesBuffer, gfBufferRef, "GlyphField data buffer should not be rewritten for remap-only changes");
    assert.notDeepStrictEqual(Array.from(gfUniformBefore), Array.from(gfUniformAfter), "GlyphField uniform data should change after setScaleTransform");

    const dataMaterial = new DataMaterial({
        data: new Float32Array([0.1, 1.0, 10.0, 100.0]),
        scaleTransform: {
            componentCount: 1,
            componentIndex: 0,
            stride: 1,
            offset: 0,
            mode: "linear",
            clampMode: "range",
            domainMin: 0,
            domainMax: 100,
            clampMin: 0,
            clampMax: 100
        }
    });
    dataMaterial.upload(device, device.queue);
    assert.ok(dataMaterial.dataBuffer, "DataMaterial dataBuffer should exist after upload");
    const dmBufferRef = dataMaterial.dataBuffer;
    const dmUniformBefore = dataMaterial.getUniformData().slice();
    dataMaterial.setScaleTransform({
        componentCount: 1,
        componentIndex: 0,
        stride: 1,
        offset: 0,
        mode: "symlog",
        clampMode: "range",
        domainMin: 0.1,
        domainMax: 100,
        clampMin: 0.1,
        clampMax: 100,
        symlogLinThresh: 0.2,
        gamma: 0.7,
        invert: true
    });
    const dmUniformAfter = dataMaterial.getUniformData().slice();
    assert.strictEqual(dataMaterial.dataBuffer, dmBufferRef, "DataMaterial data buffer should not be rewritten for remap-only changes");
    assert.notDeepStrictEqual(Array.from(dmUniformBefore), Array.from(dmUniformAfter), "DataMaterial uniform data should change after setScaleTransform");

    pointCloud.destroy?.();
    glyphField.destroy?.();
    dataMaterial.destroy?.();
}

// 7) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
