/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { Camera } from "../world/camera";
import type { ScreenAnchorDescriptor } from "./types";

export type ProjectedPoint = {
    x: number;
    y: number;
    ndcX: number;
    ndcY: number;
    ndcZ: number;
    clipW: number;
    inFront: boolean;
    insideClip: boolean;
    visible: boolean;
};

const EPSILON = 1e-8;

export const projectWorldToScreen = (camera: Camera, width: number, height: number, point: readonly number[]): ProjectedPoint | null => {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const m = camera.viewProjectionMatrix;
    const x = point[0] ?? 0;
    const y = point[1] ?? 0;
    const z = point[2] ?? 0;
    const clipX = (m[0] * x) + (m[4] * y) + (m[8] * z) + m[12];
    const clipY = (m[1] * x) + (m[5] * y) + (m[9] * z) + m[13];
    const clipZ = (m[2] * x) + (m[6] * y) + (m[10] * z) + m[14];
    const clipW = (m[3] * x) + (m[7] * y) + (m[11] * z) + m[15];
    if (!Number.isFinite(clipW) || Math.abs(clipW) <= EPSILON) return null;
    const invW = 1 / clipW;
    const ndcX = clipX * invW;
    const ndcY = clipY * invW;
    const ndcZ = clipZ * invW;
    const sx = (ndcX * 0.5 + 0.5) * w;
    const sy = (1 - (ndcY * 0.5 + 0.5)) * h;
    const inFront = clipW > 0;
    const insideClip = ndcX >= -1 && ndcX <= 1 && ndcY >= -1 && ndcY <= 1 && ndcZ >= 0 && ndcZ <= 1;
    return { x: sx, y: sy, ndcX, ndcY, ndcZ, clipW, inFront, insideClip, visible: inFront && insideClip };
};

export const writeCameraSignature = (camera: Camera, out: Float64Array): void => {
    if (out.length < 17) throw new Error("writeCameraSignature: expected Float64Array length >= 17.");
    out[0] = camera.type === "perspective" ? 1 : 2;
    const vp = camera.viewProjectionMatrix;
    for (let i = 0; i < 16; i++) out[i + 1] = vp[i] ?? 0;
};

export const cameraSignatureEquals = (a: Float64Array, b: Float64Array, epsilon: number = 1e-6): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > epsilon) return false;
    return true;
};

export const resolveScreenAnchorPoint = (anchor: ScreenAnchorDescriptor | undefined, width: number, height: number): [number, number] => {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const a = anchor ?? { kind: "screen", corner: "bottom-left", offsetPx: [16, -16] };
    const ox = a.offsetPx?.[0] ?? 0;
    const oy = a.offsetPx?.[1] ?? 0;
    if (typeof a.x === "number" || typeof a.y === "number") {
        const x = (a.x ?? 0) + ox;
        const y = (a.y ?? 0) + oy;
        return [x, y];
    }
    const corner = a.corner ?? "bottom-left";
    if (corner === "top-left") return [0 + ox, 0 + oy];
    if (corner === "top-right") return [w + ox, 0 + oy];
    if (corner === "bottom-right") return [w + ox, h + oy];
    return [0 + ox, h + oy];
};
