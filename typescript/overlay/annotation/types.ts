/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { PickAttributes, PickHit, PickKind } from "../../world/picking";

export const AnnotationMode = { Idle: "idle", Marker: "marker", Distance: "distance", Angle: "angle" } as const;
export type AnnotationMode = (typeof AnnotationMode)[keyof typeof AnnotationMode];

export const AnnotationKind = { Marker: "marker", Distance: "distance", Angle: "angle" } as const;
export type AnnotationKind = (typeof AnnotationKind)[keyof typeof AnnotationKind];

export type AnnotationAnchorRole = "marker" | "start" | "end" | "a" | "b" | "c";

export const AnnotationAngleUnit = { Degrees: "deg", Radians: "rad" } as const;
export type AnnotationAngleUnit = (typeof AnnotationAngleUnit)[keyof typeof AnnotationAngleUnit];

export type AnnotationUnitsDescriptor = {
    worldUnitsPerUnit?: number;
    symbol?: string;
    decimals?: number;
    autoMetric?: boolean;
    angleUnit?: AnnotationAngleUnit;
    angleDecimals?: number;
};

export type AnnotationColor = [number, number, number, number];
export type AnnotationVec3 = [number, number, number];

export type AnnotationPickPayload = {
    kind: PickKind;
    objectId: number;
    elementIndex: number;
    ndIndex: number[] | null;
    attributes: PickAttributes | null;
};

export type AnnotationAnchor = {
    position: AnnotationVec3;
    pick: AnnotationPickPayload | null;
};

export type AnnotationRecordBase = {
    id: string;
    kind: AnnotationKind;
    label: string | null;
    color: AnnotationColor;
    visible: boolean;
    createdAtMs: number;
    updatedAtMs: number;
};

export type AnnotationMarkerRecord = AnnotationRecordBase & {
    kind: "marker";
    anchor: AnnotationAnchor;
};

export type AnnotationDistanceRecord = AnnotationRecordBase & {
    kind: "distance";
    start: AnnotationAnchor;
    end: AnnotationAnchor;
    distanceWorld: number;
};

export type AnnotationAngleRecord = AnnotationRecordBase & {
    kind: "angle";
    a: AnnotationAnchor;
    b: AnnotationAnchor;
    c: AnnotationAnchor;
    angleRadians: number;
};

export type AnnotationRecord = AnnotationMarkerRecord | AnnotationDistanceRecord | AnnotationAngleRecord;

export type AnnotationMarkerPatch = Partial<Pick<AnnotationMarkerRecord, "label" | "color" | "visible" | "anchor">>;

export type AnnotationDistancePatch = Partial<Pick<AnnotationDistanceRecord, "label" | "color" | "visible" | "start" | "end">>;

export type AnnotationAnglePatch = Partial<Pick<AnnotationAngleRecord, "label" | "color" | "visible" | "a" | "b" | "c">>;

export type AnnotationProbeReadout = {
    hit: boolean;
    kind: PickKind | null;
    objectId: number | null;
    elementIndex: number | null;
    worldPosition: AnnotationVec3 | null;
    ndIndex: number[] | null;
    attributes: PickAttributes | null;
};

export type AnnotationSelectionReadout = AnnotationProbeReadout & {
    annotationId: string | null;
    annotationKind: AnnotationKind | null;
    anchorRole: AnnotationAnchorRole | null;
};

export type AnnotationLabelEntry = {
    key: string;
    text: string;
    color: string;
    position: AnnotationVec3;
};

export type AnnotationMarkerInstance = {
    key: string;
    annotationId: string;
    annotationKind: AnnotationKind;
    role: AnnotationAnchorRole;
    anchor: AnnotationAnchor;
    color: AnnotationColor;
};

export const cloneAnnotationColor = (color: AnnotationColor): AnnotationColor => [color[0], color[1], color[2], color[3]];

export const cloneAnnotationVec3 = (v: readonly number[]): AnnotationVec3 => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];

export const clonePickAttributes = (attributes: PickAttributes | null): PickAttributes | null => {
    if (!attributes) return null;
    return {
        scalar: attributes.scalar ?? null,
        vector: attributes.vector ? [attributes.vector[0], attributes.vector[1], attributes.vector[2], attributes.vector[3]] : null,
        packedPoint: attributes.packedPoint ? [attributes.packedPoint[0], attributes.packedPoint[1], attributes.packedPoint[2], attributes.packedPoint[3]] : null,
        component: attributes.component ?? null,
        componentIndex: attributes.componentIndex ?? null,
        color: attributes.color ? [attributes.color[0], attributes.color[1], attributes.color[2], attributes.color[3]] : null,
        edgeEndpoints: attributes.edgeEndpoints ? [attributes.edgeEndpoints[0], attributes.edgeEndpoints[1]] : null,
        edgePositions: attributes.edgePositions ? [
            attributes.edgePositions[0], attributes.edgePositions[1], attributes.edgePositions[2],
            attributes.edgePositions[3], attributes.edgePositions[4], attributes.edgePositions[5]
        ] : null
    };
};

export const clonePickPayload = (pick: AnnotationPickPayload | null): AnnotationPickPayload | null => {
    if (!pick) return null;
    return {
        kind: pick.kind, objectId: pick.objectId,
        elementIndex: pick.elementIndex, ndIndex: pick.ndIndex ? pick.ndIndex.slice() : null,
        attributes: clonePickAttributes(pick.attributes)
    };
};

export const cloneAnnotationAnchor = (anchor: AnnotationAnchor): AnnotationAnchor => {
    return {
        position: cloneAnnotationVec3(anchor.position),
        pick: clonePickPayload(anchor.pick)
    };
};

export const annotationAnchorFromHit = (hit: PickHit): AnnotationAnchor => {
    return {
        position: cloneAnnotationVec3(hit.worldPosition),
        pick: {
            kind: hit.kind, objectId: hit.objectId,
            elementIndex: hit.elementIndex, ndIndex: hit.ndIndex ? hit.ndIndex.slice() : null,
            attributes: clonePickAttributes(hit.attributes)
        }
    };
};

export const colorToCssRgba = (color: AnnotationColor): string => {
    const r = Math.max(0, Math.min(255, Math.round(color[0] * 255)));
    const g = Math.max(0, Math.min(255, Math.round(color[1] * 255)));
    const b = Math.max(0, Math.min(255, Math.round(color[2] * 255)));
    const a = Math.max(0, Math.min(1, color[3]));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
};
