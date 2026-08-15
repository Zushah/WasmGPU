/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { DOMNodePool } from "../pool";
import { projectWorldToScreen, resolveScreenAnchorPoint } from "../projection";
import type { OverlayLayer, OverlaySystemLike, OverlayUpdateContext, ScreenAnchorDescriptor } from "../types";
import type { AnnotationLabelEntry, AnnotationProbeReadout, AnnotationSelectionReadout } from "./types";
import { formatFiniteNumber, formatWorldVector } from "./units";

export type AnnotationLabelLayerDescriptor = {
    id?: string;
    maxLabels?: number;
    font?: string;
    labelOffsetPx?: [number, number];
    readoutAnchor?: ScreenAnchorDescriptor;
    readoutWidthPx?: number;
};

const formatNdIndex = (ndIndex: number[] | null): string => {
    if (!ndIndex || ndIndex.length === 0) return "null";
    return `[${ndIndex.join(", ")}]`;
};

const formatAttributes = (attributes: AnnotationProbeReadout["attributes"]): string[] => {
    if (!attributes) return ["attributes: null"];
    const lines: string[] = [];
    if (attributes.scalar !== undefined && attributes.scalar !== null) lines.push(`scalar: ${formatFiniteNumber(attributes.scalar, 6)}`);
    if (attributes.vector) lines.push(`vector: [${formatFiniteNumber(attributes.vector[0], 4)}, ${formatFiniteNumber(attributes.vector[1], 4)}, ${formatFiniteNumber(attributes.vector[2], 4)}, ${formatFiniteNumber(attributes.vector[3], 4)}]`);
    if (attributes.packedPoint) lines.push(`packedPoint: [${formatFiniteNumber(attributes.packedPoint[0], 4)}, ${formatFiniteNumber(attributes.packedPoint[1], 4)}, ${formatFiniteNumber(attributes.packedPoint[2], 4)}, ${formatFiniteNumber(attributes.packedPoint[3], 4)}]`);
    if (attributes.component) lines.push(`component: ${attributes.component}`);
    if (attributes.componentIndex !== undefined && attributes.componentIndex !== null) lines.push(`componentIndex: ${attributes.componentIndex}`);
    if (attributes.color) lines.push(`color: [${formatFiniteNumber(attributes.color[0], 4)}, ${formatFiniteNumber(attributes.color[1], 4)}, ${formatFiniteNumber(attributes.color[2], 4)}, ${formatFiniteNumber(attributes.color[3], 4)}]`);
    if (attributes.edgeEndpoints) lines.push(`edgeEndpoints: [${attributes.edgeEndpoints[0]}, ${attributes.edgeEndpoints[1]}]`);
    if (attributes.edgePositions) lines.push(`edgePositions: [${formatFiniteNumber(attributes.edgePositions[0], 4)}, ${formatFiniteNumber(attributes.edgePositions[1], 4)}, ${formatFiniteNumber(attributes.edgePositions[2], 4)}, ${formatFiniteNumber(attributes.edgePositions[3], 4)}, ${formatFiniteNumber(attributes.edgePositions[4], 4)}, ${formatFiniteNumber(attributes.edgePositions[5], 4)}]`);
    if (lines.length === 0) lines.push("attributes: {}");
    return lines;
};

const cloneProbeAttributes = (attributes: AnnotationProbeReadout["attributes"]): AnnotationProbeReadout["attributes"] => {
    if (!attributes) return null;
    return {
        ...attributes,
        vector: attributes.vector ? [...attributes.vector] as [number, number, number, number] : null,
        packedPoint: attributes.packedPoint ? [...attributes.packedPoint] as [number, number, number, number] : null,
        color: attributes.color ? [...attributes.color] as [number, number, number, number] : null,
        edgeEndpoints: attributes.edgeEndpoints ? [...attributes.edgeEndpoints] as [number, number] : null,
        edgePositions: attributes.edgePositions ? [...attributes.edgePositions] as [number, number, number, number, number, number] : null
    };
};

const formatProbe = (title: string, readout: AnnotationProbeReadout | null): string => {
    if (!readout || !readout.hit) return `${title}: miss`;
    return [
        `${title}: hit`,
        `kind: ${readout.kind}`,
        `objectId: ${readout.objectId}`,
        `elementIndex: ${readout.elementIndex}`,
        `world: ${formatWorldVector(readout.worldPosition, 5)}`,
        `ndIndex: ${formatNdIndex(readout.ndIndex)}`,
        ...formatAttributes(readout.attributes)
    ].join("\n");
};

const formatSelection = (title: string, readout: AnnotationSelectionReadout | null): string => {
    if (!readout || !readout.hit) return `${title}: miss`;
    const base = formatProbe(title, readout).split("\n");
    if (readout.annotationId) base.push(`annotationId: ${readout.annotationId}`);
    if (readout.annotationKind) base.push(`annotationKind: ${readout.annotationKind}`);
    if (readout.anchorRole) base.push(`anchorRole: ${readout.anchorRole}`);
    return base.join("\n");
};

export class AnnotationLabelLayer implements OverlayLayer {
    readonly id: string;
    readonly maxLabels: number;
    private readonly font: string;
    private readonly labelOffsetPx: [number, number];
    private readonly readoutAnchor: ScreenAnchorDescriptor;
    private readonly readoutWidthPx: number;
    private container: HTMLDivElement | null = null;
    private labelPool: DOMNodePool<HTMLDivElement> | null = null;
    private hoverReadoutEl: HTMLDivElement | null = null;
    private selectionReadoutEl: HTMLDivElement | null = null;
    private _system: OverlaySystemLike | null = null;
    private entries: AnnotationLabelEntry[] = [];
    private entriesRevision: number = -1;
    private entriesDirty: boolean = true;
    private hoverReadout: AnnotationProbeReadout | null = null;
    private selectionReadout: AnnotationSelectionReadout | null = null;
    private readoutDirty: boolean = true;
    private hoverTextCache: string = "";
    private selectionTextCache: string = "";

    constructor(desc: AnnotationLabelLayerDescriptor = {}) {
        this.id = desc.id ?? "annotation-label-layer";
        this.maxLabels = Math.max(1, Math.round(desc.maxLabels ?? 256));
        this.font = desc.font ?? "11px monospace";
        this.labelOffsetPx = desc.labelOffsetPx ?? [8, -8];
        this.readoutAnchor = desc.readoutAnchor ?? { kind: "screen", corner: "top-left", offsetPx: [12, 12] };
        this.readoutWidthPx = Math.max(180, Math.round(desc.readoutWidthPx ?? 330));
    }

    get pooledNodeCount(): number {
        return this.labelPool?.size ?? 0;
    }

    setSystem(system: OverlaySystemLike | null): void {
        this._system = system;
    }

    attach(root: HTMLDivElement): void {
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.inset = "0";
        container.style.pointerEvents = "none";
        root.appendChild(container);
        this.container = container;
        this.labelPool = new DOMNodePool(container, () => {
            const node = document.createElement("div");
            node.style.position = "absolute";
            node.style.whiteSpace = "nowrap";
            node.style.font = this.font;
            node.style.textShadow = "0 1px 1px rgba(0, 0, 0, 0.8)";
            node.style.willChange = "transform,left,top";
            return node;
        }, this.maxLabels);
        this.hoverReadoutEl = document.createElement("div");
        this.selectionReadoutEl = document.createElement("div");
        for (const node of [this.hoverReadoutEl, this.selectionReadoutEl]) {
            node.style.position = "absolute";
            node.style.pointerEvents = "none";
            node.style.whiteSpace = "pre-line";
            node.style.font = this.font;
            node.style.color = "#dce9ff";
            node.style.padding = "6px 7px";
            node.style.border = "1px solid rgba(180, 210, 255, 0.28)";
            node.style.background = "rgba(5, 11, 20, 0.72)";
            node.style.borderRadius = "4px";
            node.style.minWidth = `${Math.floor(this.readoutWidthPx * 0.5)}px`;
            node.style.maxWidth = `${this.readoutWidthPx}px`;
            container.appendChild(node);
        }
        this.entriesDirty = true;
        this.readoutDirty = true;
    }

    detach(): void {
        this.labelPool?.clear(true);
        this.labelPool = null;
        this.hoverReadoutEl = null;
        this.selectionReadoutEl = null;
        this.container?.remove();
        this.container = null;
        this.hoverTextCache = "";
        this.selectionTextCache = "";
    }

    setEntries(entries: readonly AnnotationLabelEntry[], revision: number): void {
        this.entries = new Array(Math.min(this.maxLabels, entries.length));
        for (let i = 0; i < this.entries.length; i++) {
            const src = entries[i];
            this.entries[i] = {
                key: src.key,
                text: src.text,
                color: src.color,
                position: [src.position[0], src.position[1], src.position[2]]
            };
        }
        if (revision !== this.entriesRevision) {
            this.entriesRevision = revision;
            this.entriesDirty = true;
        }
        this._system?.invalidate("manual");
    }

    setHoverReadout(readout: AnnotationProbeReadout | null): void {
        this.hoverReadout = readout ? { ...readout, worldPosition: readout.worldPosition ? [readout.worldPosition[0], readout.worldPosition[1], readout.worldPosition[2]] : null, ndIndex: readout.ndIndex ? readout.ndIndex.slice() : null, attributes: cloneProbeAttributes(readout.attributes) } : null;
        this.readoutDirty = true;
        this._system?.invalidate("manual");
    }

    setSelectionReadout(readout: AnnotationSelectionReadout | null): void {
        this.selectionReadout = readout ? { ...readout, worldPosition: readout.worldPosition ? [readout.worldPosition[0], readout.worldPosition[1], readout.worldPosition[2]] : null, ndIndex: readout.ndIndex ? readout.ndIndex.slice() : null, attributes: cloneProbeAttributes(readout.attributes) } : null;
        this.readoutDirty = true;
        this._system?.invalidate("manual");
    }

    update(ctx: OverlayUpdateContext): void {
        if (!this.container || !this.labelPool) return;
        const positionReasons = ctx.reasons.has("camera") || ctx.reasons.has("viewport") || ctx.reasons.has("layout") || ctx.reasons.has("manual") || ctx.reasons.has("interaction");
        if (positionReasons || this.entriesDirty) this.renderLabels(ctx);
        if (this.readoutDirty || ctx.reasons.has("viewport") || ctx.reasons.has("layout") || ctx.reasons.has("manual")) this.renderReadouts(ctx);
    }

    private renderLabels(ctx: OverlayUpdateContext): void {
        if (!this.labelPool) return;
        this.labelPool.beginFrame();
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            const projected = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, entry.position);
            if (!projected || !projected.visible) continue;
            const node = this.labelPool.acquire();
            if (this.entriesDirty || node.dataset.annotationKey !== entry.key) {
                node.dataset.annotationKey = entry.key;
                node.style.color = entry.color;
                node.textContent = entry.text;
            }
            node.style.left = `${projected.x + this.labelOffsetPx[0]}px`;
            node.style.top = `${projected.y + this.labelOffsetPx[1]}px`;
        }
        this.labelPool.endFrame();
        this.entriesDirty = false;
    }

    private renderReadouts(ctx: OverlayUpdateContext): void {
        if (!this.hoverReadoutEl || !this.selectionReadoutEl) return;
        const [x, y] = resolveScreenAnchorPoint(this.readoutAnchor, ctx.width, ctx.height);
        this.hoverReadoutEl.style.left = `${x}px`;
        this.hoverReadoutEl.style.top = `${y}px`;
        this.selectionReadoutEl.style.left = `${x}px`;
        this.selectionReadoutEl.style.top = `${y + 122}px`;
        const hoverText = formatProbe("Hover", this.hoverReadout);
        const selectionText = formatSelection("Selection", this.selectionReadout);
        if (hoverText !== this.hoverTextCache) {
            this.hoverTextCache = hoverText;
            this.hoverReadoutEl.textContent = hoverText;
        }
        if (selectionText !== this.selectionTextCache) {
            this.selectionTextCache = selectionText;
            this.selectionReadoutEl.textContent = selectionText;
        }
        this.readoutDirty = false;
    }
}
