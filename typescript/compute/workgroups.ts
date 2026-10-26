/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, ceilDiv, isNonNegativeInt, isPositiveInt } from "../utils";

export type WorkgroupSize = readonly [number, number, number];
export type WorkgroupCounts = readonly [number, number, number];
export type WorkgroupExtent = number | readonly [number] | readonly [number, number] | readonly [number, number, number];

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
    assert(isNonNegativeInt(invocations), `invocations must be an integer >= 0 (got ${invocations})`);
    assert(isPositiveInt(workgroupSizeX), `workgroupSizeX must be a positive integer (got ${workgroupSizeX})`);
    if (invocations === 0) return [0, 1, 1];
    const x = ceilDiv(invocations, workgroupSizeX);
    return [x, 1, 1];
};

export const workgroups2D = (width: number, height: number, workgroupSizeX: number, workgroupSizeY: number): WorkgroupCounts => {
    assert(isNonNegativeInt(width) && isNonNegativeInt(height), `width/height must be integers >= 0 (got ${width}x${height})`);
    assert(isPositiveInt(workgroupSizeX), `workgroupSizeX must be a positive integer (got ${workgroupSizeX})`);
    assert(isPositiveInt(workgroupSizeY), `workgroupSizeY must be a positive integer (got ${workgroupSizeY})`);
    if (width === 0 || height === 0) return [0, 1, 1];
    const x = ceilDiv(width, workgroupSizeX);
    const y = ceilDiv(height, workgroupSizeY);
    return [x, y, 1];
};

export const workgroups3D = (width: number, height: number, depth: number, workgroupSizeX: number, workgroupSizeY: number, workgroupSizeZ: number): WorkgroupCounts => {
    assert(isNonNegativeInt(width) && isNonNegativeInt(height) && isNonNegativeInt(depth), `width/height/depth must be integers >= 0 (got ${width}x${height}x${depth})`);
    assert(isPositiveInt(workgroupSizeX), `workgroupSizeX must be a positive integer (got ${workgroupSizeX})`);
    assert(isPositiveInt(workgroupSizeY), `workgroupSizeY must be a positive integer (got ${workgroupSizeY})`);
    assert(isPositiveInt(workgroupSizeZ), `workgroupSizeZ must be a positive integer (got ${workgroupSizeZ})`);
    if (width === 0 || height === 0 || depth === 0) return [0, 1, 1];
    const x = ceilDiv(width, workgroupSizeX);
    const y = ceilDiv(height, workgroupSizeY);
    const z = ceilDiv(depth, workgroupSizeZ);
    return [x, y, z];
};

const workgroupExtent = (extent: WorkgroupExtent, name: string): readonly number[] => {
    if (typeof extent === "number") return [extent];
    assert(Array.isArray(extent) && extent.length >= 1 && extent.length <= 3, `${name} must be a number or an array of 1 to 3 numbers`);
    return extent;
};

export const workgroupsFolded = (size: WorkgroupExtent, workgroupSize: WorkgroupExtent, maxWorkgroupsPerDimension: number = 65535): WorkgroupCounts => {
    const sizes = workgroupExtent(size, "size");
    const workgroupSizes = workgroupExtent(workgroupSize, "workgroupSize");
    const rank = sizes.length;
    assert(workgroupSizes.length === rank, `size and workgroupSize must have the same rank (got ${rank} and ${workgroupSizes.length})`);
    const groups = [1, 1, 1];
    for (let i = 0; i < rank; i++) {
        const axis = "xyz"[i];
        assert(isNonNegativeInt(sizes[i]!), `size.${axis} must be an integer >= 0 (got ${sizes[i]})`);
        assert(isPositiveInt(workgroupSizes[i]!), `workgroupSize.${axis} must be a positive integer (got ${workgroupSizes[i]})`);
        groups[i] = ceilDiv(sizes[i]!, workgroupSizes[i]!);
    }
    assert(isPositiveInt(maxWorkgroupsPerDimension), `maxWorkgroupsPerDimension must be a positive integer (got ${maxWorkgroupsPerDimension})`);
    const gx = groups[0]!, gy = groups[1]!, gz = groups[2]!;
    if (gx === 0 || gy === 0 || gz === 0) return [0, 1, 1];
    const extent = sizes.join("x"), max = maxWorkgroupsPerDimension;
    for (let i = 0; i < rank; i++) assert(groups[i]! * workgroupSizes[i]! <= 2 ** 32, `${extent} invocations in ${gx}x${gy}x${gz} logical workgroups of ${workgroupSizes.join("x")} exceed 32-bit invocation indexing`);
    if (rank === 3) assert(gx * gy < 2 ** 32, `${extent} invocations need ${gx}x${gy} workgroups per z-slice, which exceed 32-bit workgroup indexing`);
    const total = gx * gy * gz;
    assert(total <= 2 ** 32, `${extent} invocations need ${total} workgroups, which exceed 32-bit workgroup indexing`);
    let x = gx, y = gy, z = gz;
    if (gx > max || gy > max || gz > max) {
        y = ceilDiv(total, max);
        if (y <= max) {
            x = ceilDiv(total, y);
            z = 1;
        } else {
            z = ceilDiv(total, max * max);
            assert(z <= max, `${extent} invocations need ${total} workgroups, which exceeds device.limits.maxComputeWorkgroupsPerDimension (${max}) cubed`);
            const rem = ceilDiv(total, z);
            y = ceilDiv(rem, max);
            x = ceilDiv(rem, y);
        }
    }
    if (rank === 1) assert(x * y * z * workgroupSizes[0]! <= 2 ** 32, `${extent} invocations in ${x}x${y}x${z} workgroups of ${workgroupSizes[0]} exceed 32-bit invocation indexing`);
    assert(x * y * z <= 2 ** 32, `${extent} invocations in ${x}x${y}x${z} workgroups exceed 32-bit workgroup indexing`);
    return [x, y, z];
};
