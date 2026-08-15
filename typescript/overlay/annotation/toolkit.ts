/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { OverlaySystemDescriptor } from "../types";
import type { OverlaySystem } from "../system";
import type { Camera } from "../../world/camera";
import type { NavigationControls } from "../../world/controls";
import type { PickHit, PickQuery, PickResult } from "../../world/picking";
import type { Scene } from "../../world/scene";
import { AnnotationLabelLayer, type AnnotationLabelLayerDescriptor } from "./labelLayer";
import { AnnotationMarkerRenderer, type AnnotationMarkerRendererDescriptor } from "./markerRenderer";
import { AnnotationStore } from "./store";
import type { AnnotationAnchor, AnnotationKind, AnnotationLabelEntry, AnnotationMode, AnnotationProbeReadout, AnnotationRecord, AnnotationSelectionReadout, AnnotationUnitsDescriptor, AnnotationVec3 } from "./types";
import { AnnotationMode as AnnotationModeValues, annotationAnchorFromHit, colorToCssRgba } from "./types";
import { formatAngleRadians, formatDistanceWorld, resolveAnnotationUnits, type ResolvedAnnotationUnits } from "./units";

export type AnnotationToolkitRuntime = {
    pick: (scene: Scene, camera: Camera, x: number, y: number, opts?: PickQuery) => Promise<PickResult | null>;
    createOverlay?: {
        system: (options?: Omit<OverlaySystemDescriptor, "canvas">) => OverlaySystem;
    };
};

export type AnnotationToolkitDescriptor = {
    scene?: Scene | null;
    camera?: Camera | null;
    controls?: NavigationControls | null;
    overlaySystem?: OverlaySystem | null;
    canvas?: HTMLCanvasElement | null;
    pointerTarget?: HTMLElement | null;
    autoBindPointerEvents?: boolean;
    autoCreateOverlay?: boolean;
    overlaySystemOptions?: Omit<OverlaySystemDescriptor, "canvas" | "camera" | "scene" | "controls">;
    markerRenderer?: AnnotationMarkerRendererDescriptor;
    labelLayer?: AnnotationLabelLayerDescriptor;
    units?: AnnotationUnitsDescriptor;
    storeIdPrefix?: string;
};

export type AnnotationAttachDescriptor = {
    scene: Scene;
    camera: Camera;
    controls?: NavigationControls | null;
    overlaySystem?: OverlaySystem | null;
    pointerTarget?: HTMLElement | null;
};

export type AnnotationChangeListener = (records: AnnotationRecord[], revision: number) => void;

export type AnnotationModeListener = (mode: AnnotationMode) => void;

export type AnnotationReadoutListener<T> = (readout: T) => void;

export type AnnotationStagingListener = (mode: AnnotationMode, pending: readonly AnnotationAnchor[]) => void;

type AnnotationSelectionMeta = {
    annotationId: string | null;
    annotationKind: AnnotationKind | null;
    anchorRole: AnnotationSelectionReadout["anchorRole"];
};

let TOOLKIT_ID = 1;

const midpoint = (a: readonly number[], b: readonly number[]): AnnotationVec3 => [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5];

const clonePickAttributesLocal = (attributes: PickHit["attributes"]): PickHit["attributes"] => {
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

const probeReadoutFromHit = (hit: PickResult | null): AnnotationProbeReadout => {
    if (!hit) {
        return {
            hit: false,
            kind: null,
            objectId: null,
            elementIndex: null,
            worldPosition: null,
            ndIndex: null,
            attributes: null
        };
    }
    return {
        hit: true,
        kind: hit.kind,
        objectId: hit.objectId,
        elementIndex: hit.elementIndex,
        worldPosition: [hit.worldPosition[0], hit.worldPosition[1], hit.worldPosition[2]],
        ndIndex: hit.ndIndex ? hit.ndIndex.slice() : null,
        attributes: clonePickAttributesLocal(hit.attributes)
    };
};

const selectionReadoutFromHit = (hit: PickResult | null, meta: AnnotationSelectionMeta): AnnotationSelectionReadout => {
    const probe = probeReadoutFromHit(hit);
    return {
        ...probe,
        annotationId: meta.annotationId,
        annotationKind: meta.annotationKind,
        anchorRole: meta.anchorRole
    };
};

const clonePending = (pending: readonly AnnotationAnchor[]): AnnotationAnchor[] => {
    const out: AnnotationAnchor[] = new Array(pending.length);
    for (let i = 0; i < pending.length; i++) {
        const src = pending[i];
        out[i] = {
            position: [src.position[0], src.position[1], src.position[2]],
            pick: src.pick ? {
                kind: src.pick.kind,
                objectId: src.pick.objectId,
                elementIndex: src.pick.elementIndex,
                ndIndex: src.pick.ndIndex ? src.pick.ndIndex.slice() : null,
                attributes: clonePickAttributesLocal(src.pick.attributes)
            } : null
        };
    }
    return out;
};

const buildLabelEntries = (records: readonly AnnotationRecord[], units: AnnotationUnitsDescriptor): AnnotationLabelEntry[] => {
    const out: AnnotationLabelEntry[] = [];
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        if (!record.visible) continue;
        if (record.kind === "marker") {
            out.push({
                key: record.id,
                text: record.label ?? record.id,
                color: colorToCssRgba(record.color),
                position: [record.anchor.position[0], record.anchor.position[1], record.anchor.position[2]]
            });
            continue;
        }
        if (record.kind === "distance") {
            const metric = formatDistanceWorld(record.distanceWorld, units);
            const text = record.label ? `${record.label}: ${metric.text}` : metric.text;
            out.push({
                key: record.id,
                text,
                color: colorToCssRgba(record.color),
                position: midpoint(record.start.position, record.end.position)
            });
            continue;
        }
        const metric = formatAngleRadians(record.angleRadians, units);
        const text = record.label ? `${record.label}: ${metric.text}` : metric.text;
        out.push({
            key: record.id,
            text,
            color: colorToCssRgba(record.color),
            position: [record.b.position[0], record.b.position[1], record.b.position[2]]
        });
    }
    return out;
};

export class AnnotationToolkit {
    readonly store: AnnotationStore;
    readonly markerRenderer: AnnotationMarkerRenderer;
    readonly labelLayer: AnnotationLabelLayer;
    private readonly runtime: AnnotationToolkitRuntime;
    private readonly annotationsListeners: Set<AnnotationChangeListener> = new Set();
    private readonly modeListeners: Set<AnnotationModeListener> = new Set();
    private readonly hoverListeners: Set<AnnotationReadoutListener<AnnotationProbeReadout>> = new Set();
    private readonly selectionListeners: Set<AnnotationReadoutListener<AnnotationSelectionReadout>> = new Set();
    private readonly stagingListeners: Set<AnnotationStagingListener> = new Set();
    private readonly autoCreateOverlay: boolean;
    private readonly overlaySystemOptions: Omit<OverlaySystemDescriptor, "canvas" | "camera" | "scene" | "controls">;
    private modeValue: AnnotationMode = AnnotationModeValues.Idle;
    private unitsValue: AnnotationUnitsDescriptor;
    private scene: Scene | null = null;
    private camera: Camera | null = null;
    private controls: NavigationControls | null = null;
    private overlaySystem: OverlaySystem | null = null;
    private ownsOverlaySystem: boolean = false;
    private canvas: HTMLCanvasElement | null = null;
    private pointerTarget: HTMLElement | null = null;
    private hoverReadout: AnnotationProbeReadout = probeReadoutFromHit(null);
    private selectionReadout: AnnotationSelectionReadout = selectionReadoutFromHit(null, { annotationId: null, annotationKind: null, anchorRole: null });
    private pendingAnchors: AnnotationAnchor[] = [];
    private boundPointerEvents: boolean = false;
    private autoBindPointerEvents: boolean;
    private hoverPickToken: number = 0;
    private clickPickToken: number = 0;

    constructor(runtime: AnnotationToolkitRuntime, desc: AnnotationToolkitDescriptor = {}) {
        this.runtime = runtime;
        const toolkitId = TOOLKIT_ID++;
        this.store = new AnnotationStore({ idPrefix: desc.storeIdPrefix ?? `ann${toolkitId}` });
        this.markerRenderer = new AnnotationMarkerRenderer({
            ...desc.markerRenderer,
            name: desc.markerRenderer?.name ?? `annotation-markers-${toolkitId}`
        });
        this.labelLayer = new AnnotationLabelLayer({
            ...desc.labelLayer,
            id: desc.labelLayer?.id ?? `annotation-label-layer-${toolkitId}`
        });
        this.autoBindPointerEvents = desc.autoBindPointerEvents ?? true;
        this.autoCreateOverlay = desc.autoCreateOverlay ?? true;
        this.overlaySystemOptions = desc.overlaySystemOptions ?? {};
        this.unitsValue = desc.units ?? {};
        this.controls = desc.controls ?? null;
        this.canvas = desc.canvas ?? null;
        this.pointerTarget = desc.pointerTarget ?? this.canvas;
        if (desc.overlaySystem) {
            this.overlaySystem = desc.overlaySystem;
            this.ownsOverlaySystem = false;
        }
        this.store.onChange(() => this.handleStoreChanged());
        this.labelLayer.setHoverReadout(this.hoverReadout);
        this.labelLayer.setSelectionReadout(this.selectionReadout);
        if (desc.scene && desc.camera) this.attach({ scene: desc.scene, camera: desc.camera, controls: this.controls, overlaySystem: this.overlaySystem, pointerTarget: this.pointerTarget });
    }

    get mode(): AnnotationMode {
        return this.modeValue;
    }

    get units(): ResolvedAnnotationUnits {
        return resolveAnnotationUnits(this.unitsValue);
    }

    get revision(): number {
        return this.store.revision;
    }

    get pendingCount(): number {
        return this.pendingAnchors.length;
    }

    get hoverProbe(): AnnotationProbeReadout {
        return { ...this.hoverReadout, worldPosition: this.hoverReadout.worldPosition ? [this.hoverReadout.worldPosition[0], this.hoverReadout.worldPosition[1], this.hoverReadout.worldPosition[2]] : null, ndIndex: this.hoverReadout.ndIndex ? this.hoverReadout.ndIndex.slice() : null, attributes: clonePickAttributesLocal(this.hoverReadout.attributes) };
    }

    get selectionProbe(): AnnotationSelectionReadout {
        return { ...this.selectionReadout, worldPosition: this.selectionReadout.worldPosition ? [this.selectionReadout.worldPosition[0], this.selectionReadout.worldPosition[1], this.selectionReadout.worldPosition[2]] : null, ndIndex: this.selectionReadout.ndIndex ? this.selectionReadout.ndIndex.slice() : null, attributes: clonePickAttributesLocal(this.selectionReadout.attributes) };
    }

    onAnnotationsChange(listener: AnnotationChangeListener): () => void {
        this.annotationsListeners.add(listener);
        return () => this.annotationsListeners.delete(listener);
    }

    onModeChange(listener: AnnotationModeListener): () => void {
        this.modeListeners.add(listener);
        return () => this.modeListeners.delete(listener);
    }

    onHoverReadout(listener: AnnotationReadoutListener<AnnotationProbeReadout>): () => void {
        this.hoverListeners.add(listener);
        return () => this.hoverListeners.delete(listener);
    }

    onSelectionReadout(listener: AnnotationReadoutListener<AnnotationSelectionReadout>): () => void {
        this.selectionListeners.add(listener);
        return () => this.selectionListeners.delete(listener);
    }

    onStagingChange(listener: AnnotationStagingListener): () => void {
        this.stagingListeners.add(listener);
        return () => this.stagingListeners.delete(listener);
    }

    setUnits(units: AnnotationUnitsDescriptor): this {
        this.unitsValue = units;
        this.handleStoreChanged();
        return this;
    }

    setMode(mode: AnnotationMode): this {
        if (mode === this.modeValue) return this;
        this.modeValue = mode;
        this.clearPending();
        for (const listener of this.modeListeners) try { listener(this.modeValue); } catch { /* ignore */ }
        return this;
    }

    cancel(): this {
        this.modeValue = AnnotationModeValues.Idle;
        this.clearPending();
        for (const listener of this.modeListeners) try { listener(this.modeValue); } catch { /* ignore */ }
        return this;
    }

    attach(desc: AnnotationAttachDescriptor): this {
        this.scene = desc.scene;
        this.camera = desc.camera;
        if (desc.controls !== undefined) this.controls = desc.controls ?? null;
        if (desc.pointerTarget !== undefined) this.pointerTarget = desc.pointerTarget ?? this.pointerTarget;
        if (desc.overlaySystem !== undefined) {
            this.detachOverlayLayer();
            this.overlaySystem = desc.overlaySystem ?? null;
            this.ownsOverlaySystem = false;
        }
        this.markerRenderer.attach(this.scene);
        this.ensureOverlaySystem();
        this.ensureOverlayLayer();
        this.overlaySystem?.setView(this.camera, this.scene);
        this.handleStoreChanged();
        if (this.autoBindPointerEvents) this.bindPointerEvents();
        return this;
    }

    setView(camera: Camera, scene: Scene | null = this.scene): this {
        this.camera = camera;
        if (scene) this.scene = scene;
        if (this.scene) this.markerRenderer.attach(this.scene);
        this.overlaySystem?.setView(this.camera, this.scene);
        this.overlaySystem?.invalidate("camera");
        return this;
    }

    detach(): this {
        this.unbindPointerEvents();
        this.detachOverlayLayer();
        if (this.ownsOverlaySystem) this.overlaySystem?.destroy();
        this.overlaySystem = null;
        this.ownsOverlaySystem = false;
        this.markerRenderer.detach();
        this.scene = null;
        this.camera = null;
        this.clearPending();
        this.hoverPickToken++;
        this.clickPickToken++;
        this.setHoverReadout(probeReadoutFromHit(null));
        this.setSelectionReadout(selectionReadoutFromHit(null, { annotationId: null, annotationKind: null, anchorRole: null }));
        return this;
    }

    destroy(): void {
        this.detach();
        this.markerRenderer.destroy();
    }

    bindPointerTarget(target: HTMLElement | null): this {
        this.unbindPointerEvents();
        this.pointerTarget = target;
        if (this.autoBindPointerEvents) this.bindPointerEvents();
        return this;
    }

    setAutoBindPointerEvents(enabled: boolean): this {
        this.autoBindPointerEvents = !!enabled;
        if (!this.autoBindPointerEvents) this.unbindPointerEvents();
        else this.bindPointerEvents();
        return this;
    }

    getAnnotations(): AnnotationRecord[] {
        return this.store.values();
    }

    createMarker(anchor: AnnotationAnchor, opts: { label?: string | null; color?: [number, number, number, number]; visible?: boolean } = {}): AnnotationRecord {
        return this.store.createMarker(anchor, opts);
    }

    createDistance(start: AnnotationAnchor, end: AnnotationAnchor, opts: { label?: string | null; color?: [number, number, number, number]; visible?: boolean } = {}): AnnotationRecord {
        return this.store.createDistance(start, end, opts);
    }

    createAngle(a: AnnotationAnchor, b: AnnotationAnchor, c: AnnotationAnchor, opts: { label?: string | null; color?: [number, number, number, number]; visible?: boolean } = {}): AnnotationRecord {
        return this.store.createAngle(a, b, c, opts);
    }

    updateAnnotation(id: string, patch: any): AnnotationRecord | null {
        const current = this.store.get(id);
        if (!current) return null;
        if (current.kind === "marker") return this.store.updateMarker(id, patch);
        if (current.kind === "distance") return this.store.updateDistance(id, patch);
        return this.store.updateAngle(id, patch);
    }

    removeAnnotation(id: string): boolean {
        return this.store.remove(id);
    }

    removeSelectionAnnotation(): boolean {
        const annotationId = this.selectionReadout.annotationId;
        if (!annotationId) return false;
        return this.store.remove(annotationId);
    }

    clearAnnotations(): this {
        this.store.clear();
        return this;
    }

    ingestHoverHit(hit: PickResult | null): AnnotationProbeReadout {
        const readout = probeReadoutFromHit(hit);
        this.setHoverReadout(readout);
        return readout;
    }

    ingestSelectionHit(hit: PickHit | null): AnnotationRecord | null {
        const meta = this.resolveSelectionMeta(hit);
        this.setSelectionReadout(selectionReadoutFromHit(hit, meta));
        if (!hit) {
            if (this.modeValue === AnnotationModeValues.Idle) this.clearPending();
            return null;
        }
        if (this.modeValue === AnnotationModeValues.Marker) return this.store.createMarker(annotationAnchorFromHit(hit));
        if (this.modeValue === AnnotationModeValues.Distance) {
            this.pendingAnchors.push(annotationAnchorFromHit(hit));
            this.emitStaging();
            if (this.pendingAnchors.length < 2) return null;
            const record = this.store.createDistance(this.pendingAnchors[0], this.pendingAnchors[1]);
            this.clearPending();
            return record;
        }
        if (this.modeValue === AnnotationModeValues.Angle) {
            this.pendingAnchors.push(annotationAnchorFromHit(hit));
            this.emitStaging();
            if (this.pendingAnchors.length < 3) return null;
            const record = this.store.createAngle(this.pendingAnchors[0], this.pendingAnchors[1], this.pendingAnchors[2]);
            this.clearPending();
            return record;
        }
        this.clearPending();
        return null;
    }

    async pickHoverAt(x: number, y: number): Promise<AnnotationProbeReadout> {
        const scene = this.scene;
        const camera = this.camera;
        if (!scene || !camera) return this.ingestHoverHit(null);
        const token = ++this.hoverPickToken;
        try {
            const hit = await this.runtime.pick(scene, camera, x, y, { includeAttributes: true });
            if (token !== this.hoverPickToken) return this.hoverProbe;
            return this.ingestHoverHit(hit);
        } catch {
            if (token !== this.hoverPickToken) return this.hoverProbe;
            return this.ingestHoverHit(null);
        }
    }

    async pickAtAndCommit(x: number, y: number): Promise<AnnotationRecord | null> {
        const scene = this.scene;
        const camera = this.camera;
        if (!scene || !camera) return this.ingestSelectionHit(null);
        const token = ++this.clickPickToken;
        try {
            const hit = await this.runtime.pick(scene, camera, x, y, { includeAttributes: true });
            if (token !== this.clickPickToken) return null;
            return this.ingestSelectionHit(hit);
        } catch {
            if (token !== this.clickPickToken) return null;
            return this.ingestSelectionHit(null);
        }
    }

    private handleStoreChanged(): void {
        const records = this.store.values();
        this.markerRenderer.sync(records, this.store.revision);
        this.labelLayer.setEntries(buildLabelEntries(records, this.unitsValue), this.store.revision);
        this.overlaySystem?.invalidate("manual");
        for (const listener of this.annotationsListeners) try { listener(records, this.store.revision); } catch { /* ignore */ }
    }

    private ensureOverlaySystem(): void {
        if (this.overlaySystem) return;
        if (!this.autoCreateOverlay) return;
        if (!this.runtime.createOverlay || !this.camera) return;
        this.overlaySystem = this.runtime.createOverlay.system({
            controls: this.controls ?? undefined,
            camera: this.camera,
            scene: this.scene,
            autoUpdate: true,
            ...this.overlaySystemOptions
        });
        this.ownsOverlaySystem = true;
    }

    private ensureOverlayLayer(): void {
        if (!this.overlaySystem) return;
        this.overlaySystem.removeLayer(this.labelLayer.id);
        this.overlaySystem.addLayer(this.labelLayer);
    }

    private detachOverlayLayer(): void {
        if (!this.overlaySystem) return;
        this.overlaySystem.removeLayer(this.labelLayer.id);
    }

    private setHoverReadout(readout: AnnotationProbeReadout): void {
        this.hoverReadout = readout;
        this.labelLayer.setHoverReadout(readout);
        for (const listener of this.hoverListeners) try { listener(this.hoverProbe); } catch { /* ignore */ }
    }

    private setSelectionReadout(readout: AnnotationSelectionReadout): void {
        this.selectionReadout = readout;
        this.labelLayer.setSelectionReadout(readout);
        for (const listener of this.selectionListeners) try { listener(this.selectionProbe); } catch { /* ignore */ }
    }

    private resolveSelectionMeta(hit: PickHit | null): AnnotationSelectionMeta {
        if (!hit) return { annotationId: null, annotationKind: null, anchorRole: null };
        if (hit.kind !== "glyphfield" || hit.object !== this.markerRenderer.glyphField) return { annotationId: null, annotationKind: null, anchorRole: null };
        const marker = this.markerRenderer.getInstance(hit.elementIndex);
        if (!marker) return { annotationId: null, annotationKind: null, anchorRole: null };
        return {
            annotationId: marker.annotationId,
            annotationKind: marker.annotationKind,
            anchorRole: marker.role
        };
    }

    private clearPending(): void {
        if (this.pendingAnchors.length === 0) return;
        this.pendingAnchors.length = 0;
        this.emitStaging();
    }

    private emitStaging(): void {
        const pending = clonePending(this.pendingAnchors);
        for (const listener of this.stagingListeners) try { listener(this.modeValue, pending); } catch { /* ignore */ }
    }

    private bindPointerEvents(): void {
        if (this.boundPointerEvents || !this.pointerTarget) return;
        this.pointerTarget.addEventListener("pointermove", this.onPointerMove as EventListener);
        this.pointerTarget.addEventListener("pointerleave", this.onPointerLeave as EventListener);
        this.pointerTarget.addEventListener("click", this.onClick as EventListener);
        this.boundPointerEvents = true;
    }

    private unbindPointerEvents(): void {
        if (!this.boundPointerEvents || !this.pointerTarget) return;
        this.pointerTarget.removeEventListener("pointermove", this.onPointerMove as EventListener);
        this.pointerTarget.removeEventListener("pointerleave", this.onPointerLeave as EventListener);
        this.pointerTarget.removeEventListener("click", this.onClick as EventListener);
        this.boundPointerEvents = false;
    }

    private clientToLocal(clientX: number, clientY: number): { x: number; y: number } {
        const rect = this.pointerTarget?.getBoundingClientRect();
        if (!rect) return { x: clientX, y: clientY };
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    private onPointerMove = (event: PointerEvent): void => {
        if (!this.scene || !this.camera) return;
        const { x, y } = this.clientToLocal(event.clientX, event.clientY);
        void this.pickHoverAt(x, y);
    };

    private onPointerLeave = (): void => {
        this.hoverPickToken++;
        this.ingestHoverHit(null);
    };

    private onClick = (event: MouseEvent): void => {
        if (event.button !== 0) return;
        if (!this.scene || !this.camera) return;
        const { x, y } = this.clientToLocal(event.clientX, event.clientY);
        void this.pickAtAndCommit(x, y);
    };
}

export const mapAnnotationProbeReadout = probeReadoutFromHit;
