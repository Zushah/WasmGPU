/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

override BIT: u32 = 0u;

@group(0) @binding(0) var<storage, read> keysIn: array<u32>;
@group(0) @binding(1) var<storage, read> valuesIn: array<u32>;
@group(0) @binding(2) var<storage, read> prefix: array<u32>;
@group(0) @binding(3) var<storage, read> zerosCount: array<u32>;
@group(0) @binding(4) var<storage, read_write> keysOut: array<u32>;
@group(0) @binding(5) var<storage, read_write> valuesOut: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let n = arrayLength(&keysIn);
    if (i >= n) {
        return;
    }
    let k = keysIn[i];
    let isZero = ((k >> BIT) & 1u) == 0u;
    let zeroPos = prefix[i];
    let zeroCount = zerosCount[0u];
    let onePos = zeroCount + (i - zeroPos);
    let dst = select(onePos, zeroPos, isZero);
    keysOut[dst] = k;
    valuesOut[dst] = valuesIn[i];
}
