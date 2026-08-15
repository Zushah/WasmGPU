/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { nowMs } from "../utils";
import { cameraSignatureEquals, writeCameraSignature } from "./projection";
import type { OverlayInvalidationReason, OverlayLayer, OverlaySystemDescriptor, OverlaySystemLike, OverlayUpdateRequest } from "./types";

const addReasons = (set: Set<OverlayInvalidationReason>, reasons: OverlayUpdateRequest["reasons"]): void => {
    if (!reasons) return;
    if (Array.isArray(reasons)) {
        for (let i = 0; i < reasons.length; i++) set.add(reasons[i]);
        return;
    }
    set.add(reasons);
};

export class OverlaySystem implements OverlaySystemLike {
    readonly canvas: HTMLCanvasElement;
    readonly parent: HTMLElement;
    readonly root: HTMLDivElement;
    readonly interactionThrottleMs: number;
    readonly autoUpdate: boolean;
    private readonly layers: Map<string, OverlayLayer> = new Map();
    private readonly dirtyReasons: Set<OverlayInvalidationReason> = new Set(["layout"]);
    private resizeObserver: ResizeObserver | null = null;
    private winResizeListener: (() => void) | null = null;
    private winScrollListener: (() => void) | null = null;
    private rafId: number | null = null;
    private currentCamera: OverlayUpdateRequest["camera"] = null;
    private currentScene: OverlayUpdateRequest["scene"] = null;
    private dpr: number = 1;
    private width: number = 1;
    private height: number = 1;
    private lastLeft: number = Number.NaN;
    private lastTop: number = Number.NaN;
    private lastUpdateMs: number = Number.NaN;
    private interactionActive: boolean = false;
    private pendingInteractionFlush: boolean = false;
    private controlsUnsubChange: (() => void) | null = null;
    private controlsUnsubInteraction: (() => void) | null = null;
    private readonly cameraSigA: Float64Array = new Float64Array(17);
    private readonly cameraSigB: Float64Array = new Float64Array(17);
    private hasCameraSig: boolean = false;

    constructor(desc: OverlaySystemDescriptor) {
        if (typeof document === "undefined") throw new Error("OverlaySystem requires a DOM environment.");
        this.canvas = desc.canvas;
        this.parent = desc.parent ?? this.canvas.parentElement ?? document.body;
        this.interactionThrottleMs = Math.max(0, Math.round(desc.interactionThrottleMs ?? 24));
        this.autoUpdate = desc.autoUpdate ?? true;
        if (this.parent !== document.body && this.parent !== document.documentElement) {
            const cs = getComputedStyle(this.parent);
            if (cs.position === "static") this.parent.style.position = "relative";
        }
        const root = document.createElement("div");
        root.className = desc.className ?? "wasmgpu-overlay-root";
        root.style.position = (this.parent === document.body || this.parent === document.documentElement) ? "fixed" : "absolute";
        root.style.pointerEvents = "none";
        root.style.overflow = "hidden";
        root.style.contain = "layout style paint";
        root.style.left = "0";
        root.style.top = "0";
        root.style.width = "1px";
        root.style.height = "1px";
        root.style.zIndex = String(desc.zIndex ?? 20);
        this.parent.appendChild(root);
        this.root = root;
        this.currentCamera = desc.camera ?? null;
        this.currentScene = desc.scene ?? null;
        this.bindControls(desc.controls ?? null);
        this.setupResizeEvents();
        this.syncRootBounds();
        this.invalidate("layout");
    }

    get layerCount(): number {
        return this.layers.size;
    }

    get isInteractionActive(): boolean {
        return this.interactionActive;
    }

    setView(camera: NonNullable<OverlayUpdateRequest["camera"]>, scene: OverlayUpdateRequest["scene"] = null): this {
        this.currentCamera = camera;
        this.currentScene = scene ?? null;
        this.invalidate("camera");
        return this;
    }

    bindControls(controls: OverlaySystemDescriptor["controls"]): this {
        this.controlsUnsubChange?.();
        this.controlsUnsubInteraction?.();
        this.controlsUnsubChange = null;
        this.controlsUnsubInteraction = null;
        if (!controls) return this;
        const anyControls = controls as any;
        if (typeof anyControls.onChange === "function") this.controlsUnsubChange = anyControls.onChange(() => this.invalidate("camera"));
        if (typeof anyControls.onInteractionState === "function") this.controlsUnsubInteraction = anyControls.onInteractionState((active: boolean) => this.setInteractionActive(active));
        return this;
    }

    addLayer(layer: OverlayLayer): this {
        if (this.layers.has(layer.id)) throw new Error(`OverlaySystem: duplicate layer id '${layer.id}'.`);
        this.layers.set(layer.id, layer);
        layer.setSystem?.(this);
        layer.attach(this.root);
        this.invalidate("manual");
        return this;
    }

    removeLayer(id: string): this {
        const layer = this.layers.get(id);
        if (!layer) return this;
        layer.setSystem?.(null);
        layer.detach();
        this.layers.delete(id);
        this.invalidate("manual");
        return this;
    }

    clearLayers(): this {
        for (const layer of this.layers.values()) {
            layer.setSystem?.(null);
            layer.detach();
        }
        this.layers.clear();
        this.invalidate("manual");
        return this;
    }

    invalidate(reason: OverlayInvalidationReason = "manual"): void {
        this.dirtyReasons.add(reason);
        this.requestFrame();
    }

    setInteractionActive(active: boolean): this {
        if (this.interactionActive === active) return this;
        this.interactionActive = active;
        if (!active) this.pendingInteractionFlush = true;
        this.invalidate("interaction");
        return this;
    }

    update(request: OverlayUpdateRequest = {}): boolean {
        if (request.camera !== undefined) this.currentCamera = request.camera;
        if (request.scene !== undefined) this.currentScene = request.scene;
        addReasons(this.dirtyReasons, request.reasons);
        this.syncRootBounds();
        const camera = this.currentCamera;
        if (!camera) return false;
        const time = request.nowMs ?? nowMs();
        writeCameraSignature(camera, this.cameraSigB);
        if (!this.hasCameraSig || !cameraSignatureEquals(this.cameraSigA, this.cameraSigB, 1e-6)) {
            this.cameraSigA.set(this.cameraSigB);
            this.hasCameraSig = true;
            this.dirtyReasons.add("camera");
        }
        const force = !!request.force;
        if (this.dirtyReasons.size === 0 && !this.pendingInteractionFlush && !force) return false;
        if (this.interactionActive && this.interactionThrottleMs > 0 && !force) if (Number.isFinite(this.lastUpdateMs) && (time - this.lastUpdateMs) < this.interactionThrottleMs) return false;
        const reasons = new Set(this.dirtyReasons);
        if (this.pendingInteractionFlush) reasons.add("interaction");
        for (const layer of this.layers.values()) {
            layer.update({
                camera, scene: this.currentScene ?? null,
                width: this.width, height: this.height, dpr: this.dpr,
                nowMs: time, reasons, root: this.root
            });
        }
        this.lastUpdateMs = time;
        this.pendingInteractionFlush = false;
        this.dirtyReasons.clear();
        return true;
    }

    destroy(): void {
        this.cancelFrame();
        this.controlsUnsubChange?.();
        this.controlsUnsubInteraction?.();
        this.controlsUnsubChange = null;
        this.controlsUnsubInteraction = null;
        if (this.resizeObserver) {
            try { this.resizeObserver.disconnect(); } catch { /* ignore */ }
            this.resizeObserver = null;
        }
        if (this.winResizeListener) window.removeEventListener("resize", this.winResizeListener);
        if (this.winScrollListener) window.removeEventListener("scroll", this.winScrollListener, true);
        this.winResizeListener = null;
        this.winScrollListener = null;
        this.clearLayers();
        this.root.remove();
    }

    private requestFrame(): void {
        if (!this.autoUpdate || this.rafId !== null) return;
        if (typeof requestAnimationFrame !== "function") return;
        this.rafId = requestAnimationFrame(() => {
            this.rafId = null;
            this.update();
        });
    }

    private cancelFrame(): void {
        if (this.rafId === null) return;
        if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.rafId);
        this.rafId = null;
    }

    private setupResizeEvents(): void {
        const onResize = () => {
            this.syncRootBounds();
            this.invalidate("viewport");
        };
        this.winResizeListener = onResize;
        this.winScrollListener = onResize;
        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", onResize, true);
        if (typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver(onResize);
            this.resizeObserver.observe(this.canvas);
        }
    }

    private syncRootBounds(): void {
        const canvasRect = this.canvas.getBoundingClientRect();
        const parentRect = (this.parent === document.body || this.parent === document.documentElement) ? { left: 0, top: 0 } : this.parent.getBoundingClientRect();
        const left = canvasRect.left - parentRect.left + ((this.parent as HTMLElement).scrollLeft ?? 0);
        const top = canvasRect.top - parentRect.top + ((this.parent as HTMLElement).scrollTop ?? 0);
        const width = Math.max(1, Math.round(canvasRect.width || this.canvas.clientWidth || 1));
        const height = Math.max(1, Math.round(canvasRect.height || this.canvas.clientHeight || 1));
        const dpr = Math.max(1, (window.devicePixelRatio || 1));
        const moved = !Number.isFinite(this.lastLeft) || !Number.isFinite(this.lastTop) || Math.abs(left - this.lastLeft) > 0.5 || Math.abs(top - this.lastTop) > 0.5;
        const resized = width !== this.width || height !== this.height || Math.abs(dpr - this.dpr) > 1e-6;
        if (!moved && !resized) return;
        this.lastLeft = left;
        this.lastTop = top;
        this.width = width;
        this.height = height;
        this.dpr = dpr;
        this.root.style.left = `${left}px`;
        this.root.style.top = `${top}px`;
        this.root.style.width = `${width}px`;
        this.root.style.height = `${height}px`;
        this.dirtyReasons.add(moved ? "layout" : "viewport");
    }
}
