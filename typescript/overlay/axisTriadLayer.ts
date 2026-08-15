/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { projectWorldToScreen, resolveScreenAnchorPoint } from "./projection";
import type { AxisTriadLayerDescriptor, OverlayLayer, OverlaySystemLike, OverlayUpdateContext, WorldAnchorDescriptor } from "./types";

const AXES: ReadonlyArray<[number, number, number]> = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

const normalize2 = (x: number, y: number): [number, number] => {
    const len = Math.hypot(x, y);
    if (len <= 1e-8) return [0, 0];
    return [x / len, y / len];
};

export class AxisTriadLayer implements OverlayLayer {
    readonly id: string;
    private readonly anchor: AxisTriadLayerDescriptor["anchor"];
    private readonly lengthWorld: number;
    private readonly sizePx: number;
    private readonly lineWidthPx: number;
    private readonly labels: [string, string, string];
    private readonly colors: [string, string, string];
    private readonly labelOffsetPx: number;
    private readonly font: string;
    private root: HTMLDivElement | null = null;
    private container: HTMLDivElement | null = null;
    private lines: HTMLDivElement[] = [];
    private labelEls: HTMLDivElement[] = [];
    private _system: OverlaySystemLike | null = null;

    constructor(desc: AxisTriadLayerDescriptor = {}) {
        this.id = desc.id ?? "overlay-axis-triad";
        this.anchor = desc.anchor ?? { kind: "screen", corner: "bottom-left", offsetPx: [26, -26] };
        this.lengthWorld = Math.max(1e-6, desc.lengthWorld ?? 1);
        this.sizePx = Math.max(8, desc.sizePx ?? 56);
        this.lineWidthPx = Math.max(1, desc.lineWidthPx ?? 2);
        this.labels = desc.labels ?? ["X", "Y", "Z"];
        this.colors = desc.colors ?? ["#ff5f56", "#3fd77a", "#4ca7ff"];
        this.labelOffsetPx = Math.max(0, desc.labelOffsetPx ?? 8);
        this.font = desc.font ?? "11px monospace";
    }

    setSystem(system: OverlaySystemLike | null): void {
        this._system = system;
    }

    attach(root: HTMLDivElement): void {
        this.root = root;
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.inset = "0";
        container.style.pointerEvents = "none";
        root.appendChild(container);
        this.container = container;
        this.lines = [];
        this.labelEls = [];
        for (let i = 0; i < 3; i++) {
            const line = document.createElement("div");
            line.style.position = "absolute";
            line.style.transformOrigin = "0 50%";
            line.style.background = this.colors[i];
            container.appendChild(line);
            this.lines.push(line);
            const label = document.createElement("div");
            label.style.position = "absolute";
            label.style.font = this.font;
            label.style.color = this.colors[i];
            label.style.whiteSpace = "nowrap";
            label.textContent = this.labels[i];
            container.appendChild(label);
            this.labelEls.push(label);
        }
    }

    detach(): void {
        this.container?.remove();
        this.root = null;
        this.container = null;
        this.lines = [];
        this.labelEls = [];
    }

    update(ctx: OverlayUpdateContext): void {
        if (!this.container || !this.root) return;
        if (this.anchor?.kind === "world") {
            this.updateWorld(ctx, this.anchor);
            return;
        }
        this.updateScreen(ctx);
    }

    private updateWorld(ctx: OverlayUpdateContext, anchor: WorldAnchorDescriptor): void {
        const origin = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, anchor.position);
        if (!origin || !origin.inFront) {
            this.hideAll();
            return;
        }
        for (let i = 0; i < 3; i++) {
            const axis = AXES[i];
            const endpoint = projectWorldToScreen(ctx.camera, ctx.width, ctx.height, [
                anchor.position[0] + (axis[0] * this.lengthWorld),
                anchor.position[1] + (axis[1] * this.lengthWorld),
                anchor.position[2] + (axis[2] * this.lengthWorld),
            ]);
            if (!endpoint || !endpoint.inFront) {
                this.lines[i].style.display = "none";
                this.labelEls[i].style.display = "none";
                continue;
            }
            this.drawLine(this.lines[i], origin.x, origin.y, endpoint.x, endpoint.y, this.colors[i], this.lineWidthPx);
            this.drawLabel(this.labelEls[i], endpoint.x, endpoint.y, this.colors[i]);
        }
    }

    private updateScreen(ctx: OverlayUpdateContext): void {
        const [cx, cy] = resolveScreenAnchorPoint(
            this.anchor?.kind === "screen" ? this.anchor : { kind: "screen", corner: "bottom-left", offsetPx: [26, -26] },
            ctx.width, ctx.height
        );
        const m = ctx.camera.viewMatrix;
        for (let i = 0; i < 3; i++) {
            const axis = AXES[i];
            const vx = (m[0] * axis[0]) + (m[4] * axis[1]) + (m[8] * axis[2]);
            const vy = (m[1] * axis[0]) + (m[5] * axis[1]) + (m[9] * axis[2]);
            const [dx, dy] = normalize2(vx, -vy);
            const ex = cx + (dx * this.sizePx);
            const ey = cy + (dy * this.sizePx);
            this.drawLine(this.lines[i], cx, cy, ex, ey, this.colors[i], this.lineWidthPx);
            this.drawLabel(this.labelEls[i], ex, ey, this.colors[i]);
        }
    }

    private drawLine(node: HTMLDivElement, x0: number, y0: number, x1: number, y1: number, color: string, widthPx: number): void {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.hypot(dx, dy);
        if (!Number.isFinite(len) || len <= 1e-5) {
            node.style.display = "none";
            return;
        }
        const angle = Math.atan2(dy, dx);
        node.style.display = "";
        node.style.background = color;
        node.style.left = `${x0}px`;
        node.style.top = `${y0}px`;
        node.style.width = `${len}px`;
        node.style.height = `${Math.max(1, widthPx)}px`;
        node.style.transform = `translateY(${-0.5 * Math.max(1, widthPx)}px) rotate(${angle}rad)`;
    }

    private drawLabel(node: HTMLDivElement, x: number, y: number, color: string): void {
        node.style.display = "";
        node.style.left = `${x + this.labelOffsetPx}px`;
        node.style.top = `${y - this.labelOffsetPx}px`;
        node.style.color = color;
    }

    private hideAll(): void {
        for (let i = 0; i < this.lines.length; i++) this.lines[i].style.display = "none";
        for (let i = 0; i < this.labelEls.length; i++) this.labelEls[i].style.display = "none";
    }
}
