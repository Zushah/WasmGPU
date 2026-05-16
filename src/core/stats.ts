/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { clamp, nowMs } from "../utils";
import { frameArena, wasm } from "../wasm";

export type PerformanceStatsPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type PerformanceStatsDescriptor = {
    parent?: HTMLElement;
    canvas?: HTMLCanvasElement;
    position?: PerformanceStatsPosition;
    zIndex?: number;
    paddingPx?: number;
    label?: string;
    graph?: boolean;
    graphWidthPx?: number;
    graphHeightPx?: number;
    historyLength?: number;
    targetFps?: number;
    updateIntervalMs?: number;
    decimals?: number;
    showFps?: boolean;
    showFrameTime?: boolean;
    showCpuTime?: boolean;
    showGpuTime?: boolean;
    showMemory?: boolean;
    showCulling?: boolean;
    pointerEvents?: "none" | "auto";
};

export type PerformanceStatsSources = {
    getGpuTimeNs?: () => number | null;
    getCullingStats?: () => {
        frustum: { tested: number; visible: number };
        occlusion: { tested: number; visible: number; occluded: number };
    } | null;
};

class RollingAverage {
    private values: Float64Array;
    private cursor: number = 0;
    private count: number = 0;
    private total: number = 0;

    constructor(private capacity: number) {
        this.values = new Float64Array(Math.max(1, capacity | 0));
    }

    addSample(v: number): void {
        if (!Number.isFinite(v) || v < 0) return;
        const i = this.cursor;
        this.total -= this.values[i];
        this.values[i] = v;
        this.total += v;
        this.cursor = (i + 1) % this.values.length;
        if (this.count < this.values.length) this.count++;
    }

    get(): number {
        return this.count > 0 ? (this.total / this.count) : 0;
    }
}

const formatNumber = (x: number, decimals: number): string => {
    if (!Number.isFinite(x)) return "n/a";
    const d = Math.max(0, decimals | 0);
    return x.toFixed(d);
};

const formatBytes = (bytes: number, decimals: number): string => {
    if (!Number.isFinite(bytes)) return "n/a";
    const abs = Math.abs(bytes);
    if (abs < 1024) return `${formatNumber(bytes, 0)} B`;
    if (abs < 1024 * 1024) return `${formatNumber(bytes / 1024, decimals)} KiB`;
    return `${formatNumber(bytes / (1024 * 1024), decimals)} MiB`;
};

export class PerformanceStats {
    readonly element: HTMLDivElement;
    private readonly textEl: HTMLPreElement;
    private readonly graphCanvas: HTMLCanvasElement | null;
    private readonly graphCtx: CanvasRenderingContext2D | null;
    private readonly sources: PerformanceStatsSources;
    private readonly fpsAvg: RollingAverage;
    private readonly frameMsAvg: RollingAverage;
    private readonly cpuMsAvg: RollingAverage;
    private readonly gpuMsAvg: RollingAverage;
    private readonly history: Float32Array;
    private historyCursor: number = 0;
    private readonly targetFps: number;
    private readonly updateIntervalMs: number;
    private readonly decimals: number;
    private lastTextUpdateMs: number = 0;
    private lastDtSeconds: number = 0;
    private readonly show: Required<Pick<PerformanceStatsDescriptor, "showFps" | "showFrameTime" | "showCpuTime" | "showGpuTime" | "showMemory" | "showCulling" | "graph">>;
    private readonly label: string | null;

    constructor(sources: PerformanceStatsSources = {}, desc: PerformanceStatsDescriptor = {}) {
        if (typeof document === "undefined") throw new Error("PerformanceStats requires a DOM environment (document is undefined).");
        this.sources = sources;
        this.targetFps = Math.max(1, desc.targetFps ?? 60);
        this.updateIntervalMs = Math.max(0, desc.updateIntervalMs ?? 250);
        this.decimals = Math.max(0, desc.decimals ?? 1);
        const historyLength = Math.max(4, desc.historyLength ?? 60) | 0;
        this.history = new Float32Array(historyLength);
        const avgWindow = Math.max(1, Math.min(240, historyLength));
        this.fpsAvg = new RollingAverage(avgWindow);
        this.frameMsAvg = new RollingAverage(avgWindow);
        this.cpuMsAvg = new RollingAverage(avgWindow);
        this.gpuMsAvg = new RollingAverage(avgWindow);
        this.show = {
            showFps: desc.showFps ?? true,
            showFrameTime: desc.showFrameTime ?? true,
            showCpuTime: desc.showCpuTime ?? true,
            showGpuTime: desc.showGpuTime ?? true,
            showMemory: desc.showMemory ?? true,
            showCulling: desc.showCulling ?? false,
            graph: desc.graph ?? true,
        };
        this.label = desc.label ?? null;
        const canvas = desc.canvas ?? null;
        const parent = desc.parent ?? canvas?.parentElement ?? document.body;
        const position = desc.position ?? "top-left";
        const paddingPx = Math.max(0, desc.paddingPx ?? 8);
        const zIndex = (desc.zIndex ?? 9999) | 0;
        const pointerEvents = desc.pointerEvents ?? "none";
        const el = document.createElement("div");
        this.element = el;
        el.style.position = (parent === document.body || parent === document.documentElement) ? "fixed" : "absolute";
        el.style.zIndex = String(zIndex);
        el.style.pointerEvents = pointerEvents;
        el.style.padding = `${paddingPx}px`;
        el.style.background = "rgba(0, 0, 0, 0.75)";
        el.style.color = "#ffffff";
        el.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        el.style.fontSize = "12px";
        el.style.lineHeight = "1.2";
        el.style.whiteSpace = "pre";
        el.style.userSelect = "none";
        if (el.style.position === "absolute") {
            const cs = getComputedStyle(parent);
            if (cs.position === "static") parent.style.position = "relative";
        }
        if (position.includes("top")) el.style.top = "0";
        if (position.includes("bottom")) el.style.bottom = "0";
        if (position.includes("left")) el.style.left = "0";
        if (position.includes("right")) el.style.right = "0";
        const textEl = document.createElement("pre");
        this.textEl = textEl;
        textEl.style.margin = "0";
        textEl.style.padding = "0";
        textEl.style.whiteSpace = "pre";
        el.appendChild(textEl);
        if (this.show.graph) {
            const gw = Math.max(32, desc.graphWidthPx ?? 120) | 0;
            const gh = Math.max(16, desc.graphHeightPx ?? 40) | 0;
            const gc = document.createElement("canvas");
            gc.style.display = "block";
            gc.style.marginTop = "6px";
            gc.style.width = `${gw}px`;
            gc.style.height = `${gh}px`;
            const dpr = Math.max(1, (globalThis as any).devicePixelRatio || 1);
            gc.width = Math.max(1, Math.floor(gw * dpr));
            gc.height = Math.max(1, Math.floor(gh * dpr));
            const ctx = gc.getContext("2d");
            if (ctx) ctx.scale(dpr, dpr);
            this.graphCanvas = gc;
            this.graphCtx = ctx;
            el.appendChild(gc);
        } else {
            this.graphCanvas = null;
            this.graphCtx = null;
        }
        parent.appendChild(el);
        this.refreshText();
    }

    update(dtSeconds: number, cpuFrameMs: number = 0): void {
        this.lastDtSeconds = dtSeconds;
        const frameMs = dtSeconds * 1000;
        const fps = dtSeconds > 0 ? (1 / dtSeconds) : 0;
        this.fpsAvg.addSample(fps);
        this.frameMsAvg.addSample(frameMs);
        this.cpuMsAvg.addSample(cpuFrameMs);
        const gpuNs = this.sources.getGpuTimeNs?.() ?? null;
        if (gpuNs !== null && Number.isFinite(gpuNs)) this.gpuMsAvg.addSample(gpuNs / 1e6);
        this.history[this.historyCursor] = fps;
        this.historyCursor = (this.historyCursor + 1) % this.history.length;
        this.drawGraph();
        const time = nowMs();
        if (this.updateIntervalMs === 0 || (time - this.lastTextUpdateMs) >= this.updateIntervalMs) {
            this.lastTextUpdateMs = time;
            this.refreshText();
        }
    }

    destroy(): void {
        this.element.remove();
    }

    private drawGraph(): void {
        if (!this.graphCanvas || !this.graphCtx) return;
        const ctx = this.graphCtx;
        const w = parseFloat(this.graphCanvas.style.width) || 120;
        const h = parseFloat(this.graphCanvas.style.height) || 40;
        ctx.clearRect(0, 0, w, h);
        const n = this.history.length;
        const barW = w / n;
        const scale = h / this.targetFps;
        for (let i = 0; i < n; i++) {
            const idx = (this.historyCursor + i) % n;
            const fps = this.history[idx];
            const barH = clamp(fps * scale, 0, h);
            const x = i * barW;
            const y = h - barH;
            ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
            ctx.fillRect(x, y, Math.max(1, barW - 0.5), barH);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    }

    private refreshText(): void {
        const d = this.decimals;
        const lines: string[] = [];
        if (this.label) lines.push(this.label);
        const fpsAvg = this.fpsAvg.get();
        const frameMsAvg = this.frameMsAvg.get();
        const hz = frameMsAvg > 0 ? (1000 / frameMsAvg) : 0;
        const cpuMsAvg = this.cpuMsAvg.get();
        if (this.show.showFps) lines.push(`FPS: ${formatNumber(fpsAvg, 1)}`);
        if (this.show.showFrameTime) lines.push(`Frame: ${formatNumber(frameMsAvg, d)} ms (≈${formatNumber(hz, 0)} Hz)`);
        if (this.show.showCpuTime) {
            const denom = Math.max(0.0001, this.lastDtSeconds) * 1000;
            const load = clamp((cpuMsAvg / denom) * 100, 0, 1000);
            lines.push(`CPU: ${formatNumber(cpuMsAvg, d)} ms (${formatNumber(load, 0)}%)`);
        }
        if (this.show.showGpuTime) {
            const gpuNs = this.sources.getGpuTimeNs?.() ?? null;
            if (gpuNs === null || !Number.isFinite(gpuNs)) {
                lines.push("GPU: n/a");
            } else {
                const gpuAvg = this.gpuMsAvg.get();
                const denom = Math.max(0.0001, this.lastDtSeconds) * 1000;
                const load = clamp((gpuAvg / denom) * 100, 0, 1000);
                lines.push(`GPU: ${formatNumber(gpuAvg, d)} ms (${formatNumber(load, 0)}%)`);
            }
        }
        if (this.show.showMemory) {
            try {
                const used = frameArena.usedBytes();
                const cap = frameArena.capBytes();
                lines.push(`Frame arena: ${formatBytes(used, d)} / ${formatBytes(cap, d)}`);
            } catch { /* ignore */ }
            try {
                const memBytes = wasm.memory().buffer.byteLength;
                lines.push(`WASM memory: ${formatBytes(memBytes, d)}`);
            } catch { /* ignore */ }
            const pm = (typeof performance !== "undefined") ? (performance as any).memory : null;
            if (pm && typeof pm.usedJSHeapSize === "number") {
                const used = pm.usedJSHeapSize as number;
                const total = (typeof pm.totalJSHeapSize === "number") ? (pm.totalJSHeapSize as number) : NaN;
                if (Number.isFinite(total)) lines.push(`JS heap: ${formatBytes(used, d)} / ${formatBytes(total, d)}`);
                else lines.push(`JS heap: ${formatBytes(used, d)}`);
            }
        }
        if (this.show.showCulling) {
            const stats = this.sources.getCullingStats?.() ?? null;
            if (stats) {
                lines.push(`Frustum: visible ${stats.frustum.visible} / tested ${stats.frustum.tested}`);
                lines.push(`Occlusion: visible ${stats.occlusion.visible} / tested ${stats.occlusion.tested} / occluded ${stats.occlusion.occluded}`);
            }
        }
        this.textEl.textContent = lines.join("\n");
    }
}
