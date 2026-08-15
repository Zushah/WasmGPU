/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, ceilDiv, isNonNegativeInt, isPositiveInt } from "../utils";

export type WorkgroupSize = readonly [number, number, number];
export type WorkgroupCounts = readonly [number, number, number];

export { ceilDiv } from "../utils";

export const makeWorkgroupSize = (x: number, y: number = 1, z: number = 1): WorkgroupSize => {
    assert(isPositiveInt(x), `workgroupSize.x must be a positive integer (got ${x})`);
    assert(isPositiveInt(y), `workgroupSize.y must be a positive integer (got ${y})`);
    assert(isPositiveInt(z), `workgroupSize.z must be a positive integer (got ${z})`);
    return [x, y, z];
};

export const makeWorkgroupCounts = (x: number, y: number = 1, z: number = 1): WorkgroupCounts => {
    assert(isNonNegativeInt(x), `workgroups.x must be an integer >= 0 (got ${x})`);
    assert(isNonNegativeInt(y), `workgroups.y must be an integer >= 0 (got ${y})`);
    assert(isNonNegativeInt(z), `workgroups.z must be an integer >= 0 (got ${z})`);
    return [x, y, z];
};

export const workgroups1D = (invocations: number, workgroupSizeX: number): WorkgroupCounts => {
    assert(Number.isFinite(invocations), `invocations must be finite (got ${invocations})`);
    assert(invocations >= 0, `invocations must be >= 0 (got ${invocations})`);
    assert(isPositiveInt(workgroupSizeX), `workgroupSizeX must be a positive integer (got ${workgroupSizeX})`);
    if (invocations === 0) return [0, 1, 1];
    const x = ceilDiv(invocations, workgroupSizeX);
    return [x, 1, 1];
};

export const workgroups2D = (width: number, height: number, workgroupSizeX: number, workgroupSizeY: number): WorkgroupCounts => {
    assert(Number.isFinite(width) && Number.isFinite(height), "width/height must be finite");
    assert(width >= 0 && height >= 0, `width/height must be >= 0 (got ${width}x${height})`);
    assert(isPositiveInt(workgroupSizeX), `workgroupSizeX must be a positive integer (got ${workgroupSizeX})`);
    assert(isPositiveInt(workgroupSizeY), `workgroupSizeY must be a positive integer (got ${workgroupSizeY})`);
    if (width === 0 || height === 0) return [0, 1, 1];
    const x = ceilDiv(width, workgroupSizeX);
    const y = ceilDiv(height, workgroupSizeY);
    return [x, y, 1];
};

export const workgroups3D = (width: number, height: number, depth: number, workgroupSizeX: number, workgroupSizeY: number, workgroupSizeZ: number): WorkgroupCounts => {
    assert(Number.isFinite(width) && Number.isFinite(height) && Number.isFinite(depth), "width/height/depth must be finite");
    assert(width >= 0 && height >= 0 && depth >= 0, `width/height/depth must be >= 0 (got ${width}x${height}x${depth})`);
    assert(isPositiveInt(workgroupSizeX), `workgroupSizeX must be a positive integer (got ${workgroupSizeX})`);
    assert(isPositiveInt(workgroupSizeY), `workgroupSizeY must be a positive integer (got ${workgroupSizeY})`);
    assert(isPositiveInt(workgroupSizeZ), `workgroupSizeZ must be a positive integer (got ${workgroupSizeZ})`);
    if (width === 0 || height === 0 || depth === 0) return [0, 1, 1];
    const x = ceilDiv(width, workgroupSizeX);
    const y = ceilDiv(height, workgroupSizeY);
    const z = ceilDiv(depth, workgroupSizeZ);
    return [x, y, z];
};
