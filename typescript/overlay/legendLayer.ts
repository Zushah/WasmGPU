/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { clamp01, sampleColorStops } from "../utils";
import { Colormap } from "../graphics/colormap";
import { DataMaterial, type Color4 } from "../graphics/material";
import { invertScaleTransformCPU, normalizeScaleTransform, type ScaleTransform } from "../scaling";
import { PointCloud } from "../world/pointcloud";
import { GlyphField } from "../world/glyphfield";
import { NodeLink } from "../world/nodelink";
import { LatticeSpace } from "../world/latticespace";
import { DOMNodePool } from "./pool";
import { resolveScreenAnchorPoint } from "./projection";
import type { LegendLayerDescriptor, OverlayLayer, OverlayLegendExplicitSource, OverlayLegendSource, OverlaySystemLike, OverlayUpdateContext, OverlayVisualChangeEmitter } from "./types";

type LegendResolvedSource = {
    transform: ScaleTransform;
    signature: string;
    sample: (t: number) => Color4;
};

const formatDefault = (value: number): string => {
    if (!Number.isFinite(value)) return "nan";
    const abs = Math.abs(value);
    if (abs >= 1e4 || (abs > 0 && abs < 1e-3)) return value.toExponential(3);
    const rounded = Math.round(value * 1e6) / 1e6;
    return `${rounded}`;
};

const sampleCustomStops = (tIn: number, stopsIn: ReadonlyArray<Color4>): Color4 => {
    return sampleColorStops(tIn, stopsIn);
};

const serializeTransform = (transform: ScaleTransform): string => {
    return [
        transform.mode,
        transform.clampMode,
        transform.valueMode,
        transform.componentCount,
        transform.componentIndex,
        transform.stride,
        transform.offset,
        transform.domainMin,
        transform.domainMax,
        transform.clampMin,
        transform.clampMax,
        transform.percentileLow,
        transform.percentileHigh,
        transform.logBase,
        transform.symlogLinThresh,
        transform.gamma,
        transform.invert ? 1 : 0
    ].join("|");
};

const toEmitterSource = (source: OverlayLegendSource): OverlayLegendSource | NodeLink => {
    if (source instanceof NodeLink) return source;
    const maybe = source as { nodelink?: NodeLink };
    if (maybe.nodelink instanceof NodeLink) return maybe.nodelink;
    return source;
};

const subscribeSource = (source: OverlayLegendSource, callback: () => void): (() => void) | null => {
    const emitter = toEmitterSource(source) as OverlayVisualChangeEmitter;
    if (typeof emitter.onVisualChange !== "function") return null;
    return emitter.onVisualChange(() => callback()) ?? null;
};

const resolveSource = (source: OverlayLegendSource, strictParity: boolean): LegendResolvedSource => {
    if (source instanceof PointCloud) {
        const transform = normalizeScaleTransform(source.scaleTransform);
        if (source.colormap === "custom") {
            const stops = source.colormapStops.slice();
            return {
                transform,
                signature: `pointcloud|custom|${serializeTransform(transform)}|${JSON.stringify(stops)}`,
                sample: (t: number) => sampleCustomStops(t, stops)
            };
        }
        const colormap = source.getColormapForBinding();
        if (strictParity && !colormap.canSampleCPU) throw new Error("LegendLayer: bound point cloud colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
        return {
            transform,
            signature: `pointcloud|cm:${colormap.id}|f:${colormap.filter}|w:${colormap.width}|${serializeTransform(transform)}`,
            sample: (t: number) => colormap.sampleCPU(t)
        };
    }
    if (source instanceof GlyphField) {
        const transform = normalizeScaleTransform(source.scaleTransform);
        if (source.colorMode === "scalar" && source.colormap === "custom") {
            const stops = source.colormapStops.slice();
            return {
                transform,
                signature: `glyphfield|custom|${serializeTransform(transform)}|${JSON.stringify(stops)}`,
                sample: (t: number) => sampleCustomStops(t, stops)
            };
        }
        const colormap = source.getColormapForBinding();
        if (strictParity && !colormap.canSampleCPU) throw new Error("LegendLayer: bound glyph colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
        return {
            transform,
            signature: `glyphfield|cm:${colormap.id}|f:${colormap.filter}|w:${colormap.width}|${serializeTransform(transform)}`,
            sample: (t: number) => colormap.sampleCPU(t)
        };
    }
    if (source instanceof LatticeSpace) {
        const transform = normalizeScaleTransform(source.scaleTransform);
        if (source.colorMode === "scalar" && source.colormap === "custom") {
            const stops = source.colormapStops.slice();
            return {
                transform,
                signature: `latticespace|custom|${serializeTransform(transform)}|${JSON.stringify(stops)}`,
                sample: (t: number) => sampleCustomStops(t, stops)
            };
        }
        const colormap = source.getColormapForBinding();
        if (strictParity && !colormap.canSampleCPU) throw new Error("LegendLayer: bound latticespace colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
        return {
            transform,
            signature: `latticespace|cm:${colormap.id}|f:${colormap.filter}|w:${colormap.width}|${serializeTransform(transform)}`,
            sample: (t: number) => colormap.sampleCPU(t)
        };
    }
    if (source instanceof NodeLink || (source as { nodelink?: NodeLink }).nodelink instanceof NodeLink) {
        const obj = source instanceof NodeLink ? source : (source as { nodelink: NodeLink }).nodelink;
        const component = source instanceof NodeLink ? "node" : ((source as { component?: "node" | "edge" }).component ?? "node");
        const transform = normalizeScaleTransform(component === "edge" ? obj.edgeScaleTransform : obj.nodeScaleTransform);
        const colormap = component === "edge" ? obj.edgeColormap : obj.nodeColormap;
        const stops = component === "edge" ? obj.edgeColormapStops : obj.nodeColormapStops;
        if (typeof colormap === "string" && colormap === "custom") {
            return {
                transform,
                signature: `nodelink|${component}|custom|${serializeTransform(transform)}|${JSON.stringify(stops)}`,
                sample: (t: number) => sampleCustomStops(t, stops)
            };
        }
        const resolved = component === "edge" ? obj.getEdgeColormapForBinding() : obj.getNodeColormapForBinding();
        if (strictParity && !resolved.canSampleCPU) throw new Error("LegendLayer: bound nodelink colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
        return {
            transform,
            signature: `nodelink|${component}|cm:${resolved.id}|f:${resolved.filter}|w:${resolved.width}|${serializeTransform(transform)}`,
            sample: (t: number) => resolved.sampleCPU(t)
        };
    }
    if (source instanceof DataMaterial) {
        const transform = normalizeScaleTransform(source.scaleTransform);
        const colormap = source.getColormapForBinding();
        if (strictParity && !colormap.canSampleCPU) throw new Error("LegendLayer: bound data-material colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
        return {
            transform,
            signature: `datamaterial|cm:${colormap.id}|f:${colormap.filter}|w:${colormap.width}|${serializeTransform(transform)}`,
            sample: (t: number) => colormap.sampleCPU(t)
        };
    }
    const explicit = source as OverlayLegendExplicitSource;
    const transform = normalizeScaleTransform(explicit.scaleTransform);
    if (explicit.colormapStops && explicit.colormapStops.length >= 2) {
        const stops = explicit.colormapStops.slice();
        return {
            transform,
            signature: `explicit|stops|${serializeTransform(transform)}|${JSON.stringify(stops)}`,
            sample: (t: number) => sampleCustomStops(t, stops)
        };
    }
    const colormap = typeof explicit.colormap === "string" ? Colormap.builtin(explicit.colormap) : explicit.colormap;
    if (strictParity && !colormap.canSampleCPU) throw new Error("LegendLayer: explicit colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
    return {
        transform,
        signature: `explicit|cm:${colormap.id}|f:${colormap.filter}|w:${colormap.width}|${serializeTransform(transform)}`,
        sample: (t: number) => colormap.sampleCPU(t)
    };
};

export class LegendLayer implements OverlayLayer {
    readonly id: string;
    private source: OverlayLegendSource;
    private readonly strictParity: boolean;
    private readonly widthPx: number;
    private readonly heightPx: number;
    private readonly tickCount: number;
    private readonly font: string;
    private readonly formatValue: (value: number) => string;
    private readonly title: string;
    private readonly anchor: LegendLayerDescriptor["anchor"];
    private _system: OverlaySystemLike | null = null;
    private unsubscribeSource: (() => void) | null = null;
    private sourceDirty: boolean = true;
    private lastSignature: string | null = null;
    private container: HTMLDivElement | null = null;
    private titleEl: HTMLDivElement | null = null;
    private gradientCanvas: HTMLCanvasElement | null = null;
    private gradientCtx: CanvasRenderingContext2D | null = null;
    private messageEl: HTMLDivElement | null = null;
    private tickMarkPool: DOMNodePool<HTMLDivElement> | null = null;
    private tickLabelPool: DOMNodePool<HTMLDivElement> | null = null;

    constructor(desc: LegendLayerDescriptor) {
        this.id = desc.id ?? "overlay-legend";
        this.source = desc.source;
        this.strictParity = desc.strictParity ?? true;
        this.widthPx = Math.max(8, Math.round(desc.widthPx ?? 26));
        this.heightPx = Math.max(32, Math.round(desc.heightPx ?? 240));
        this.tickCount = Math.max(2, Math.round(desc.tickCount ?? 7));
        this.font = desc.font ?? "11px monospace";
        this.formatValue = desc.formatValue ?? formatDefault;
        this.title = desc.title ?? "Legend";
        this.anchor = desc.anchor ?? { kind: "screen", corner: "top-right", offsetPx: [-16, 16] };
        this.bindSource(this.source);
    }

    setSystem(system: OverlaySystemLike | null): void {
        this._system = system;
    }

    setSource(source: OverlayLegendSource): void {
        this.source = source;
        this.bindSource(source);
        this.sourceDirty = true;
        this._system?.invalidate("scale");
    }

    attach(root: HTMLDivElement): void {
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.pointerEvents = "none";
        container.style.padding = "8px";
        container.style.border = "1px solid rgba(190, 215, 255, 0.35)";
        container.style.background = "rgba(7, 13, 24, 0.78)";
        container.style.borderRadius = "6px";
        container.style.color = "#e3eeff";
        container.style.font = this.font;
        root.appendChild(container);
        this.container = container;
        const titleEl = document.createElement("div");
        titleEl.textContent = this.title;
        titleEl.style.marginBottom = "6px";
        titleEl.style.font = this.font;
        container.appendChild(titleEl);
        this.titleEl = titleEl;
        const gradientWrap = document.createElement("div");
        gradientWrap.style.position = "relative";
        gradientWrap.style.width = `${this.widthPx + 64}px`;
        gradientWrap.style.height = `${this.heightPx}px`;
        container.appendChild(gradientWrap);
        const canvas = document.createElement("canvas");
        canvas.width = this.widthPx;
        canvas.height = this.heightPx;
        canvas.style.position = "absolute";
        canvas.style.left = "0";
        canvas.style.top = "0";
        canvas.style.width = `${this.widthPx}px`;
        canvas.style.height = `${this.heightPx}px`;
        canvas.style.border = "1px solid rgba(180, 210, 255, 0.35)";
        canvas.style.borderRadius = "2px";
        gradientWrap.appendChild(canvas);
        this.gradientCanvas = canvas;
        this.gradientCtx = canvas.getContext("2d");
        const messageEl = document.createElement("div");
        messageEl.style.position = "absolute";
        messageEl.style.left = "0";
        messageEl.style.top = `${this.heightPx + 6}px`;
        messageEl.style.color = "rgba(255, 191, 191, 0.95)";
        messageEl.style.maxWidth = `${this.widthPx + 64}px`;
        gradientWrap.appendChild(messageEl);
        this.messageEl = messageEl;
        this.tickMarkPool = new DOMNodePool(gradientWrap, () => {
            const el = document.createElement("div");
            el.style.position = "absolute";
            return el;
        }, this.tickCount);
        this.tickLabelPool = new DOMNodePool(gradientWrap, () => {
            const el = document.createElement("div");
            el.style.position = "absolute";
            el.style.font = this.font;
            el.style.color = "#e3eeff";
            return el;
        }, this.tickCount);
    }

    detach(): void {
        this.unsubscribeSource?.();
        this.unsubscribeSource = null;
        this.tickMarkPool?.clear(true);
        this.tickLabelPool?.clear(true);
        this.tickMarkPool = null;
        this.tickLabelPool = null;
        this.container?.remove();
        this.container = null;
        this.titleEl = null;
        this.gradientCanvas = null;
        this.gradientCtx = null;
        this.messageEl = null;
    }

    update(ctx: OverlayUpdateContext): void {
        if (!this.container) return;
        this.positionContainer(ctx);
        const reasonChanged = ctx.reasons.has("scale") || ctx.reasons.has("colormap") || ctx.reasons.has("manual") || ctx.reasons.has("viewport") || ctx.reasons.has("layout");
        if (!reasonChanged && !this.sourceDirty) return;
        this.sourceDirty = false;
        this.renderLegend();
    }

    private positionContainer(ctx: OverlayUpdateContext): void {
        if (!this.container) return;
        const [x, y] = resolveScreenAnchorPoint(this.anchor, ctx.width, ctx.height);
        const corner = this.anchor?.corner ?? "top-right";
        const totalHeight = this.heightPx + 32;
        const totalWidth = this.widthPx + 80;
        let left = x;
        let top = y;
        if (this.anchor?.x === undefined && corner.includes("right")) left -= totalWidth;
        if (this.anchor?.y === undefined && corner.includes("bottom")) top -= totalHeight;
        this.container.style.left = `${left}px`;
        this.container.style.top = `${top}px`;
    }

    private bindSource(source: OverlayLegendSource): void {
        this.unsubscribeSource?.();
        this.unsubscribeSource = subscribeSource(source, () => {
            this.sourceDirty = true;
            this._system?.invalidate("scale");
        });
    }

    private renderLegend(): void {
        if (!this.gradientCanvas || !this.gradientCtx || !this.tickMarkPool || !this.tickLabelPool) return;
        try {
            const resolved = resolveSource(this.source, this.strictParity);
            if (resolved.signature !== this.lastSignature) {
                this.lastSignature = resolved.signature;
                this.renderGradient(resolved);
                this.renderTicks(resolved);
            }
            if (this.messageEl) this.messageEl.textContent = "";
        } catch (error) {
            if (this.messageEl) this.messageEl.textContent = `${error instanceof Error ? error.message : String(error)}`;
        }
    }

    private renderGradient(resolved: LegendResolvedSource): void {
        if (!this.gradientCtx || !this.gradientCanvas) return;
        const w = this.gradientCanvas.width;
        const h = this.gradientCanvas.height;
        const image = this.gradientCtx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
            const t = 1 - (y / Math.max(1, h - 1));
            const c = resolved.sample(t);
            const r = Math.max(0, Math.min(255, Math.round(c[0] * 255)));
            const g = Math.max(0, Math.min(255, Math.round(c[1] * 255)));
            const b = Math.max(0, Math.min(255, Math.round(c[2] * 255)));
            const a = Math.max(0, Math.min(255, Math.round(c[3] * 255)));
            for (let x = 0; x < w; x++) {
                const o = ((y * w) + x) * 4;
                image.data[o + 0] = r;
                image.data[o + 1] = g;
                image.data[o + 2] = b;
                image.data[o + 3] = a;
            }
        }
        this.gradientCtx.putImageData(image, 0, 0);
    }

    private renderTicks(resolved: LegendResolvedSource): void {
        if (!this.tickMarkPool || !this.tickLabelPool || !this.gradientCanvas) return;
        this.tickMarkPool.beginFrame();
        this.tickLabelPool.beginFrame();
        const h = this.gradientCanvas.height;
        for (let i = 0; i < this.tickCount; i++) {
            const alpha = i / Math.max(1, this.tickCount - 1);
            const y = alpha * h;
            const t = 1 - alpha;
            const value = invertScaleTransformCPU(clamp01(t), resolved.transform);
            const mark = this.tickMarkPool.acquire();
            mark.style.left = `${this.widthPx + 4}px`;
            mark.style.top = `${y}px`;
            mark.style.width = "8px";
            mark.style.height = "1px";
            mark.style.background = "#dce9ff";
            const label = this.tickLabelPool.acquire();
            label.style.left = `${this.widthPx + 16}px`;
            label.style.top = `${y - 6}px`;
            label.textContent = this.formatValue(value);
        }
        this.tickMarkPool.endFrame();
        this.tickLabelPool.endFrame();
    }
}
