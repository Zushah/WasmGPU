/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const requestTestAdapter = async (gpu, adapterOptions, { attempts = 3, retryDelayMs = 100 } = {}) => {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        const adapter = await gpu.requestAdapter(adapterOptions);
        if (adapter) return adapter;
        if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
    return null;
};

export const requestTestDevice = async ({ adapterOptions, deviceDescriptor = {}, optionalFeatures = [], onUncapturedError } = {}) => {
    const gpu = navigator.gpu;
    if (!gpu) throw new Error("WebGPU is unavailable in the Playwright browser.");
    const adapter = await requestTestAdapter(gpu, adapterOptions);
    if (!adapter) throw new Error("Failed to acquire a WebGPU adapter.");
    const requiredFeatures = [...new Set([...(deviceDescriptor.requiredFeatures ?? []), ...optionalFeatures.filter((feature) => adapter.features.has(feature))])];
    const device = await adapter.requestDevice({ ...deviceDescriptor, requiredFeatures });
    if (!device) throw new Error("Failed to acquire a WebGPU device.");
    device.addEventListener("uncapturederror", onUncapturedError ?? ((event) => { throw new Error(`Uncaptured WebGPU error: ${event.error?.message ?? String(event.error)}`); }));
    return { gpu, adapter, device };
};

export const destroyTestDevice = async (device) => {
    try {
        await device.queue.onSubmittedWorkDone();
    } finally {
        device.destroy();
    }
};
