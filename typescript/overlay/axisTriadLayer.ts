/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { projectWorldToScreen, resolveScreenAnchorPoint } from "./projection";
import type { AxisTriadDirections, AxisTriadLayerDescriptor, AxisTriadStyle, OverlayAnchorDescriptor, OverlayCSSStyle, OverlayLayer, OverlaySystemLike, OverlayUpdateContext, WorldAnchorDescriptor } from "./types";

const AXES: ReadonlyArray<[number, number, number]> = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

const AXIS_NAMES = ["x", "y", "z"] as const;

type SignedNode = {
    axis: number;
    sign: 1 | -1;
    line: HTMLDivElement;
    arrow: HTMLDivElement;
    label: HTMLDivElement;
};

const applyStyle = (node: HTMLElement | null, style: OverlayCSSStyle | undefined): void => { if (node && style) Object.assign(node.style, style); };

const clearStyle = (node: HTMLElement | null, style: OverlayCSSStyle | undefined): void => { if (node && style) for (const property of Object.keys(style)) (node.style as any)[property] = ""; };

const styleEquals = (a: AxisTriadStyle, b: AxisTriadStyle): boolean => JSON.stringify(a) === JSON.stringify(b);

const tupleEquals = <T>(a: readonly T[], b: readonly T[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

export class AxisTriadLayer implements OverlayLayer {
    readonly id: string;
    private anchor: OverlayAnchorDescriptor;
    private lengthWorld: number;
    private sizePx: number;
    private lineWidthPx: number;
    private labels: [string, string, string];
    private negativeLabels: [string, string, string];
    private colors: [string, string, string];
    private labelOffsetPx: number;
    private font: string;
    private directions: Required<AxisTriadDirections>;
    private arrowSizePx: number;
    private originSizePx: number;
    private className: string;
    private style: AxisTriadStyle;
    private container: HTMLDivElement | null = null;
    private originEl: HTMLDivElement | null = null;
    private nodes: SignedNode[] = [];
    private _system: OverlaySystemLike | null = null;

    constructor(desc: AxisTriadLayerDescriptor = {}) {
        this.id = desc.id ?? "overlay-axis-triad";
        this.anchor = desc.anchor ?? { kind: "screen", corner: "bottom-left", offsetPx: [26, -26] };
        this.lengthWorld = Math.max(1e-6, desc.lengthWorld ?? 1);
        this.sizePx = Math.max(8, desc.sizePx ?? 56);
        this.lineWidthPx = Math.max(1, desc.lineWidthPx ?? 2);
        this.labels = [...(desc.labels ?? ["X", "Y", "Z"])] as [string, string, string];
        this.negativeLabels = [...(desc.negativeLabels ?? this.labels.map((label) => `-${label}`))] as [string, string, string];
        this.colors = [...(desc.colors ?? ["#ff5f56", "#3fd77a", "#4ca7ff"])] as [string, string, string];
        this.labelOffsetPx = Math.max(0, desc.labelOffsetPx ?? 8);
        this.font = desc.font ?? "11px monospace";
        this.directions = { x: desc.directions?.x ?? "positive", y: desc.directions?.y ?? "positive", z: desc.directions?.z ?? "positive" };
        this.arrowSizePx = Math.max(2, desc.arrowSizePx ?? 7);
        this.originSizePx = Math.max(2, desc.originSizePx ?? 7);
        this.className = desc.className ?? "";
        this.style = desc.style ?? {};
    }

    setSystem(system: OverlaySystemLike | null): void {
        this._system = system;
    }

    attach(root: HTMLDivElement): void {
        if (this.container) this.detach();
        const container = document.createElement("div");
        container.className = `wasmgpu-overlay-axis-triad${this.className ? ` ${this.className}` : ""}`;
        container.style.position = "absolute";
        container.style.inset = "0";
        container.style.pointerEvents = "none";
        applyStyle(container, this.style.container);
        container.style.position = "absolute";
        container.style.inset = "0";
        container.style.pointerEvents = "none";
        root.appendChild(container);
        this.container = container;
        this.nodes = [];
        for (let axis = 0; axis < 3; axis++) for (const sign of [1, -1] as const) {
            const suffix = sign > 0 ? "positive" : "negative";
            const line = document.createElement("div");
            line.className = `wasmgpu-overlay-axis-triad-line wasmgpu-overlay-axis-triad-${AXIS_NAMES[axis]} wasmgpu-overlay-axis-triad-${suffix}`;
            line.style.position = "absolute";
            line.style.transformOrigin = "0 50%";
            applyStyle(line, this.style.axisLine);
            container.appendChild(line);
            const arrow = document.createElement("div");
            arrow.className = `wasmgpu-overlay-axis-triad-arrowhead wasmgpu-overlay-axis-triad-${AXIS_NAMES[axis]} wasmgpu-overlay-axis-triad-${suffix}`;
            arrow.style.position = "absolute";
            arrow.style.clipPath = "polygon(0 0, 100% 50%, 0 100%)";
            applyStyle(arrow, this.style.arrowhead);
            container.appendChild(arrow);
            const label = document.createElement("div");
            label.className = `wasmgpu-overlay-axis-triad-label wasmgpu-overlay-axis-triad-${AXIS_NAMES[axis]} wasmgpu-overlay-axis-triad-${suffix}`;
            label.style.position = "absolute"; label.style.whiteSpace = "nowrap";
            applyStyle(label, this.style.label);
            container.appendChild(label);
            this.nodes.push({ axis, sign, line, arrow, label });
        }
        const origin = document.createElement("div");
        origin.className = "wasmgpu-overlay-axis-triad-origin";
        origin.style.position = "absolute";
        origin.style.borderRadius = "50%";
        applyStyle(origin, this.style.originMarker);
        container.appendChild(origin);
        this.originEl = origin;
    }

    detach(): void {
        this.container?.remove();
        this.container = null;
        this.originEl = null;
        this.nodes = [];
    }

    update(ctx: OverlayUpdateContext): void {
        if (!this.container) return;
        if (this.anchor.kind === "world") this.updateWorld(ctx, this.anchor);
        else this.updateScreen(ctx);
    }

    setAnchor(anchor: OverlayAnchorDescriptor): this {
        if (JSON.stringify(anchor) === JSON.stringify(this.anchor)) return this;
        this.anchor = anchor;
        return this.changed("layout");
    }

    setDirections(directions: AxisTriadDirections): this {
        const next = { x: directions.x ?? this.directions.x, y: directions.y ?? this.directions.y, z: directions.z ?? this.directions.z };
        if (next.x === this.directions.x && next.y === this.directions.y && next.z === this.directions.z) return this;
        this.directions = next; return this.changed();
    }

    setLabels(labels: [string, string, string], negativeLabels?: [string, string, string]): this {
        const negative = negativeLabels ?? labels.map((label) => `-${label}`) as [string, string, string];
        if (tupleEquals(labels, this.labels) && tupleEquals(negative, this.negativeLabels)) return this;
        this.labels = [...labels]; this.negativeLabels = [...negative]; return this.changed();
    }

    setColors(colors: [string, string, string]): this {
        if (tupleEquals(colors, this.colors)) return this;
        this.colors = [...colors];
        return this.changed();
    }
    
    setLengthWorld(value: number): this {
        const next = Math.max(1e-6, value);
        if (next === this.lengthWorld) return this;
        this.lengthWorld = next;
        return this.changed();
    }
    
    setSizePx(value: number): this {
        const next = Math.max(8, value);
        if (next === this.sizePx) return this;
        this.sizePx = next;
        return this.changed("layout");
    }
    
    setLineWidth(value: number): this {
        const next = Math.max(1, value);
        if (next === this.lineWidthPx) return this;
        this.lineWidthPx = next;
        return this.changed();
    }
    
    setArrowSize(value: number): this {
        const next = Math.max(2, value);
        if (next === this.arrowSizePx) return this;
        this.arrowSizePx = next;
        return this.changed();
    }
    
    setOriginSize(value: number): this {
        const next = Math.max(2, value);
        if (next === this.originSizePx) return this;
        this.originSizePx = next;
        return this.changed();
    }
    
    setLabelAppearance(offsetPx: number, font: string = this.font): this {
        const nextOffset = Math.max(0, offsetPx);
        if (nextOffset === this.labelOffsetPx && font === this.font) return this;
        this.labelOffsetPx = nextOffset;
        this.font = font;
        return this.changed("layout");
    }
    
    setClassName(className: string): this {
        if (className === this.className) return this;
        this.className = className;
        this.updateContainerClass();
        return this.changed("layout");
    }
    
    setStyle(style: AxisTriadStyle): this {
        if (styleEquals(style, this.style)) return this;
        const previous = this.style;
        this.style = style;
        this.applyCurrentStyles(previous);
        return this.changed("layout");
    }

    private changed(reason: "manual" | "layout" = "manual"): this {
        this._system?.invalidate(reason);
        return this;
    }
    
    private directionVisible(axis: number, sign: 1 | -1): boolean {
        const direction = this.directions[AXIS_NAMES[axis]];
        return direction === "both" || (sign > 0 ? direction === "positive" : direction === "negative");
    }
    
    private updateWorld(ctx: OverlayUpdateContext, anchor: WorldAnchorDescriptor): void {
        const origin = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, anchor.position);
        if (!origin || !origin.inFront) { this.hideAll(); return; }
        this.drawOrigin(origin.x, origin.y);
        for (const node of this.nodes) {
            if (!this.directionVisible(node.axis, node.sign)) { this.hideNode(node); continue; }
            const axis = AXES[node.axis];
            const endpoint = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, [anchor.position[0] + axis[0] * this.lengthWorld * node.sign, anchor.position[1] + axis[1] * this.lengthWorld * node.sign, anchor.position[2] + axis[2] * this.lengthWorld * node.sign]);
            if (!endpoint || !endpoint.inFront) { this.hideNode(node); continue; }
            this.drawNode(node, origin.x, origin.y, endpoint.x, endpoint.y, endpoint.ndcZ);
        }
    }
    
    private updateScreen(ctx: OverlayUpdateContext): void {
        const [cx, cy] = resolveScreenAnchorPoint(this.anchor.kind === "screen" ? this.anchor : undefined, ctx.width, ctx.height); this.drawOrigin(cx, cy);
        const m = ctx.camera.viewMatrix;
        for (const node of this.nodes) {
            if (!this.directionVisible(node.axis, node.sign)) { this.hideNode(node); continue; }
            const axis = AXES[node.axis];
            const vx = ((m[0] * axis[0]) + (m[4] * axis[1]) + (m[8] * axis[2])) * node.sign;
            const vy = ((m[1] * axis[0]) + (m[5] * axis[1]) + (m[9] * axis[2])) * node.sign;
            const vz = ((m[2] * axis[0]) + (m[6] * axis[1]) + (m[10] * axis[2])) * node.sign;
            this.drawNode(node, cx, cy, cx + vx * this.sizePx, cy - vy * this.sizePx, -vz);
        }
    }
    
    private drawNode(node: SignedNode, x0: number, y0: number, x1: number, y1: number, depth: number): void {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.hypot(dx, dy);
        if (!Number.isFinite(len) || len < 0.75) { this.hideNode(node); return; }
        const color = this.colors[node.axis];
        const angle = Math.atan2(dy, dx);
        const lineWidth = this.lineWidthPx;
        const ux = dx / len;
        const uy = dy / len;
        const arrowLength = Math.min(this.arrowSizePx, len * 0.75);
        const arrowHalfWidth = arrowLength * 0.55;
        const baseX = x1 - ux * arrowLength;
        const baseY = y1 - uy * arrowLength;
        const shaftLength = Math.hypot(baseX - x0, baseY - y0);
        node.line.style.background = color;
        node.arrow.style.background = color;
        node.label.style.font = this.font;
        node.label.style.color = color;
        applyStyle(node.line, this.style.axisLine);
        applyStyle(node.arrow, this.style.arrowhead);
        applyStyle(node.label, this.style.label);
        node.line.style.display = "";
        node.arrow.style.display = "";
        node.label.style.display = "";
        node.line.style.position = "absolute";
        node.line.style.transformOrigin = "0 50%";
        node.line.style.left = `${x0}px`;
        node.line.style.top = `${y0}px`;
        node.line.style.width = `${shaftLength}px`;
        node.line.style.height = `${lineWidth}px`;
        node.line.style.transform = `translateY(${-lineWidth * 0.5}px) rotate(${angle}rad)`;
        node.arrow.style.position = "absolute";
        node.arrow.style.left = `${baseX}px`;
        node.arrow.style.top = `${baseY - arrowHalfWidth}px`;
        node.arrow.style.width = `${arrowLength}px`;
        node.arrow.style.height = `${arrowHalfWidth * 2}px`;
        node.arrow.style.clipPath = "polygon(0 0, 100% 50%, 0 100%)";
        node.arrow.style.transformOrigin = "0 50%";
        node.arrow.style.transform = `rotate(${angle}rad)`;
        node.label.textContent = node.sign > 0 ? this.labels[node.axis] : this.negativeLabels[node.axis];
        node.label.style.position = "absolute";
        node.label.style.whiteSpace = "nowrap";
        node.label.style.left = `${x1 + ux * this.labelOffsetPx}px`;
        node.label.style.top = `${y1 + uy * this.labelOffsetPx}px`;
        node.label.style.transform = `translate(${ux < -0.15 ? "-100%" : ux <= 0.15 ? "-50%" : "0"}, ${uy < -0.15 ? "-100%" : uy <= 0.15 ? "-50%" : "0"})`;
        const z = Math.round(100 - depth * 10);
        node.line.style.zIndex = `${z}`;
        node.arrow.style.zIndex = `${z}`;
        node.label.style.zIndex = `${z + 1}`;
    }
    
    private drawOrigin(x: number, y: number): void {
        if (!this.originEl) return;
        const s = this.originSizePx;
        this.originEl.style.background = "#eef5ff";
        applyStyle(this.originEl, this.style.originMarker);
        this.originEl.style.display = "";
        this.originEl.style.position = "absolute";
        this.originEl.style.borderRadius = "50%";
        this.originEl.style.left = `${x - s * 0.5}px`;
        this.originEl.style.top = `${y - s * 0.5}px`;
        this.originEl.style.width = `${s}px`;
        this.originEl.style.height = `${s}px`;
        this.originEl.style.zIndex = "200";
    }
    
    private hideNode(node: SignedNode): void {
        node.line.style.display = "none";
        node.arrow.style.display = "none";
        node.label.style.display = "none";
    }
    
    private hideAll(): void {
        for (const node of this.nodes) this.hideNode(node);
        if (this.originEl) this.originEl.style.display = "none";
    }
    
    private updateContainerClass(): void {
        if (this.container) this.container.className = `wasmgpu-overlay-axis-triad${this.className ? ` ${this.className}` : ""}`;
    }
    
    private applyCurrentStyles(previous: AxisTriadStyle = {}): void {
        clearStyle(this.container, previous.container);
        applyStyle(this.container, this.style.container);
        if (this.container) {
            this.container.style.position = "absolute";
            this.container.style.inset = "0";
            this.container.style.pointerEvents = "none";
        }
        clearStyle(this.originEl, previous.originMarker);
        applyStyle(this.originEl, this.style.originMarker);
        for (const node of this.nodes) {
            clearStyle(node.line, previous.axisLine);
            clearStyle(node.arrow, previous.arrowhead);
            clearStyle(node.label, previous.label);
            applyStyle(node.line, this.style.axisLine);
            applyStyle(node.arrow, this.style.arrowhead);
            applyStyle(node.label, this.style.label);
        }
    }
}
