/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { RendererContext } from "./context";

export const createGpuTimingResources = (ctx: RendererContext): void => {
    if (!ctx.gpuTimingSupported) return;
    if (ctx.gpuQuerySet) return;
    try {
        ctx.gpuQuerySet = ctx.device.createQuerySet({ type: "timestamp", count: 2 });
        ctx.gpuResolveBuffer = ctx.device.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
        ctx.gpuResultBuffer = ctx.device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    } catch (e) {
        ctx.gpuQuerySet = null;
        ctx.gpuResolveBuffer?.destroy();
        ctx.gpuResolveBuffer = null;
        ctx.gpuResultBuffer?.destroy();
        ctx.gpuResultBuffer = null;
        ctx.gpuTimingSupported = false;
        ctx.gpuTimingEnabled = false;
        console.warn("Renderer: failed to initialize GPU timing resources:", e);
    }
};

export const tryReadGpuTiming = (ctx: RendererContext): void => {
    if (!ctx.gpuResultPending) return;
    const buf = ctx.gpuResultBuffer;
    if (!buf) return;
    if (buf.mapState !== "unmapped") return;
    ctx.gpuResultPending = false;
    buf.mapAsync(GPUMapMode.READ).then(() => {
        try {
            const mapped = buf.getMappedRange();
            const times = new BigUint64Array(mapped);
            const begin = times[0];
            const end = times[1];
            const delta = end - begin;
            const ns = delta > 0n ? Number(delta) : 0;
            ctx._gpuTimeNs = Number.isFinite(ns) ? ns : 0;
        } catch { /* ignore */ } finally { try { buf.unmap(); } catch { /* ignore */ } }
    }).catch(() => { try { buf.unmap(); } catch { /* ignore */ } });
};
