/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { clamp } from "../utils";
import { DOMNodePool } from "./pool";
import { projectWorldToScreen, type ProjectedPoint } from "./projection";
import type { GridLayerDescriptor, GridPlane, OverlayLayer, OverlayUpdateContext } from "./types";

type GridAxes = {
    u: [number, number, number];
    v: [number, number, number];
};

const formatTick = (value: number): string => {
    if (!Number.isFinite(value)) return "nan";
    const abs = Math.abs(value);
    if (abs >= 1e4 || (abs > 0 && abs < 1e-3)) return value.toExponential(2);
    const rounded = Math.round(value * 1000) / 1000;
    return `${rounded}`;
};

const niceStep = (target: number): number => {
    const x = Math.max(1e-9, Math.abs(target));
    const exponent = Math.floor(Math.log10(x));
    const base = Math.pow(10, exponent);
    const scaled = x / base;
    const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return nice * base;
};

const axesForPlane = (plane: GridPlane): GridAxes => {
    if (plane === "xy") return { u: [1, 0, 0], v: [0, 1, 0] };
    if (plane === "xz") return { u: [1, 0, 0], v: [0, 0, 1] };
    return { u: [0, 1, 0], v: [0, 0, 1] };
};

const uvFromBounds = (plane: GridPlane, bounds: { boxMin: [number, number, number]; boxMax: [number, number, number] }): { uMin: number; uMax: number; vMin: number; vMax: number; } => {
    if (plane === "xy") return { uMin: bounds.boxMin[0], uMax: bounds.boxMax[0], vMin: bounds.boxMin[1], vMax: bounds.boxMax[1] };
    if (plane === "xz") return { uMin: bounds.boxMin[0], uMax: bounds.boxMax[0], vMin: bounds.boxMin[2], vMax: bounds.boxMax[2] };
    return { uMin: bounds.boxMin[1], uMax: bounds.boxMax[1], vMin: bounds.boxMin[2], vMax: bounds.boxMax[2] };
};

const worldFromUV = (plane: GridPlane, origin: [number, number, number], u: number, v: number): [number, number, number] => {
    if (plane === "xy") return [origin[0] + u, origin[1] + v, origin[2]];
    if (plane === "xz") return [origin[0] + u, origin[1], origin[2] + v];
    return [origin[0], origin[1] + u, origin[2] + v];
};

const drawLine = (node: HTMLDivElement, x0: number, y0: number, x1: number, y1: number, color: string, widthPx: number): void => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (!Number.isFinite(len) || len <= 1e-5) {
        node.style.display = "none";
        return;
    }
    node.style.display = "";
    node.style.left = `${x0}px`;
    node.style.top = `${y0}px`;
    node.style.width = `${len}px`;
    node.style.height = `${Math.max(1, widthPx)}px`;
    node.style.background = color;
    node.style.transform = `translateY(${-0.5 * Math.max(1, widthPx)}px) rotate(${Math.atan2(dy, dx)}rad)`;
};

const signedZero = (x: number, eps: number): number => Math.abs(x) <= eps ? 0 : x;

const isNear = (a: number, b: number, eps: number): boolean => Math.abs(a - b) <= eps;

const tickEpsilon = (span: number, step: number): number => Math.max(1e-9, Math.abs(span) * 1e-9, Math.abs(step) * 1e-6);

const isMajorTick = (value: number, majorStep: number, eps: number): boolean => {
    if (!Number.isFinite(majorStep) || majorStep <= eps) return false;
    const q = value / majorStep;
    return Math.abs(q - Math.round(q)) <= 1e-4;
};

const countInteriorTicks = (min: number, max: number, step: number): number => {
    const span = Math.max(0, max - min);
    const eps = tickEpsilon(span, step);
    if (step <= eps) return 0;
    let count = 0;
    let value = Math.ceil((min + eps) / step) * step;
    const limit = max - eps;
    for (let i = 0; i < 1_000_000 && value <= limit; i++, value += step) {
        if (value > min + eps && value < max - eps) count++;
    }
    return count;
};

const buildEdgeAlignedTicks = (min: number, max: number, step: number): number[] => {
    const span = Math.max(0, max - min);
    const eps = tickEpsilon(span, step);
    if (span <= eps) return [min];
    const ticks: number[] = [min];
    if (step > eps) {
        let value = Math.ceil((min + eps) / step) * step;
        const limit = max - eps;
        for (let i = 0; i < 1_000_000 && value <= limit; i++, value += step) {
            if (value <= min + eps || value >= max - eps) continue;
            ticks.push(signedZero(value, eps));
        }
    }
    ticks.push(max);
    return ticks;
};

export class GridLayer implements OverlayLayer {
    readonly id: string;
    private readonly plane: GridPlane;
    private readonly origin: [number, number, number];
    private readonly extentMode: "scene-fit" | "fixed";
    private readonly fixedUMin: number;
    private readonly fixedUMax: number;
    private readonly fixedVMin: number;
    private readonly fixedVMax: number;
    private readonly targetMinorSpacingPx: number;
    private readonly majorStepFactor: number;
    private readonly minLabelSpacingPx: number;
    private readonly maxLines: number;
    private readonly maxLabels: number;
    private readonly minorColor: string;
    private readonly majorColor: string;
    private readonly axisColor: string;
    private readonly labelColor: string;
    private readonly lineWidthMinorPx: number;
    private readonly lineWidthMajorPx: number;
    private readonly font: string;
    private container: HTMLDivElement | null = null;
    private linePool: DOMNodePool<HTMLDivElement> | null = null;
    private labelPool: DOMNodePool<HTMLDivElement> | null = null;

    constructor(desc: GridLayerDescriptor = {}) {
        this.id = desc.id ?? "overlay-grid";
        this.plane = desc.plane ?? "xy";
        this.origin = desc.origin ?? [0, 0, 0];
        this.extentMode = desc.extentMode ?? "scene-fit";
        this.fixedUMin = desc.fixedUMin ?? -10;
        this.fixedUMax = desc.fixedUMax ?? 10;
        this.fixedVMin = desc.fixedVMin ?? -10;
        this.fixedVMax = desc.fixedVMax ?? 10;
        this.targetMinorSpacingPx = Math.max(6, desc.targetMinorSpacingPx ?? 30);
        this.majorStepFactor = Math.max(2, Math.round(desc.majorStepFactor ?? 5));
        this.minLabelSpacingPx = Math.max(8, desc.minLabelSpacingPx ?? 58);
        this.maxLines = Math.max(4, Math.round(desc.maxLines ?? 160));
        this.maxLabels = Math.max(2, Math.round(desc.maxLabels ?? 60));
        this.minorColor = desc.minorColor ?? "rgba(180, 210, 255, 0.17)";
        this.majorColor = desc.majorColor ?? "rgba(180, 210, 255, 0.36)";
        this.axisColor = desc.axisColor ?? "rgba(220, 235, 255, 0.8)";
        this.labelColor = desc.labelColor ?? "rgba(220, 235, 255, 0.9)";
        this.lineWidthMinorPx = Math.max(1, desc.lineWidthMinorPx ?? 1);
        this.lineWidthMajorPx = Math.max(1, desc.lineWidthMajorPx ?? 2);
        this.font = desc.font ?? "11px monospace";
    }

    attach(root: HTMLDivElement): void {
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.inset = "0";
        container.style.pointerEvents = "none";
        root.appendChild(container);
        this.container = container;
        this.linePool = new DOMNodePool(container, () => {
            const node = document.createElement("div");
            node.style.position = "absolute";
            node.style.transformOrigin = "0 50%";
            return node;
        }, this.maxLines);
        this.labelPool = new DOMNodePool(container, () => {
            const node = document.createElement("div");
            node.style.position = "absolute";
            node.style.color = this.labelColor;
            node.style.font = this.font;
            node.style.whiteSpace = "nowrap";
            return node;
        }, this.maxLabels);
    }

    detach(): void {
        this.linePool?.clear(true);
        this.labelPool?.clear(true);
        this.linePool = null;
        this.labelPool = null;
        this.container?.remove();
        this.container = null;
    }

    update(ctx: OverlayUpdateContext): void {
        if (!this.container || !this.linePool || !this.labelPool) return;
        const { uMin, uMax, vMin, vMax } = this.resolveExtent(ctx);
        const spanU = Math.max(1e-6, uMax - uMin);
        const spanV = Math.max(1e-6, vMax - vMin);
        const pxPerUnit = this.estimatePixelsPerUnitAxes(ctx);
        const referencePxPerUnit = Math.max(pxPerUnit.u, pxPerUnit.v);
        let minorStep = niceStep(this.targetMinorSpacingPx / Math.max(1e-6, referencePxPerUnit));
        const reservedBoundaryLines = (spanU > 1e-9 ? 2 : 1) + (spanV > 1e-9 ? 2 : 1);
        const maxInteriorLines = Math.max(0, this.maxLines - reservedBoundaryLines);
        let interiorU = countInteriorTicks(uMin, uMax, minorStep);
        let interiorV = countInteriorTicks(vMin, vMax, minorStep);
        for (let i = 0; i < 32 && (interiorU + interiorV) > maxInteriorLines; i++) {
            minorStep = niceStep(minorStep * 1.5);
            interiorU = countInteriorTicks(uMin, uMax, minorStep);
            interiorV = countInteriorTicks(vMin, vMax, minorStep);
        }
        const majorStep = minorStep * this.majorStepFactor;
        const majorSpacingPxU = majorStep * pxPerUnit.u;
        const majorSpacingPxV = majorStep * pxPerUnit.v;
        let labelStrideU = Math.max(1, Math.ceil(this.minLabelSpacingPx / Math.max(1e-6, majorSpacingPxU)));
        let labelStrideV = Math.max(1, Math.ceil(this.minLabelSpacingPx / Math.max(1e-6, majorSpacingPxV)));
        const uTicks = buildEdgeAlignedTicks(uMin, uMax, minorStep);
        const vTicks = buildEdgeAlignedTicks(vMin, vMax, minorStep);
        const edgeEpsU = tickEpsilon(spanU, minorStep);
        const edgeEpsV = tickEpsilon(spanV, minorStep);
        const majorEpsU = Math.max(edgeEpsU, Math.abs(majorStep) * 1e-6);
        const majorEpsV = Math.max(edgeEpsV, Math.abs(majorStep) * 1e-6);
        const axisEpsU = Math.max(edgeEpsU, Math.abs(minorStep) * 1e-3);
        const axisEpsV = Math.max(edgeEpsV, Math.abs(minorStep) * 1e-3);
        const majorCountU = uTicks.reduce((n, u) => n + (isMajorTick(u, majorStep, majorEpsU) ? 1 : 0), 0);
        const majorCountV = vTicks.reduce((n, v) => n + (isMajorTick(v, majorStep, majorEpsV) ? 1 : 0), 0);
        for (let i = 0; i < 32; i++) {
            const estLabelsU = majorCountU > 0 ? Math.ceil(majorCountU / labelStrideU) : 0;
            const estLabelsV = majorCountV > 0 ? Math.ceil(majorCountV / labelStrideV) : 0;
            if ((estLabelsU + estLabelsV) <= this.maxLabels) break;
            if (estLabelsU >= estLabelsV) labelStrideU++;
            else labelStrideV++;
        }
        this.linePool.beginFrame();
        this.labelPool.beginFrame();
        let uMajorIndex = 0;
        for (let i = 0; i < uTicks.length; i++) {
            const u = uTicks[i];
            const seg = this.projectFrontClippedSegment(ctx, worldFromUV(this.plane, this.origin, u, vMin), worldFromUV(this.plane, this.origin, u, vMax));
            if (!seg) continue;
            const p0 = seg.p0;
            const p1 = seg.p1;
            const major = isMajorTick(u, majorStep, majorEpsU);
            const axis = Math.abs(u) <= axisEpsU;
            const edge = isNear(u, uMin, edgeEpsU) || isNear(u, uMax, edgeEpsU);
            const line = this.linePool.acquire();
            drawLine(line, p0.x, p0.y, p1.x, p1.y, axis ? this.axisColor : ((major || edge) ? this.majorColor : this.minorColor), (major || axis || edge) ? this.lineWidthMajorPx : this.lineWidthMinorPx);
            if (major && (uMajorIndex % labelStrideU === 0)) {
                const label = this.labelPool.acquire();
                label.textContent = formatTick(u);
                label.style.left = `${p0.x + 4}px`;
                label.style.top = `${p0.y + 2}px`;
            }
            if (major) uMajorIndex++;
        }
        let vMajorIndex = 0;
        for (let i = 0; i < vTicks.length; i++) {
            const v = vTicks[i];
            const seg = this.projectFrontClippedSegment(ctx, worldFromUV(this.plane, this.origin, uMin, v), worldFromUV(this.plane, this.origin, uMax, v));
            if (!seg) continue;
            const p0 = seg.p0;
            const p1 = seg.p1;
            const major = isMajorTick(v, majorStep, majorEpsV);
            const axis = Math.abs(v) <= axisEpsV;
            const edge = isNear(v, vMin, edgeEpsV) || isNear(v, vMax, edgeEpsV);
            const line = this.linePool.acquire();
            drawLine(line, p0.x, p0.y, p1.x, p1.y, axis ? this.axisColor : ((major || edge) ? this.majorColor : this.minorColor), (major || axis || edge) ? this.lineWidthMajorPx : this.lineWidthMinorPx);
            if (major && (vMajorIndex % labelStrideV === 0)) {
                const label = this.labelPool.acquire();
                label.textContent = formatTick(v);
                label.style.left = `${p0.x + 4}px`;
                label.style.top = `${p0.y + 2}px`;
            }
            if (major) vMajorIndex++;
        }
        this.linePool.endFrame();
        this.labelPool.endFrame();
    }

    private projectFrontClippedSegment(ctx: OverlayUpdateContext, worldA: [number, number, number], worldB: [number, number, number]): { p0: ProjectedPoint; p1: ProjectedPoint; } | null {
        const near = this.getCameraNear(ctx.camera);
        const nearZ = -(near > 0 ? near + Math.max(near * 1e-4, 1e-6) : 0);
        const view = ctx.camera.viewMatrix;
        let a: [number, number, number] = [worldA[0], worldA[1], worldA[2]];
        let b: [number, number, number] = [worldB[0], worldB[1], worldB[2]];
        let va = this.transformPoint(view, a);
        let vb = this.transformPoint(view, b);
        if (va[2] > nearZ || vb[2] > nearZ) {
            if (va[2] > nearZ && vb[2] > nearZ) return null;
            if (va[2] > nearZ) {
                const denom = vb[2] - va[2];
                if (!Number.isFinite(denom) || Math.abs(denom) <= 1e-8) return null;
                const t = clamp((nearZ - va[2]) / denom, 0, 1);
                a = [a[0] + ((b[0] - a[0]) * t), a[1] + ((b[1] - a[1]) * t), a[2] + ((b[2] - a[2]) * t)];
                va = [va[0] + ((vb[0] - va[0]) * t), va[1] + ((vb[1] - va[1]) * t), nearZ];
            }
            if (vb[2] > nearZ) {
                const denom = va[2] - vb[2];
                if (!Number.isFinite(denom) || Math.abs(denom) <= 1e-8) return null;
                const t = clamp((nearZ - vb[2]) / denom, 0, 1);
                b = [b[0] + ((a[0] - b[0]) * t), b[1] + ((a[1] - b[1]) * t), b[2] + ((a[2] - b[2]) * t)];
                vb = [vb[0] + ((va[0] - vb[0]) * t), vb[1] + ((va[1] - vb[1]) * t), nearZ];
            }
        }
        const p0 = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, a);
        const p1 = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, b);
        if (!p0 || !p1 || !p0.inFront || !p1.inFront) return null;
        if (!Number.isFinite(p0.x) || !Number.isFinite(p0.y) || !Number.isFinite(p1.x) || !Number.isFinite(p1.y)) return null;
        return { p0, p1 };
    }

    private getCameraNear(camera: OverlayUpdateContext["camera"]): number {
        const near = (camera as { near?: number }).near;
        if (typeof near !== "number" || !Number.isFinite(near)) return 0;
        return Math.max(0, near);
    }

    private transformPoint(matrix: readonly number[], p: readonly number[]): [number, number, number] {
        const x = p[0] ?? 0;
        const y = p[1] ?? 0;
        const z = p[2] ?? 0;
        return [(matrix[0] * x) + (matrix[4] * y) + (matrix[8] * z) + matrix[12], (matrix[1] * x) + (matrix[5] * y) + (matrix[9] * z) + matrix[13], (matrix[2] * x) + (matrix[6] * y) + (matrix[10] * z) + matrix[14]];
    }

    private resolveExtent(ctx: OverlayUpdateContext): { uMin: number; uMax: number; vMin: number; vMax: number; } {
        if (this.extentMode === "fixed") return { uMin: Math.min(this.fixedUMin, this.fixedUMax), uMax: Math.max(this.fixedUMin, this.fixedUMax), vMin: Math.min(this.fixedVMin, this.fixedVMax), vMax: Math.max(this.fixedVMin, this.fixedVMax) };
        const scene = ctx.scene;
        if (!scene) return { uMin: -10, uMax: 10, vMin: -10, vMax: 10 };
        const bounds = scene.getBounds();
        if (bounds.empty) return { uMin: -10, uMax: 10, vMin: -10, vMax: 10 };
        const uv = uvFromBounds(this.plane, bounds);
        const marginU = Math.max(1e-3, (uv.uMax - uv.uMin) * 0.1);
        const marginV = Math.max(1e-3, (uv.vMax - uv.vMin) * 0.1);
        return {
            uMin: uv.uMin - marginU, uMax: uv.uMax + marginU,
            vMin: uv.vMin - marginV, vMax: uv.vMax + marginV
        };
    }

    private estimatePixelsPerUnitAxes(ctx: OverlayUpdateContext): { u: number; v: number; } {
        const axes = axesForPlane(this.plane);
        const p0 = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, this.origin);
        if (!p0 || !p0.inFront || p0.ndcZ < 0 || p0.ndcZ > 1) return { u: 1, v: 1 };
        const pu = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, [this.origin[0] + axes.u[0], this.origin[1] + axes.u[1], this.origin[2] + axes.u[2]]);
        const pv = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, [this.origin[0] + axes.v[0], this.origin[1] + axes.v[1], this.origin[2] + axes.v[2]]);
        const du = (pu && pu.inFront && pu.ndcZ >= 0 && pu.ndcZ <= 1 && Number.isFinite(pu.x) && Number.isFinite(pu.y)) ? Math.hypot(pu.x - p0.x, pu.y - p0.y) : 1;
        const dv = (pv && pv.inFront && pv.ndcZ >= 0 && pv.ndcZ <= 1 && Number.isFinite(pv.x) && Number.isFinite(pv.y)) ? Math.hypot(pv.x - p0.x, pv.y - p0.y) : 1;
        return { u: clamp(du, 1e-6, 1e9), v: clamp(dv, 1e-6, 1e9) };
    }
}
