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
import type { LegendLayerDescriptor, LegendOrientation, LegendStyle, OverlayCSSStyle, OverlayLayer, OverlayLegendExplicitSource, OverlayLegendSource, OverlaySystemLike, OverlayUpdateContext, OverlayVisualChangeEmitter, ScreenAnchorDescriptor } from "./types";

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

const applyStyle = (node: HTMLElement | null, style: OverlayCSSStyle | undefined): void => { if (node && style) Object.assign(node.style, style); };

const clearStyle = (node: HTMLElement | null, style: OverlayCSSStyle | undefined): void => { if (node && style) for (const property of Object.keys(style)) (node.style as any)[property] = ""; };

const styleEquals = (a: LegendStyle, b: LegendStyle): boolean => JSON.stringify(a) === JSON.stringify(b);

const sampleCustomStops = (tIn: number, stopsIn: ReadonlyArray<Color4>): Color4 => sampleColorStops(tIn, stopsIn);

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
            return { transform, signature: `pointcloud|custom|${serializeTransform(transform)}|${JSON.stringify(stops)}`, sample: (t: number) => sampleCustomStops(t, stops) };
        }
        const colormap = source.getColormapForBinding();
        if (strictParity && !colormap.canSampleCPU) throw new Error("LegendLayer: bound point cloud colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
        return { transform, signature: `pointcloud|cm:${colormap.id}|f:${colormap.filter}|w:${colormap.width}|${serializeTransform(transform)}`, sample: (t: number) => colormap.sampleCPU(t) };
    }
    if (source instanceof GlyphField) {
        const transform = normalizeScaleTransform(source.scaleTransform);
        if (source.colorMode === "scalar" && source.colormap === "custom") {
            const stops = source.colormapStops.slice();
            return { transform, signature: `glyphfield|custom|${serializeTransform(transform)}|${JSON.stringify(stops)}`, sample: (t: number) => sampleCustomStops(t, stops) };
        }
        const colormap = source.getColormapForBinding();
        if (strictParity && !colormap.canSampleCPU) throw new Error("LegendLayer: bound glyph colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
        return { transform, signature: `glyphfield|cm:${colormap.id}|f:${colormap.filter}|w:${colormap.width}|${serializeTransform(transform)}`, sample: (t: number) => colormap.sampleCPU(t) };
    }
    if (source instanceof LatticeSpace) {
        const transform = normalizeScaleTransform(source.scaleTransform);
        if (source.colorMode === "scalar" && source.colormap === "custom") {
            const stops = source.colormapStops.slice();
            return { transform, signature: `latticespace|custom|${serializeTransform(transform)}|${JSON.stringify(stops)}`, sample: (t: number) => sampleCustomStops(t, stops) };
        }
        const colormap = source.getColormapForBinding();
        if (strictParity && !colormap.canSampleCPU) throw new Error("LegendLayer: bound latticespace colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
        return { transform, signature: `latticespace|cm:${colormap.id}|f:${colormap.filter}|w:${colormap.width}|${serializeTransform(transform)}`, sample: (t: number) => colormap.sampleCPU(t) };
    }
    if (source instanceof NodeLink || (source as { nodelink?: NodeLink }).nodelink instanceof NodeLink) {
        const obj = source instanceof NodeLink ? source : (source as { nodelink: NodeLink }).nodelink;
        const component = source instanceof NodeLink ? "node" : ((source as { component?: "node" | "edge" }).component ?? "node");
        const transform = normalizeScaleTransform(component === "edge" ? obj.edgeScaleTransform : obj.nodeScaleTransform);
        const colormap = component === "edge" ? obj.edgeColormap : obj.nodeColormap;
        const stops = component === "edge" ? obj.edgeColormapStops : obj.nodeColormapStops;
        if (typeof colormap === "string" && colormap === "custom") return { transform, signature: `nodelink|${component}|custom|${serializeTransform(transform)}|${JSON.stringify(stops)}`, sample: (t: number) => sampleCustomStops(t, stops) };
        const resolved = component === "edge" ? obj.getEdgeColormapForBinding() : obj.getNodeColormapForBinding();
        if (strictParity && !resolved.canSampleCPU) throw new Error("LegendLayer: bound nodelink colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
        return { transform, signature: `nodelink|${component}|cm:${resolved.id}|f:${resolved.filter}|w:${resolved.width}|${serializeTransform(transform)}`, sample: (t: number) => resolved.sampleCPU(t) };
    }
    if (source instanceof DataMaterial) {
        const transform = normalizeScaleTransform(source.scaleTransform);
        const colormap = source.getColormapForBinding();
        if (strictParity && !colormap.canSampleCPU) throw new Error("LegendLayer: bound data-material colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
        return { transform, signature: `datamaterial|cm:${colormap.id}|f:${colormap.filter}|w:${colormap.width}|${serializeTransform(transform)}`, sample: (t: number) => colormap.sampleCPU(t) };
    }
    const explicit = source as OverlayLegendExplicitSource;
    const transform = normalizeScaleTransform(explicit.scaleTransform);
    if (explicit.colormapStops && explicit.colormapStops.length >= 2) {
        const stops = explicit.colormapStops.slice();
        return { transform, signature: `explicit|stops|${serializeTransform(transform)}|${JSON.stringify(stops)}`, sample: (t: number) => sampleCustomStops(t, stops) };
    }
    const colormap = typeof explicit.colormap === "string" ? Colormap.builtin(explicit.colormap) : explicit.colormap;
    if (strictParity && !colormap.canSampleCPU) throw new Error("LegendLayer: explicit colormap is GPU-only and cannot be sampled on CPU in strict parity mode.");
    return { transform, signature: `explicit|cm:${colormap.id}|f:${colormap.filter}|w:${colormap.width}|${serializeTransform(transform)}`, sample: (t: number) => colormap.sampleCPU(t) };
};

export class LegendLayer implements OverlayLayer {
    readonly id: string;
    private source: OverlayLegendSource;
    private readonly strictParity: boolean;
    private widthPx: number;
    private heightPx: number;
    private tickCount: number;
    private font: string;
    private formatValue: (value: number) => string;
    private title: string;
    private subtitle: string;
    private units: string;
    private orientation: LegendOrientation;
    private anchor: ScreenAnchorDescriptor;
    private className: string;
    private style: LegendStyle;
    private _system: OverlaySystemLike | null = null;
    private unsubscribeSource: (() => void) | null = null;
    private sourceDirty: boolean = true;
    private lastSignature: string | null = null;
    private container: HTMLDivElement | null = null;
    private titleEl: HTMLDivElement | null = null;
    private subtitleEl: HTMLDivElement | null = null;
    private unitsEl: HTMLDivElement | null = null;
    private gradientWrap: HTMLDivElement | null = null;
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
        this.heightPx = Math.max(8, Math.round(desc.heightPx ?? 240));
        this.tickCount = Math.max(2, Math.round(desc.tickCount ?? 7));
        this.font = desc.font ?? "11px monospace";
        this.formatValue = desc.formatValue ?? formatDefault;
        this.title = desc.title ?? "Legend";
        this.anchor = desc.anchor ?? { kind: "screen", corner: "top-right", offsetPx: [-16, 16] };
        this.subtitle = desc.subtitle ?? "";
        this.units = desc.units ?? "";
        this.orientation = desc.orientation ?? "vertical";
        this.className = desc.className ?? "";
        this.style = desc.style ?? {};
    }

    setSystem(system: OverlaySystemLike | null): void {
        this._system = system;
    }

    setSource(source: OverlayLegendSource): void {
        if (source === this.source) return;
        this.source = source;
        if (this.container) this.bindSource(source);
        this.sourceDirty = true;
        this._system?.invalidate("scale");
    }

    setOrientation(orientation: LegendOrientation): this {
        if (orientation === this.orientation) return this;
        this.orientation = orientation;
        this.presentationChanged();
        return this;
    }
    
    setTitle(title: string): this {
        if (title === this.title) return this;
        this.title = title;
        if (this.titleEl) this.titleEl.textContent = title;
        return this.presentationChanged();
    }
    
    setSubtitle(subtitle: string): this {
        if (subtitle === this.subtitle) return this;
        this.subtitle = subtitle;
        if (this.subtitleEl) { this.subtitleEl.textContent = subtitle; this.subtitleEl.style.display = subtitle ? "" : "none"; }
        return this.presentationChanged();
    }
    
    setUnits(units: string): this {
        if (units === this.units) return this;
        this.units = units;
        if (this.unitsEl) { this.unitsEl.textContent = units; this.unitsEl.style.display = units ? "" : "none"; }
        return this.presentationChanged();
    }
    
    setAnchor(anchor: ScreenAnchorDescriptor): this {
        if (JSON.stringify(anchor) === JSON.stringify(this.anchor)) return this;
        this.anchor = anchor;
        return this.presentationChanged();
    }
    
    setGradientSize(widthPx: number, heightPx: number): this {
        const width = Math.max(8, Math.round(widthPx));
        const height = Math.max(8, Math.round(heightPx));
        if (width === this.widthPx && height === this.heightPx) return this;
        this.widthPx = width;
        this.heightPx = height;
        return this.presentationChanged();
    }
    
    setTickPresentation(tickCount: number, formatValue: (value: number) => string = this.formatValue, font: string = this.font): this {
        const count = Math.max(2, Math.round(tickCount));
        if (count === this.tickCount && formatValue === this.formatValue && font === this.font) return this;
        this.tickCount = count;
        this.formatValue = formatValue;
        this.font = font;
        this.rebuildTickPools();
        return this.presentationChanged();
    }
    
    setClassName(className: string): this {
        if (className === this.className) return this;
        this.className = className;
        if (this.container) this.container.className = `wasmgpu-overlay-legend${className ? ` ${className}` : ""}`;
        return this.presentationChanged();
    }
    
    setStyle(style: LegendStyle): this {
        if (styleEquals(style, this.style)) return this;
        const previous = this.style;
        this.style = style;
        this.applyCurrentStyles(previous);
        return this.presentationChanged();
    }

    private presentationChanged(): this {
        this.lastSignature = null;
        this.sourceDirty = true;
        this.layoutElements();
        this._system?.invalidate("layout");
        return this;
    }

    attach(root: HTMLDivElement): void {
        if (this.container) this.detach();
        const container = document.createElement("div");
        container.className = `wasmgpu-overlay-legend${this.className ? ` ${this.className}` : ""}`;
        container.style.position = "absolute";
        container.style.pointerEvents = "none";
        container.style.padding = "8px";
        container.style.border = "1px solid rgba(190, 215, 255, 0.35)";
        container.style.background = "rgba(7, 13, 24, 0.78)";
        container.style.borderRadius = "6px";
        container.style.color = "#e3eeff";
        container.style.font = this.font;
        applyStyle(container, this.style.container);
        container.style.position = "absolute";
        container.style.pointerEvents = "none";
        root.appendChild(container);
        this.container = container;
        const titleEl = document.createElement("div");
        titleEl.className = "wasmgpu-overlay-legend-title";
        titleEl.textContent = this.title;
        titleEl.style.marginBottom = "6px";
        titleEl.style.font = this.font;
        applyStyle(titleEl, this.style.title);
        container.appendChild(titleEl);
        this.titleEl = titleEl;
        const subtitleEl = document.createElement("div");
        subtitleEl.className = "wasmgpu-overlay-legend-subtitle";
        subtitleEl.textContent = this.subtitle;
        subtitleEl.style.marginBottom = "6px";
        subtitleEl.style.opacity = "0.82";
        subtitleEl.style.display = this.subtitle ? "" : "none";
        applyStyle(subtitleEl, this.style.subtitle);
        container.appendChild(subtitleEl);
        this.subtitleEl = subtitleEl;
        const gradientWrap = document.createElement("div");
        gradientWrap.className = "wasmgpu-overlay-legend-gradient-wrap";
        gradientWrap.style.position = "relative";
        gradientWrap.style.width = `${this.widthPx + 64}px`;
        gradientWrap.style.height = `${this.heightPx}px`;
        container.appendChild(gradientWrap);
        this.gradientWrap = gradientWrap;
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
        canvas.className = "wasmgpu-overlay-legend-gradient";
        applyStyle(canvas, this.style.gradient);
        gradientWrap.appendChild(canvas);
        this.gradientCanvas = canvas;
        this.gradientCtx = canvas.getContext("2d", { willReadFrequently: true });
        const messageEl = document.createElement("div");
        messageEl.style.position = "absolute";
        messageEl.style.left = "0";
        messageEl.style.top = `${this.heightPx + 6}px`;
        messageEl.style.color = "rgba(255, 191, 191, 0.95)";
        messageEl.style.maxWidth = `${this.widthPx + 64}px`;
        gradientWrap.appendChild(messageEl);
        this.messageEl = messageEl;
        const unitsEl = document.createElement("div");
        unitsEl.className = "wasmgpu-overlay-legend-units";
        unitsEl.textContent = this.units;
        unitsEl.style.marginTop = "6px";
        unitsEl.style.opacity = "0.88";
        unitsEl.style.display = this.units ? "" : "none";
        applyStyle(unitsEl, this.style.units);
        container.appendChild(unitsEl);
        this.unitsEl = unitsEl;
        this.tickMarkPool = new DOMNodePool(gradientWrap, () => {
            const el = document.createElement("div");
            el.style.position = "absolute";
            el.className = "wasmgpu-overlay-legend-tick-mark";
            return el;
        }, this.tickCount);
        this.tickLabelPool = new DOMNodePool(gradientWrap, () => {
            const el = document.createElement("div");
            el.style.position = "absolute";
            el.style.font = this.font;
            el.style.color = "#e3eeff";
            el.className = "wasmgpu-overlay-legend-tick-label";
            return el;
        }, this.tickCount);
        this.bindSource(this.source);
        this.sourceDirty = true;
        this.layoutElements();
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
        this.subtitleEl = null;
        this.unitsEl = null;
        this.gradientWrap = null;
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
        this.renderLegend(ctx.dpr);
    }

    private positionContainer(ctx: OverlayUpdateContext): void {
        if (!this.container) return;
        const [x, y] = resolveScreenAnchorPoint(this.anchor, ctx.width, ctx.height);
        const corner = this.anchor?.corner ?? "top-right";
        const translateX = this.anchor.x === undefined && corner.includes("right") ? "-100%" : "0";
        const translateY = this.anchor.y === undefined && corner.includes("bottom") ? "-100%" : "0";
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;
        this.container.style.transform = `translate(${translateX}, ${translateY})`;
    }

    private bindSource(source: OverlayLegendSource): void {
        this.unsubscribeSource?.();
        this.unsubscribeSource = subscribeSource(source, () => { this.sourceDirty = true; this._system?.invalidate("scale"); });
    }

    private renderLegend(dpr: number): void {
        if (!this.gradientCanvas || !this.gradientCtx || !this.tickMarkPool || !this.tickLabelPool) return;
        try {
            const resolved = resolveSource(this.source, this.strictParity);
            const signature = `${resolved.signature}|${this.orientation}|${this.widthPx}x${this.heightPx}|dpr:${dpr}|ticks:${this.tickCount}`;
            if (signature !== this.lastSignature) {
                this.lastSignature = signature;
                this.layoutElements(dpr);
                this.renderGradient(resolved);
                this.renderTicks(resolved);
            }
            if (this.messageEl) this.messageEl.textContent = "";
        } catch (error) { if (this.messageEl) this.messageEl.textContent = `${error instanceof Error ? error.message : String(error)}`; }
    }

    private renderGradient(resolved: LegendResolvedSource): void {
        if (!this.gradientCtx || !this.gradientCanvas) return;
        const w = this.gradientCanvas.width;
        const h = this.gradientCanvas.height;
        const image = this.gradientCtx.createImageData(w, h);
        const writeColor = (x: number, y: number, c: Color4): void => {
            const r = Math.max(0, Math.min(255, Math.round(c[0] * 255)));
            const g = Math.max(0, Math.min(255, Math.round(c[1] * 255)));
            const b = Math.max(0, Math.min(255, Math.round(c[2] * 255)));
            const a = Math.max(0, Math.min(255, Math.round(c[3] * 255)));
            const o = ((y * w) + x) * 4;
            image.data[o + 0] = r;
            image.data[o + 1] = g;
            image.data[o + 2] = b;
            image.data[o + 3] = a;
        };
        if (this.orientation === "vertical") {
            for (let y = 0; y < h; y++) {
                const c = resolved.sample(1 - (y / Math.max(1, h - 1)));
                for (let x = 0; x < w; x++) writeColor(x, y, c);
            }
        } else {
            for (let x = 0; x < w; x++) {
                const c = resolved.sample(x / Math.max(1, w - 1));
                for (let y = 0; y < h; y++) writeColor(x, y, c);
            }
        }
        this.gradientCtx.putImageData(image, 0, 0);
    }

    private renderTicks(resolved: LegendResolvedSource): void {
        if (!this.tickMarkPool || !this.tickLabelPool || !this.gradientCanvas) return;
        this.tickMarkPool.beginFrame();
        this.tickLabelPool.beginFrame();
        const vertical = this.orientation === "vertical";
        const tickData = Array.from({ length: this.tickCount }, (_, i) => {
            const alpha = i / Math.max(1, this.tickCount - 1);
            const t = vertical ? 1 - alpha : alpha;
            const value = invertScaleTransformCPU(clamp01(t), resolved.transform);
            return { alpha, text: this.formatValue(value) };
        });
        const visibleLabels = new Set<number>();
        if (vertical) for (let i = 0; i < tickData.length; i++) visibleLabels.add(i);
        else {
            const fontPx = Number.parseFloat(this.style.tickLabel?.fontSize ?? this.style.tickLabel?.font ?? this.font) || 11;
            const letterSpacing = Number.parseFloat(this.style.tickLabel?.letterSpacing ?? "0") || 0;
            const widths = tickData.map(({ text }) => Math.max(fontPx, text.length * fontPx * 0.62 + Math.max(0, text.length - 1) * letterSpacing));
            visibleLabels.add(0);
            let lastRight = widths[0];
            const finalLeft = this.widthPx - widths[widths.length - 1];
            const keepFinal = lastRight + 4 <= finalLeft;
            for (let i = 1; i < tickData.length - 1; i++) {
                const center = tickData[i].alpha * this.widthPx;
                const left = center - widths[i] * 0.5;
                const right = center + widths[i] * 0.5;
                if (left >= lastRight + 4 && (!keepFinal || right <= finalLeft - 4)) { visibleLabels.add(i); lastRight = right; }
            }
            if (keepFinal) visibleLabels.add(tickData.length - 1);
        }
        for (let i = 0; i < this.tickCount; i++) {
            const { alpha, text } = tickData[i];
            const x = alpha * this.widthPx;
            const y = alpha * this.heightPx;
            const mark = this.tickMarkPool.acquire();
            mark.style.background = "#dce9ff";
            applyStyle(mark, this.style.tickMark);
            mark.style.position = "absolute";
            mark.style.left = `${vertical ? this.widthPx + 4 : x}px`;
            mark.style.top = `${vertical ? y : this.heightPx + 4}px`;
            mark.style.width = vertical ? "8px" : "1px";
            mark.style.height = vertical ? "1px" : "8px";
            if (!visibleLabels.has(i)) continue;
            const label = this.tickLabelPool.acquire();
            label.style.font = this.font;
            applyStyle(label, this.style.tickLabel);
            label.style.position = "absolute";
            label.style.left = `${vertical ? this.widthPx + 16 : x}px`;
            label.style.top = `${vertical ? y - 6 : this.heightPx + 16}px`;
            label.style.transform = vertical ? "" : i === 0 ? "" : i === this.tickCount - 1 ? "translateX(-100%)" : "translateX(-50%)";
            label.textContent = text;
        }
        this.tickMarkPool.endFrame();
        this.tickLabelPool.endFrame();
    }

    private layoutElements(dpr: number = 1): void {
        if (!this.gradientCanvas || !this.gradientWrap) return;
        const scale = Math.max(1, dpr);
        this.gradientCanvas.width = Math.max(1, Math.round(this.widthPx * scale));
        this.gradientCanvas.height = Math.max(1, Math.round(this.heightPx * scale));
        this.gradientCanvas.style.width = `${this.widthPx}px`; this.gradientCanvas.style.height = `${this.heightPx}px`;
        this.gradientWrap.style.width = `${this.orientation === "vertical" ? this.widthPx + 76 : this.widthPx}px`;
        this.gradientWrap.style.height = `${this.orientation === "vertical" ? this.heightPx : this.heightPx + 36}px`;
        if (this.messageEl) {
            this.messageEl.style.top = `${this.heightPx + 34}px`;
            this.messageEl.style.maxWidth = `${Math.max(this.widthPx, 100)}px`;
        }
    }

    private rebuildTickPools(): void {
        if (!this.gradientWrap) return;
        this.tickMarkPool?.clear(true); this.tickLabelPool?.clear(true);
        this.tickMarkPool = new DOMNodePool(this.gradientWrap, () => {
            const el = document.createElement("div");
            el.className = "wasmgpu-overlay-legend-tick-mark";
            el.style.position = "absolute"; return el;
        }, this.tickCount);
        this.tickLabelPool = new DOMNodePool(this.gradientWrap, () => {
            const el = document.createElement("div");
            el.className = "wasmgpu-overlay-legend-tick-label";
            el.style.position = "absolute";
            el.style.font = this.font;
            el.style.color = "#e3eeff";
            return el;
        }, this.tickCount);
    }

    private applyCurrentStyles(previous: LegendStyle): void {
        clearStyle(this.container, previous.container);
        if (this.container) {
            this.container.style.padding = "8px";
            this.container.style.border = "1px solid rgba(190, 215, 255, 0.35)";
            this.container.style.background = "rgba(7, 13, 24, 0.78)";
            this.container.style.borderRadius = "6px";
            this.container.style.color = "#e3eeff";
            this.container.style.font = this.font;
        }
        applyStyle(this.container, this.style.container);
        if (this.container) { this.container.style.position = "absolute"; this.container.style.pointerEvents = "none"; }
        clearStyle(this.titleEl, previous.title);
        if (this.titleEl) { this.titleEl.style.marginBottom = "6px"; this.titleEl.style.font = this.font; }
        applyStyle(this.titleEl, this.style.title);
        clearStyle(this.subtitleEl, previous.subtitle);
        if (this.subtitleEl) { this.subtitleEl.style.marginBottom = "6px"; this.subtitleEl.style.opacity = "0.82"; }
        applyStyle(this.subtitleEl, this.style.subtitle);
        clearStyle(this.gradientCanvas, previous.gradient);
        if (this.gradientCanvas) { this.gradientCanvas.style.border = "1px solid rgba(180, 210, 255, 0.35)"; this.gradientCanvas.style.borderRadius = "2px"; }
        applyStyle(this.gradientCanvas, this.style.gradient);
        clearStyle(this.unitsEl, previous.units);
        if (this.unitsEl) { this.unitsEl.style.marginTop = "6px"; this.unitsEl.style.opacity = "0.88"; }
        applyStyle(this.unitsEl, this.style.units);
        if (this.container) {
            for (const node of this.container.querySelectorAll<HTMLElement>(".wasmgpu-overlay-legend-tick-mark")) { clearStyle(node, previous.tickMark); applyStyle(node, this.style.tickMark); }
            for (const node of this.container.querySelectorAll<HTMLElement>(".wasmgpu-overlay-legend-tick-label")) { clearStyle(node, previous.tickLabel); applyStyle(node, this.style.tickLabel); }
        }
    }
}
