/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert } from "../../utils";
import { GlyphField } from "../../world/glyphfield";
import type { Scene } from "../../world/scene";
import type { AnnotationColor, AnnotationMarkerInstance, AnnotationRecord } from "./types";
import { cloneAnnotationAnchor, cloneAnnotationColor } from "./types";

export type AnnotationMarkerRendererDescriptor = {
    glyphField?: GlyphField;
    markerScale?: number | [number, number, number];
    maxInstances?: number;
    keepCPUData?: boolean;
    name?: string;
    shape?: "ellipsoid" | "arrow" | "custom";
};

const resolveMarkerScale = (input: AnnotationMarkerRendererDescriptor["markerScale"]): [number, number, number] => {
    if (Array.isArray(input)) return [Math.max(1e-6, input[0] ?? 1), Math.max(1e-6, input[1] ?? 1), Math.max(1e-6, input[2] ?? 1)];
    const s = Math.max(1e-6, input ?? 0.16);
    return [s, s, s];
};

const pushMarkerInstance = (out: AnnotationMarkerInstance[], id: string, kind: AnnotationMarkerInstance["annotationKind"], role: AnnotationMarkerInstance["role"], anchor: AnnotationMarkerInstance["anchor"], color: AnnotationColor): void => {
    out.push({
        key: `${id}:${role}`,
        annotationId: id,
        annotationKind: kind,
        role,
        anchor: cloneAnnotationAnchor(anchor),
        color: cloneAnnotationColor(color)
    });
};

export const collectAnnotationMarkerInstances = (records: readonly AnnotationRecord[]): AnnotationMarkerInstance[] => {
    const out: AnnotationMarkerInstance[] = [];
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        if (!record.visible) continue;
        if (record.kind === "marker") {
            pushMarkerInstance(out, record.id, record.kind, "marker", record.anchor, record.color);
            continue;
        }
        if (record.kind === "distance") {
            pushMarkerInstance(out, record.id, record.kind, "start", record.start, record.color);
            pushMarkerInstance(out, record.id, record.kind, "end", record.end, record.color);
            continue;
        }
        pushMarkerInstance(out, record.id, record.kind, "a", record.a, record.color);
        pushMarkerInstance(out, record.id, record.kind, "b", record.b, record.color);
        pushMarkerInstance(out, record.id, record.kind, "c", record.c, record.color);
    }
    return out;
};

export class AnnotationMarkerRenderer {
    readonly glyphField: GlyphField;
    readonly maxInstances: number;
    private readonly markerScale: [number, number, number];
    private readonly keepCPUData: boolean;
    private readonly ownsGlyphField: boolean;
    private attachedScene: Scene | null = null;
    private appliedRevision: number = -1;
    private updateCount: number = 0;
    private instances: AnnotationMarkerInstance[] = [];

    constructor(desc: AnnotationMarkerRendererDescriptor = {}) {
        this.markerScale = resolveMarkerScale(desc.markerScale);
        this.maxInstances = Math.max(1, Math.round(desc.maxInstances ?? 4096));
        this.keepCPUData = desc.keepCPUData ?? true;
        this.ownsGlyphField = !desc.glyphField;
        this.glyphField = desc.glyphField ?? new GlyphField({
            shape: desc.shape ?? "ellipsoid",
            instanceCount: 0,
            colorMode: "rgba", lit: false,
            depthWrite: true, depthTest: true,
            keepCPUData: this.keepCPUData,
            name: desc.name ?? "annotation-markers",
            scaleTransform: {
                componentCount: 4, componentIndex: 0,
                valueMode: "component",
                stride: 4, offset: 0,
                mode: "linear", clampMode: "none"
            }
        });
    }

    get revision(): number {
        return this.appliedRevision;
    }

    get syncCount(): number {
        return this.updateCount;
    }

    get instanceCount(): number {
        return this.instances.length;
    }

    attach(scene: Scene): this {
        if (this.attachedScene === scene) return this;
        this.detach();
        scene.add(this.glyphField);
        this.attachedScene = scene;
        return this;
    }

    detach(): this {
        if (this.attachedScene) this.attachedScene.remove(this.glyphField);
        this.attachedScene = null;
        return this;
    }

    destroy(): void {
        this.detach();
        if (this.ownsGlyphField) this.glyphField.destroy();
        this.instances = [];
        this.appliedRevision = -1;
    }

    getInstance(index: number): AnnotationMarkerInstance | null {
        if (!Number.isInteger(index) || index < 0 || index >= this.instances.length) return null;
        const item = this.instances[index];
        return {
            key: item.key,
            annotationId: item.annotationId,
            annotationKind: item.annotationKind,
            role: item.role,
            anchor: cloneAnnotationAnchor(item.anchor),
            color: cloneAnnotationColor(item.color)
        };
    }

    sync(records: readonly AnnotationRecord[], revision: number): boolean {
        assert(Number.isFinite(revision), "AnnotationMarkerRenderer.sync: revision must be finite.");
        if (revision === this.appliedRevision) return false;
        const collected = collectAnnotationMarkerInstances(records);
        const instances = collected.length > this.maxInstances ? collected.slice(0, this.maxInstances) : collected;
        this.instances = instances;
        const count = instances.length;
        if (count <= 0) {
            this.glyphField.setCPUData(null, null, null, null, { instanceCount: 0, keepCPUData: this.keepCPUData });
            this.glyphField.visible = false;
            this.appliedRevision = revision;
            this.updateCount++;
            return true;
        }
        const positions = new Float32Array(count * 4);
        const rotations = new Float32Array(count * 4);
        const scales = new Float32Array(count * 4);
        const attributes = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) {
            const o = i * 4;
            const instance = instances[i];
            positions[o + 0] = instance.anchor.position[0];
            positions[o + 1] = instance.anchor.position[1];
            positions[o + 2] = instance.anchor.position[2];
            positions[o + 3] = 0;
            rotations[o + 0] = 0;
            rotations[o + 1] = 0;
            rotations[o + 2] = 0;
            rotations[o + 3] = 1;
            scales[o + 0] = this.markerScale[0];
            scales[o + 1] = this.markerScale[1];
            scales[o + 2] = this.markerScale[2];
            scales[o + 3] = 0;
            attributes[o + 0] = instance.color[0];
            attributes[o + 1] = instance.color[1];
            attributes[o + 2] = instance.color[2];
            attributes[o + 3] = instance.color[3];
        }
        this.glyphField.visible = true;
        this.glyphField.setCPUData(positions, rotations, scales, attributes, { keepCPUData: this.keepCPUData });
        this.appliedRevision = revision;
        this.updateCount++;
        return true;
    }
}
