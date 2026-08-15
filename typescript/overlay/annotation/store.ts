/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, clamp, nowMs } from "../../utils";
import type { AnnotationAnglePatch, AnnotationAngleRecord, AnnotationAnchor, AnnotationColor, AnnotationDistancePatch, AnnotationDistanceRecord, AnnotationKind, AnnotationMarkerPatch, AnnotationMarkerRecord, AnnotationRecord, AnnotationVec3 } from "./types";
import { cloneAnnotationAnchor, cloneAnnotationColor, cloneAnnotationVec3 } from "./types";

export type AnnotationStoreChangeListener = (revision: number) => void;

export type AnnotationStoreDescriptor = {
    idPrefix?: string;
    nowMs?: () => number;
};

export type AnnotationCreateCommon = {
    label?: string | null;
    visible?: boolean;
    color?: AnnotationColor;
};

const DEFAULT_COLORS: Record<AnnotationKind, AnnotationColor> = {
    marker: [0.9, 0.8, 0.2, 1.0],
    distance: [0.2, 0.8, 1.0, 1.0],
    angle: [1.0, 0.5, 0.2, 1.0]
};

const vecSub = (a: readonly number[], b: readonly number[]): AnnotationVec3 => [(a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0)];

const vecDot = (a: readonly number[], b: readonly number[]): number => ((a[0] ?? 0) * (b[0] ?? 0)) + ((a[1] ?? 0) * (b[1] ?? 0)) + ((a[2] ?? 0) * (b[2] ?? 0));

const vecLen = (v: readonly number[]): number => Math.hypot(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);

const cloneRecord = (record: AnnotationRecord): AnnotationRecord => {
    if (record.kind === "marker") return { ...record, color: cloneAnnotationColor(record.color), anchor: cloneAnnotationAnchor(record.anchor) };
    if (record.kind === "distance") return { ...record, color: cloneAnnotationColor(record.color), start: cloneAnnotationAnchor(record.start), end: cloneAnnotationAnchor(record.end) };
    return { ...record, color: cloneAnnotationColor(record.color), a: cloneAnnotationAnchor(record.a), b: cloneAnnotationAnchor(record.b), c: cloneAnnotationAnchor(record.c) };
};

const normalizedColor = (input: AnnotationColor | undefined, kind: AnnotationKind): AnnotationColor => {
    const source = input ?? DEFAULT_COLORS[kind];
    return [clamp(source[0], 0, 1), clamp(source[1], 0, 1), clamp(source[2], 0, 1), clamp(source[3], 0, 1)];
};

const normalizeLabel = (label: string | null | undefined): string | null => {
    if (label == null) return null;
    const trimmed = `${label}`.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const normalizeVisible = (visible: boolean | undefined): boolean => visible === undefined ? true : !!visible;

export const computeDistanceWorld = (a: readonly number[], b: readonly number[]): number => {
    const dx = (a[0] ?? 0) - (b[0] ?? 0);
    const dy = (a[1] ?? 0) - (b[1] ?? 0);
    const dz = (a[2] ?? 0) - (b[2] ?? 0);
    return Math.hypot(dx, dy, dz);
};

export const computeAngleRadians = (a: readonly number[], b: readonly number[], c: readonly number[]): number => {
    const ba = vecSub(a, b);
    const bc = vecSub(c, b);
    const lenBA = vecLen(ba);
    const lenBC = vecLen(bc);
    if (lenBA <= 1e-12 || lenBC <= 1e-12) return 0;
    const cos = clamp(vecDot(ba, bc) / (lenBA * lenBC), -1, 1);
    return Math.acos(cos);
};

export const createAnnotationAnchor = (position: readonly number[], pick: AnnotationAnchor["pick"] = null): AnnotationAnchor => {
    return { position: cloneAnnotationVec3(position), pick: pick ? { ...pick, ndIndex: pick.ndIndex ? pick.ndIndex.slice() : null, attributes: pick.attributes ? { ...pick.attributes, vector: pick.attributes.vector ? [...pick.attributes.vector] as [number, number, number, number] : null, packedPoint: pick.attributes.packedPoint ? [...pick.attributes.packedPoint] as [number, number, number, number] : null } : null } : null };
};

export class AnnotationStore {
    private readonly records: Map<string, AnnotationRecord> = new Map();
    private readonly order: string[] = [];
    private readonly listeners: Set<AnnotationStoreChangeListener> = new Set();
    private readonly nowMs: () => number;
    private readonly idPrefix: string;
    private idCounter: number = 1;
    private _revision: number = 0;

    constructor(desc: AnnotationStoreDescriptor = {}) {
        this.nowMs = desc.nowMs ?? nowMs;
        this.idPrefix = `${desc.idPrefix ?? "ann"}`.trim();
    }

    get size(): number {
        return this.order.length;
    }

    get revision(): number {
        return this._revision;
    }

    onChange(listener: AnnotationStoreChangeListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    has(id: string): boolean {
        return this.records.has(id);
    }

    ids(): string[] {
        return this.order.slice();
    }

    get(id: string): AnnotationRecord | null {
        const record = this.records.get(id);
        return record ? cloneRecord(record) : null;
    }

    values(): AnnotationRecord[] {
        const out: AnnotationRecord[] = new Array(this.order.length);
        for (let i = 0; i < this.order.length; i++) out[i] = cloneRecord(this.records.get(this.order[i])!);
        return out;
    }

    clear(): this {
        if (this.records.size === 0) return this;
        this.records.clear();
        this.order.length = 0;
        this.bumpRevision();
        return this;
    }

    createMarker(anchor: AnnotationAnchor, opts: AnnotationCreateCommon = {}): AnnotationMarkerRecord {
        const now = this.nowMs();
        const record: AnnotationMarkerRecord = {
            id: this.nextId("marker"), kind: "marker",
            label: normalizeLabel(opts.label),
            visible: normalizeVisible(opts.visible),
            color: normalizedColor(opts.color, "marker"),
            createdAtMs: now, updatedAtMs: now,
            anchor: cloneAnnotationAnchor(anchor)
        };
        this.push(record);
        return cloneRecord(record) as AnnotationMarkerRecord;
    }

    createDistance(start: AnnotationAnchor, end: AnnotationAnchor, opts: AnnotationCreateCommon = {}): AnnotationDistanceRecord {
        const now = this.nowMs();
        const s = cloneAnnotationAnchor(start);
        const e = cloneAnnotationAnchor(end);
        const record: AnnotationDistanceRecord = {
            id: this.nextId("distance"), kind: "distance",
            label: normalizeLabel(opts.label),
            visible: normalizeVisible(opts.visible),
            color: normalizedColor(opts.color, "distance"),
            createdAtMs: now, updatedAtMs: now,
            start: s, end: e,
            distanceWorld: computeDistanceWorld(s.position, e.position)
        };
        this.push(record);
        return cloneRecord(record) as AnnotationDistanceRecord;
    }

    createAngle(a: AnnotationAnchor, b: AnnotationAnchor, c: AnnotationAnchor, opts: AnnotationCreateCommon = {}): AnnotationAngleRecord {
        const now = this.nowMs();
        const p0 = cloneAnnotationAnchor(a);
        const p1 = cloneAnnotationAnchor(b);
        const p2 = cloneAnnotationAnchor(c);
        const record: AnnotationAngleRecord = {
            id: this.nextId("angle"), kind: "angle",
            label: normalizeLabel(opts.label),
            visible: normalizeVisible(opts.visible),
            color: normalizedColor(opts.color, "angle"),
            createdAtMs: now, updatedAtMs: now,
            a: p0, b: p1, c: p2,
            angleRadians: computeAngleRadians(p0.position, p1.position, p2.position)
        };
        this.push(record);
        return cloneRecord(record) as AnnotationAngleRecord;
    }

    updateMarker(id: string, patch: AnnotationMarkerPatch): AnnotationMarkerRecord | null {
        const record = this.records.get(id);
        if (!record || record.kind !== "marker") return null;
        this.applyCommonPatch(record, patch);
        if (patch.anchor) record.anchor = cloneAnnotationAnchor(patch.anchor);
        record.updatedAtMs = this.nowMs();
        this.bumpRevision();
        return cloneRecord(record) as AnnotationMarkerRecord;
    }

    updateDistance(id: string, patch: AnnotationDistancePatch): AnnotationDistanceRecord | null {
        const record = this.records.get(id);
        if (!record || record.kind !== "distance") return null;
        this.applyCommonPatch(record, patch);
        if (patch.start) record.start = cloneAnnotationAnchor(patch.start);
        if (patch.end) record.end = cloneAnnotationAnchor(patch.end);
        record.distanceWorld = computeDistanceWorld(record.start.position, record.end.position);
        record.updatedAtMs = this.nowMs();
        this.bumpRevision();
        return cloneRecord(record) as AnnotationDistanceRecord;
    }

    updateAngle(id: string, patch: AnnotationAnglePatch): AnnotationAngleRecord | null {
        const record = this.records.get(id);
        if (!record || record.kind !== "angle") return null;
        this.applyCommonPatch(record, patch);
        if (patch.a) record.a = cloneAnnotationAnchor(patch.a);
        if (patch.b) record.b = cloneAnnotationAnchor(patch.b);
        if (patch.c) record.c = cloneAnnotationAnchor(patch.c);
        record.angleRadians = computeAngleRadians(record.a.position, record.b.position, record.c.position);
        record.updatedAtMs = this.nowMs();
        this.bumpRevision();
        return cloneRecord(record) as AnnotationAngleRecord;
    }

    remove(id: string): boolean {
        const existed = this.records.delete(id);
        if (!existed) return false;
        const idx = this.order.indexOf(id);
        if (idx !== -1) this.order.splice(idx, 1);
        this.bumpRevision();
        return true;
    }

    private push(record: AnnotationRecord): void {
        assert(!this.records.has(record.id), `AnnotationStore: duplicate id '${record.id}'.`);
        this.records.set(record.id, record);
        this.order.push(record.id);
        this.bumpRevision();
    }

    private applyCommonPatch(record: AnnotationRecord, patch: { label?: string | null; color?: AnnotationColor; visible?: boolean; }): void {
        if (patch.label !== undefined) record.label = normalizeLabel(patch.label);
        if (patch.color !== undefined) record.color = normalizedColor(patch.color, record.kind);
        if (patch.visible !== undefined) record.visible = !!patch.visible;
    }

    private nextId(kind: AnnotationKind): string {
        const token = String(this.idCounter++).padStart(6, "0");
        const prefix = this.idPrefix.length > 0 ? `${this.idPrefix}-` : "";
        return `${prefix}${kind}-${token}`;
    }

    private bumpRevision(): void {
        this._revision++;
        for (const listener of this.listeners) try { listener(this._revision); } catch { /* ignore */ }
    }
}
