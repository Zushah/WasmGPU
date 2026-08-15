/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export type Vec3 = [number, number, number];

export type Bounds3 = {
    boxMin: Vec3;
    boxMax: Vec3;
    sphereCenter: Vec3;
    sphereRadius: number;
    empty: boolean;
    partial: boolean;
};

export type BoundsProvider = {
    getBounds(): Bounds3;
};

export type BoundsLike = Bounds3 | BoundsProvider;

export const cloneVec3 = (v: readonly number[]): Vec3 => {
    return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
};

export const emptyBounds = (partial: boolean = false): Bounds3 => {
    return {
        boxMin: [0, 0, 0], boxMax: [0, 0, 0],
        sphereCenter: [0, 0, 0], sphereRadius: 0,
        empty: true, partial
    };
};

export const cloneBounds = (bounds: Bounds3): Bounds3 => {
    return {
        boxMin: cloneVec3(bounds.boxMin), boxMax: cloneVec3(bounds.boxMax),
        sphereCenter: cloneVec3(bounds.sphereCenter), sphereRadius: bounds.sphereRadius,
        empty: bounds.empty, partial: bounds.partial
    };
};

export const boundsFromBox = (boxMin: readonly number[], boxMax: readonly number[], partial: boolean = false): Bounds3 => {
    const min = cloneVec3(boxMin);
    const max = cloneVec3(boxMax);
    const cx = (min[0] + max[0]) * 0.5;
    const cy = (min[1] + max[1]) * 0.5;
    const cz = (min[2] + max[2]) * 0.5;
    const ex = max[0] - cx;
    const ey = max[1] - cy;
    const ez = max[2] - cz;
    return {
        boxMin: min, boxMax: max,
        sphereCenter: [cx, cy, cz], sphereRadius: Math.sqrt((ex * ex) + (ey * ey) + (ez * ez)),
        empty: false, partial
    };
};

export const boundsFromSphere = (center: readonly number[], radius: number, partial: boolean = false): Bounds3 => {
    const c = cloneVec3(center);
    const r = Math.max(0, radius);
    return {
        boxMin: [c[0] - r, c[1] - r, c[2] - r], boxMax: [c[0] + r, c[1] + r, c[2] + r],
        sphereCenter: c, sphereRadius: r,
        empty: false, partial
    };
};

export const boundsFromBoxAndSphere = (boxMin: readonly number[], boxMax: readonly number[], sphereCenter: readonly number[], sphereRadius: number, partial: boolean = false): Bounds3 => {
    return {
        boxMin: cloneVec3(boxMin), boxMax: cloneVec3(boxMax),
        sphereCenter: cloneVec3(sphereCenter), sphereRadius: Math.max(0, sphereRadius),
        empty: false, partial
    };
};

export const normalizeBounds = (source: BoundsLike): Bounds3 => {
    if ("getBounds" in source && typeof source.getBounds === "function") return (source as BoundsProvider).getBounds();
    return source as Bounds3;
};

export const unionBounds = (a: Bounds3, b: Bounds3): Bounds3 => {
    if (a.empty) {
        const out = cloneBounds(b);
        out.partial = a.partial || b.partial;
        return out;
    }
    if (b.empty) {
        const out = cloneBounds(a);
        out.partial = a.partial || b.partial;
        return out;
    }
    return boundsFromBox([Math.min(a.boxMin[0], b.boxMin[0]), Math.min(a.boxMin[1], b.boxMin[1]), Math.min(a.boxMin[2], b.boxMin[2])], [Math.max(a.boxMax[0], b.boxMax[0]), Math.max(a.boxMax[1], b.boxMax[1]), Math.max(a.boxMax[2], b.boxMax[2])], a.partial || b.partial);
};

export const getBoundsCenter = (bounds: Bounds3): Vec3 => {
    if (bounds.empty) return [0, 0, 0];
    return [(bounds.boxMin[0] + bounds.boxMax[0]) * 0.5, (bounds.boxMin[1] + bounds.boxMax[1]) * 0.5, (bounds.boxMin[2] + bounds.boxMax[2]) * 0.5];
};

export const getBoundsSize = (bounds: Bounds3): Vec3 => {
    if (bounds.empty) return [0, 0, 0];
    return [bounds.boxMax[0] - bounds.boxMin[0], bounds.boxMax[1] - bounds.boxMin[1], bounds.boxMax[2] - bounds.boxMin[2]];
};

export const expandBounds = (bounds: Bounds3, padding: number): Bounds3 => {
    if (bounds.empty) return cloneBounds(bounds);
    const scale = Math.max(1, padding);
    const center = getBoundsCenter(bounds);
    const ex = (bounds.boxMax[0] - bounds.boxMin[0]) * 0.5 * scale;
    const ey = (bounds.boxMax[1] - bounds.boxMin[1]) * 0.5 * scale;
    const ez = (bounds.boxMax[2] - bounds.boxMin[2]) * 0.5 * scale;
    return boundsFromBox([center[0] - ex, center[1] - ey, center[2] - ez], [center[0] + ex, center[1] + ey, center[2] + ez], bounds.partial);
};

export const getBoundsCorners = (bounds: Bounds3): Vec3[] => {
    if (bounds.empty) return [];
    const min = bounds.boxMin;
    const max = bounds.boxMax;
    return [[min[0], min[1], min[2]], [max[0], min[1], min[2]], [min[0], max[1], min[2]], [max[0], max[1], min[2]], [min[0], min[1], max[2]], [max[0], min[1], max[2]], [min[0], max[1], max[2]], [max[0], max[1], max[2]]];
};

export const transformBounds = (bounds: Bounds3, matrix: readonly number[]): Bounds3 => {
    if (bounds.empty) return cloneBounds(bounds);
    const cx = (bounds.boxMin[0] + bounds.boxMax[0]) * 0.5;
    const cy = (bounds.boxMin[1] + bounds.boxMax[1]) * 0.5;
    const cz = (bounds.boxMin[2] + bounds.boxMax[2]) * 0.5;
    const ex = (bounds.boxMax[0] - bounds.boxMin[0]) * 0.5;
    const ey = (bounds.boxMax[1] - bounds.boxMin[1]) * 0.5;
    const ez = (bounds.boxMax[2] - bounds.boxMin[2]) * 0.5;
    const tcx = (matrix[0] * cx) + (matrix[4] * cy) + (matrix[8] * cz) + matrix[12];
    const tcy = (matrix[1] * cx) + (matrix[5] * cy) + (matrix[9] * cz) + matrix[13];
    const tcz = (matrix[2] * cx) + (matrix[6] * cy) + (matrix[10] * cz) + matrix[14];
    const tex = (Math.abs(matrix[0]) * ex) + (Math.abs(matrix[4]) * ey) + (Math.abs(matrix[8]) * ez);
    const tey = (Math.abs(matrix[1]) * ex) + (Math.abs(matrix[5]) * ey) + (Math.abs(matrix[9]) * ez);
    const tez = (Math.abs(matrix[2]) * ex) + (Math.abs(matrix[6]) * ey) + (Math.abs(matrix[10]) * ez);
    const sx = Math.hypot(matrix[0], matrix[1], matrix[2]);
    const sy = Math.hypot(matrix[4], matrix[5], matrix[6]);
    const sz = Math.hypot(matrix[8], matrix[9], matrix[10]);
    const smax = Math.max(sx, sy, sz);
    const scx = (matrix[0] * bounds.sphereCenter[0]) + (matrix[4] * bounds.sphereCenter[1]) + (matrix[8] * bounds.sphereCenter[2]) + matrix[12];
    const scy = (matrix[1] * bounds.sphereCenter[0]) + (matrix[5] * bounds.sphereCenter[1]) + (matrix[9] * bounds.sphereCenter[2]) + matrix[13];
    const scz = (matrix[2] * bounds.sphereCenter[0]) + (matrix[6] * bounds.sphereCenter[1]) + (matrix[10] * bounds.sphereCenter[2]) + matrix[14];
    return boundsFromBoxAndSphere([tcx - tex, tcy - tey, tcz - tez], [tcx + tex, tcy + tey, tcz + tez], [scx, scy, scz], bounds.sphereRadius * smax, bounds.partial);
};
