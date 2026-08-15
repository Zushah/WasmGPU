/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, safelySilence, setupTest } from "./utils/helpers.js";
import { initWebAssembly, mat4, quat, vec3 } from "../release/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers(1e-5);

await setupTest({ initWebAssembly });

const assertAllInRange = (arr, min, max) => { for (const v of arr) assert.ok(v >= min && v <= max, `Value ${v} not in [${min}, ${max}]`); }

// 1) mat4.identity / mat4.isIdentity / mat4.det / mat4.trace.
{
    const I = mat4.identity();
    assert.strictEqual(I.length, 16, "mat4.identity should return length 16");
    assert.strictEqual(mat4.isIdentity(I), true, "mat4.isIdentity failed on identity");
    numberApproxEqual(mat4.det(I), 1, 1e-5, "mat4.det(identity) should be 1");
    numberApproxEqual(mat4.trace(I), 4, 1e-5, "mat4.trace(identity) should be 4");
}

// 2) mat4.copy returns new array.
{
    const I = mat4.identity();
    const c = mat4.copy(I);
    assert.deepStrictEqual(c, I, "mat4.copy failed");
    assert.notStrictEqual(c, I, "mat4.copy should return a new array");
}

// 3) mat4.add / mat4.sub / mat4.neg / mat4.abs / mat4.round / mat4.scl.
{
    const A = mat4.init(
        1, -2, 3, -4,
        5, -6, 7, -8,
        9, -10, 11, -12,
        13, -14, 15, -16
    );
    const absA = mat4.abs(A);
    assert.deepStrictEqual(absA, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], "mat4.abs failed");
    const negA = mat4.neg(A);
    assert.deepStrictEqual(negA, [-1, 2, -3, 4, -5, 6, -7, 8, -9, 10, -11, 12, -13, 14, -15, 16], "mat4.neg failed");
    const sum = mat4.add(A, negA);
    assert.strictEqual(mat4.isZero(sum), true, "mat4.add(A, -A) should be zero");
    const back = mat4.sub(A, negA);
    const twoA = mat4.scl(A, 2);
    assert.deepStrictEqual(back, twoA, "mat4.sub failed");
    const rounded = mat4.round([1.2, 2.5, 3.7, 4.1, 5.9, 6.0, 7.49, 8.5, 9.51, 10.49, 11.5, 12.5, 13.0, 14.0, 15.0, 16.0]);
    assert.deepStrictEqual(rounded, [1, 3, 4, 4, 6, 6, 7, 9, 10, 10, 12, 13, 13, 14, 15, 16], "mat4.round failed");
}

// 4) mat4.mul(identity, identity) is identity.
{
    const I = mat4.identity();
    const M = mat4.mul(I, I);
    assert.strictEqual(mat4.isIdentity(M), true, "mat4.mul(identity, identity) should be identity");
}

// 5) mat4.transpose(identity) is identity.
{
    const I = mat4.identity();
    const T = mat4.transpose(I);
    assert.strictEqual(mat4.isIdentity(T), true, "mat4.transpose(identity) should be identity");
}

// 6) mat4.random / mat4.print.
{
    const min = -2, max = 3;
    const r = mat4.random(min, max);
    assert.strictEqual(r.length, 16, "mat4.random should return length 16");
    assertAllInRange(r, min, max);
    const { messages } = safelySilence(
        "log",
        () => mat4.print(mat4.identity())
    );
    assert.deepStrictEqual(messages, ["[ 1 0 0 0 ]\n[ 0 1 0 0 ]\n[ 0 0 1 0 ]\n[ 0 0 0 1 ]"], "mat4.print output mismatch");
}

// 7) quat.init / quat.copy.
{
    const q = quat.init(1, 2, 3, 4);
    assert.deepStrictEqual(q, [1, 2, 3, 4], "quat.init failed");
    const c = quat.copy(q);
    assert.deepStrictEqual(c, q, "quat.copy failed");
    assert.notStrictEqual(c, q, "quat.copy should return a new array");
}

// 8) quat.abs / quat.neg / quat.add / quat.sub / quat.scl.
{
    assert.deepStrictEqual(quat.abs([-1, -2, -3, -4]), [1, 2, 3, 4], "quat.abs failed");
    assert.deepStrictEqual(quat.neg([1, 2, 3, 4]), [-1, -2, -3, -4], "quat.neg failed");
    assert.deepStrictEqual(quat.add([1, 2, 3, 4], [5, 6, 7, 8]), [6, 8, 10, 12], "quat.add failed");
    assert.deepStrictEqual(quat.sub([6, 8, 10, 12], [5, 6, 7, 8]), [1, 2, 3, 4], "quat.sub failed");
    assert.deepStrictEqual(quat.scl([1, 2, 3, 4], 2), [2, 4, 6, 8], "quat.scl failed");
}

// 9) quat.norm / quat.normsq / quat.normalize / quat.isNormalized.
{
    const q = quat.init(0, 0, 0, 1);
    numberApproxEqual(quat.norm(q), 1, 1e-5, "quat.norm failed");
    numberApproxEqual(quat.normsq(q), 1, 1e-5, "quat.normsq failed");
    assert.strictEqual(quat.isNormalized(q), true, "quat.isNormalized failed");
    const q2 = quat.normalize(quat.init(2, 0, 0, 0));
    assert.strictEqual(quat.isNormalized(q2), true, "quat.normalize did not produce a normalized quaternion");
    numberApproxEqual(quat.norm(q2), 1, 1e-5, "quat.normalize produced wrong norm");
}

// 10) quat.dist / quat.distsq / quat.isEqual / quat.isZero.
{
    const a = quat.init(1, 0, 0, 0);
    const b = quat.init(1, 0, 0, 0);
    assert.strictEqual(quat.isEqual(a, b), true, "quat.isEqual failed for equal quaternions");
    numberApproxEqual(quat.dist(a, b), 0, 1e-5, "quat.dist failed");
    numberApproxEqual(quat.distsq(a, b), 0, 1e-5, "quat.distsq failed");
    assert.strictEqual(quat.isZero(quat.init(0, 0, 0, 0)), true, "quat.isZero failed");
    assert.strictEqual(quat.isZero(quat.init(0, 0, 0, 1)), false, "quat.isZero failed for non-zero quat");
}

// 11) quat.random / quat.print.
{
    const min = 5, max = 20;
    const r = quat.random(min, max);
    assert.strictEqual(r.length, 4, "quat.random should return length 4");
    assertAllInRange(r, min, max);
    const { messages } = safelySilence(
        "log",
        () => quat.print([0, 0, 0, 1])
    );
    assert.deepStrictEqual(messages, ["0 + 0i + 0j + 1k"], "quat.print output mismatch");
}

// 12) vec3.init / vec3.copy.
{
    const v = vec3.init(7, 8, 9);
    assert.deepStrictEqual(v, [7, 8, 9], "vec3.init failed");
    const c = vec3.copy(v);
    assert.deepStrictEqual(c, v, "vec3.copy failed");
    assert.notStrictEqual(c, v, "vec3.copy should return a new array");
}

// 13) vec3.abs / vec3.neg / vec3.add / vec3.sub / vec3.scl / vec3.round.
{
    assert.deepStrictEqual(vec3.abs([-1, -2, -3]), [1, 2, 3], "vec3.abs failed");
    assert.deepStrictEqual(vec3.neg([1, 2, 3]), [-1, -2, -3], "vec3.neg failed");
    assert.deepStrictEqual(vec3.add([1, 2, 3], [4, 5, 6]), [5, 7, 9], "vec3.add failed");
    assert.deepStrictEqual(vec3.sub([5, 5, 5], [1, 2, 3]), [4, 3, 2], "vec3.sub failed");
    assert.deepStrictEqual(vec3.scl([1, 2, 3], 3), [3, 6, 9], "vec3.scl failed");
    assert.deepStrictEqual(vec3.round([1.2, 2.5, 3.7]), [1, 3, 4], "vec3.round failed");
}

// 14) vec3.dot / vec3.cross / vec3.dist / vec3.distsq / vec3.norm / vec3.normsq.
{
    assert.strictEqual(vec3.dot([1, 2, 3], [4, 5, 6]), 32, "vec3.dot failed");
    assert.deepStrictEqual(vec3.cross([1, 0, 0], [0, 1, 0]), [0, 0, 1], "vec3.cross failed");
    numberApproxEqual(vec3.dist([0, 0, 0], [3, 4, 0]), 5, 1e-5, "vec3.dist failed");
    numberApproxEqual(vec3.distsq([0, 0, 0], [3, 4, 0]), 25, 1e-5, "vec3.distsq failed");
    numberApproxEqual(vec3.norm([3, 4, 0]), 5, 1e-5, "vec3.norm failed");
    numberApproxEqual(vec3.normsq([3, 4, 0]), 25, 1e-5, "vec3.normsq failed");
}

// 15) vec3.normalize / vec3.normscl / vec3.isNormalized.
{
    const v = [3, 4, 0];
    const n = vec3.normalize(v);
    arraysApproxEqual(n, [0.6, 0.8, 0], 1e-5);
    assert.strictEqual(vec3.isNormalized(n), true, "vec3.isNormalized failed after vec3.normalize");
    const ns = vec3.normscl(v, 10);
    arraysApproxEqual(ns, [6, 8, 0], 1e-5);
}

// 16) vec3.ang / vec3.angBetween / vec3.interp.
{
    arraysApproxEqual(vec3.ang([1, 0, 0]), [0, Math.PI / 2, Math.PI / 2], 1e-5);
    numberApproxEqual(vec3.angBetween([1, 0, 0], [0, 1, 0]), Math.PI / 2, 1e-5, "vec3.angBetween failed");
    const base = [10, 20, 30];
    arraysApproxEqual(vec3.interp(base, 0.5, 5, 2), [22, 22, 22], 1e-5);
}

// 17) vec3.isEqual / vec3.isZero / vec3.isOrthogonal / vec3.isParallel.
{
    assert.strictEqual(vec3.isEqual([1, 2, 3], [1, 2, 3]), true, "vec3.isEqual failed for equal arrays");
    assert.strictEqual(vec3.isEqual([1, 2, 3], [3, 2, 1]), false, "vec3.isEqual failed for inequal arrays");
    assert.strictEqual(vec3.isZero([0, 0, 0]), true, "vec3.isZero failed");
    assert.strictEqual(vec3.isZero([1, 0, 0]), false, "vec3.isZero failed for non-zero vector");
    assert.strictEqual(vec3.isOrthogonal([1, 0, 0], [0, 1, 0]), true, "vec3.isOrthogonal failed");
    assert.strictEqual(vec3.isParallel([1, 0, 0], [2, 0, 0]), true, "vec3.isParallel failed for parallel vectors");
    assert.strictEqual(vec3.isParallel([1, 0, 0], [0, 1, 0]), false, "vec3.isParallel failed for non-parallel vectors");
}

// 18) vec3.proj / vec3.oproj / vec3.reflect / vec3.refract.
{
    arraysApproxEqual(vec3.proj([3, 4, 5], [1, 0, 0]), [3, 0, 0], 1e-5);
    arraysApproxEqual(vec3.oproj([3, 4, 5], [1, 0, 0]), [0, 4, 5], 1e-5);
    arraysApproxEqual(vec3.reflect([1, -1, 0], [0, 1, 0]), [1, 1, 0], 1e-5);
    arraysApproxEqual(vec3.refract([0, -1, 0], [0, 1, 0], 1.5), [0, -1, 0], 1e-5);
}

// 19) vec3.random / vec3.print.
{
    const min = 5, max = 10;
    const r = vec3.random(min, max);
    assert.strictEqual(r.length, 3, "vec3.random should return length 3");
    assertAllInRange(r, min, max);
    const { messages } = safelySilence(
        "log",
        () => vec3.print([1, 2, 3])
    );
    assert.deepStrictEqual(messages, ["(1, 2, 3)"], "vec3.print output mismatch");
}
