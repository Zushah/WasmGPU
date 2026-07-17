/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import { initWebAssembly, Transform, TransformStore, wasm } from "../dist/WasmGPU.js";

await initWebAssembly(new URL("../dist/", import.meta.url).toString());

const approx = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

const approxArray = (a, b, tol = 1e-6, msg = "Array mismatch") => {
    assert.strictEqual(a.length, b.length, `${msg}: length mismatch`);
    for (let i = 0; i < a.length; i++) assert.ok(approx(a[i], b[i], tol), `${msg} at index ${i}: ${a[i]} vs ${b[i]}`);
};

const approxMatArray = (a, b, tol = 1e-6, msg = "Matrix array mismatch") => {
    assert.strictEqual(a.length, b.length, `${msg}: list length mismatch`);
    for (let i = 0; i < a.length; i++) approxArray(a[i], b[i], tol, `${msg} at matrix ${i}`);
};

const assertUnitQuat = (q, tol = 1e-6) => {
    const n = Math.hypot(q[0], q[1], q[2], q[3]);
    assert.ok(approx(n, 1, tol), `Quaternion is not normalized: ${n}`);
};

const snapshotWorld = (nodes) => {
    const out = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) out[i] = nodes[i].worldMatrix.slice();
    return out;
};

const cleanup = (nodes) => {
    for (let i = nodes.length - 1; i >= 0; i--) nodes[i].dispose();
};

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

// 1) Construction defaults, pointer accessors, and identity matrices.
{
    const store = TransformStore.global();
    const baseCount = store.count;
    const t = new Transform();
    try {
        assert.ok(Number.isInteger(t.index) && t.index >= 0, "Transform index should be a non-negative integer");
        assert.ok(t.positionPtr > 0, "positionPtr should be non-zero");
        assert.ok(t.rotationPtr > 0, "rotationPtr should be non-zero");
        assert.ok(t.scalePtr > 0, "scalePtr should be non-zero");
        assert.ok(t.localMatrixPtr > 0, "localMatrixPtr should be non-zero");
        assert.ok(t.worldMatrixPtr > 0, "worldMatrixPtr should be non-zero");
        approxArray(t.position, [0, 0, 0], 0, "Default position mismatch");
        approxArray(t.rotation, [0, 0, 0, 1], 0, "Default rotation mismatch");
        approxArray(t.scale, [1, 1, 1], 0, "Default scale mismatch");
        approxArray(t.localMatrix, IDENTITY, 0, "Default local matrix mismatch");
        approxArray(t.worldMatrix, IDENTITY, 0, "Default world matrix mismatch");
        approxArray(t.worldPosition, [0, 0, 0], 0, "Default world position mismatch");
        assert.strictEqual(t.disposed, false, "New transform should not be disposed");
    } finally {
        t.dispose();
    }
    assert.strictEqual(store.count, baseCount, "TransformStore count should return to baseline after dispose");
}

// 2) Position/scale APIs and rotation APIs (setters + incremental rotation).
{
    const t = new Transform();
    try {
        t.setPosition(1, 2, 3);
        approxArray(t.position, [1, 2, 3], 0, "setPosition mismatch");

        t.translate(-0.5, 1.25, 2);
        approxArray(t.position, [0.5, 3.25, 5], 0, "translate mismatch");

        t.setScale(2, 3, 4);
        approxArray(t.scale, [2, 3, 4], 0, "setScale mismatch");

        t.setUniformScale(1.5);
        approxArray(t.scale, [1.5, 1.5, 1.5], 0, "setUniformScale mismatch");

        t.setRotation(0, 0, 0, 2);
        approxArray(t.rotation, [0, 0, 0, 1], 1e-6, "setRotation normalization mismatch");

        const s = Math.sin(Math.PI / 4);
        const c = Math.cos(Math.PI / 4);

        t.setRotationFromAxisAngle([0, 0, 10], Math.PI / 2);
        approxArray(t.rotation, [0, 0, s, c], 1e-5, "setRotationFromAxisAngle mismatch");

        t.setRotationFromEuler(Math.PI / 2, 0, 0);
        approxArray(t.rotation, [s, 0, 0, c], 1e-5, "setRotationFromEuler mismatch");

        t.rotateX(0.25);
        t.rotateY(-0.5);
        t.rotateZ(0.75);
        t.rotateOnAxis([1, 2, 3], 0.33);
        assertUnitQuat(t.rotation, 1e-5);
    } finally {
        t.dispose();
    }
}

// 3) Parenting APIs, hierarchy world propagation, and root semantics.
{
    const nodes = [new Transform(), new Transform(), new Transform(), new Transform()];
    const [root, childA, childB, grandChild] = nodes;

    try {
        root.addChild(childA);
        root.addChild(childB);
        childA.addChild(grandChild);

        assert.strictEqual(childA.parent, root, "addChild should set parent");
        assert.strictEqual(childB.parent, root, "addChild should set parent");
        assert.strictEqual(grandChild.parent, childA, "Nested child parent mismatch");
        assert.deepStrictEqual(root.children, [childA, childB], "Root children order mismatch");
        assert.strictEqual(grandChild.root, root, "root getter mismatch");

        root.setPosition(1, 2, 3);
        childA.setPosition(4, 5, 6);
        childB.setPosition(-2, 0, 1);
        grandChild.setPosition(1, 1, 1);
        Transform.updateAll();

        approxArray(childA.worldPosition, [5, 7, 9], 1e-6, "childA worldPosition mismatch");
        approxArray(childB.worldPosition, [-1, 2, 4], 1e-6, "childB worldPosition mismatch");
        approxArray(grandChild.worldPosition, [6, 8, 10], 1e-6, "grandChild worldPosition mismatch");

        root.removeChild(childB);
        assert.strictEqual(childB.parent, null, "removeChild should clear child parent");

        childA.removeFromParent();
        assert.strictEqual(childA.parent, null, "removeFromParent should clear parent");
    } finally {
        cleanup(nodes);
    }
}

// 4) Cycle and self-parent protection.
{
    const nodes = [new Transform(), new Transform(), new Transform()];
    const [a, b, c] = nodes;

    try {
        b.setParent(a);
        c.setParent(b);

        assert.throws(() => a.setParent(a), /cannot be parented to itself/i);
        assert.throws(() => a.setParent(c), /would create a cycle/i);
    } finally {
        cleanup(nodes);
    }
}

// 5) Traversal order should be pre-order DFS using child insertion order.
{
    const nodes = [new Transform(), new Transform(), new Transform(), new Transform()];
    const [root, a, b, c] = nodes;

    try {
        root.addChild(a);
        root.addChild(b);
        a.addChild(c);

        const visit = [];
        root.traverse((t) => visit.push(t.index));
        assert.deepStrictEqual(visit, [root.index, a.index, c.index, b.index], "Traversal order mismatch");
    } finally {
        cleanup(nodes);
    }
}

// 6) copyFrom, clone, and reset behavior.
{
    const nodes = [new Transform(), new Transform()];
    const [src, dst] = nodes;

    try {
        src.setPosition(1.25, -2.5, 3.75);
        src.setRotationFromEuler(0.2, -0.4, 0.6);
        src.setScale(1.1, 0.9, 1.3);

        dst.copyFrom(src);
        approxArray(dst.position, src.position, 1e-6, "copyFrom position mismatch");
        approxArray(dst.rotation, src.rotation, 1e-6, "copyFrom rotation mismatch");
        approxArray(dst.scale, src.scale, 1e-6, "copyFrom scale mismatch");

        const cloned = src.clone();
        nodes.push(cloned);
        approxArray(cloned.position, src.position, 1e-6, "clone position mismatch");
        approxArray(cloned.rotation, src.rotation, 1e-6, "clone rotation mismatch");
        approxArray(cloned.scale, src.scale, 1e-6, "clone scale mismatch");
        assert.strictEqual(cloned.parent, null, "clone should not inherit parent");

        const r = new Transform();
        nodes.push(r);
        r.setPosition(9, 8, 7);
        r.setRotationFromAxisAngle([1, 0, 0], 0.5);
        r.setScale(2, 3, 4);
        r.reset();
        approxArray(r.position, [0, 0, 0], 0, "reset position mismatch");
        approxArray(r.rotation, [0, 0, 0, 1], 1e-6, "reset rotation mismatch");
        approxArray(r.scale, [1, 1, 1], 0, "reset scale mismatch");
    } finally {
        cleanup(nodes);
    }
}

// 7) dispose detaches children and blocks use-after-dispose.
{
    const parent = new Transform();
    const child = new Transform();
    parent.addChild(child);

    parent.dispose();
    assert.strictEqual(parent.disposed, true, "dispose should set disposed=true");
    assert.strictEqual(child.parent, null, "Disposing parent should detach children");
    assert.throws(() => parent.setPosition(1, 2, 3), /disposed/i);
    assert.throws(() => parent.worldMatrix, /disposed/i);

    parent.dispose(); // idempotent
    child.dispose();
}

// 8) Partial update path parity against forced full recompute.
{
    const NODE_COUNT = 96;
    const nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) nodes.push(new Transform());

    try {
        for (let i = 1; i < NODE_COUNT; i++) nodes[i].setParent(nodes[(i - 1) >> 1]);

        for (let i = 0; i < NODE_COUNT; i++) {
            const t = nodes[i];
            t.setPosition((i % 9) * 0.17, ((i * 3) % 11) * -0.09, ((i * 5) % 13) * 0.07);
            t.setRotationFromEuler(i * 0.011, i * 0.019, i * 0.023);
            t.setScale(1 + ((i % 4) * 0.03), 1 + ((i % 5) * 0.02), 1 + ((i % 6) * 0.01));
        }

        Transform.updateAll();

        nodes[4].setPosition(2.0, -1.0, 0.5);
        nodes[25].rotateY(0.2);
        nodes[57].setScale(0.8, 1.1, 1.3);
        nodes[73].translate(0.3, -0.1, 0.2);

        Transform.updateAll();
        const partialWorld = snapshotWorld(nodes);

        TransformStore.global().markDirty();
        Transform.updateAll();
        const fullWorld = snapshotWorld(nodes);
        approxMatArray(partialWorld, fullWorld, 1e-5, "Partial update parity mismatch");

        TransformStore.global().markOrderDirty();
        Transform.updateAll();
        const orderRebuiltWorld = snapshotWorld(nodes);
        approxMatArray(fullWorld, orderRebuiltWorld, 1e-5, "Order rebuild parity mismatch");
    } finally {
        cleanup(nodes);
    }
}

// 9) Store growth preserves live data and releases superseded capacity blocks.
{
    const store = new TransformStore(1);
    const originalFreeF32 = wasm.freeF32;
    const originalFreeU32 = wasm.freeU32;
    const freedF32 = [];
    const freedU32 = [];
    wasm.freeF32 = (ptr, len) => { freedF32.push([ptr, len]); originalFreeF32(ptr, len); };
    wasm.freeU32 = (ptr, len) => { freedU32.push([ptr, len]); originalFreeU32(ptr, len); };
    try {
        store.alloc({});
        const old = {
            posPtr: store.posPtr,
            rotPtr: store.rotPtr,
            sclPtr: store.sclPtr,
            localPtr: store.localPtr,
            worldPtr: store.worldPtr,
            parentPtr: store.parentPtr,
            orderPtr: store.orderPtr,
            tmpAxisPtr: store.tmpAxisPtr,
            tmpQuatPtr: store.tmpQuatPtr
        };
        wasm.f32view(old.posPtr, 3).set([1, 2, 3]);
        store.alloc({});
        assert.equal(store.cap, 2);
        assert.deepStrictEqual(Array.from(wasm.f32view(store.posPtr, 3)), [1, 2, 3], "TransformStore growth must preserve live position data");
        for (const [ptr, len] of [
            [old.posPtr, 3], [old.rotPtr, 4], [old.sclPtr, 3], [old.localPtr, 16], [old.worldPtr, 16]
        ]) assert.ok(freedF32.some(([freedPtr, freedLen]) => freedPtr === ptr && freedLen === len), `Expected replaced f32 allocation ${ptr}/${len} to be freed`);
        for (const [ptr, len] of [[old.parentPtr, 1], [old.orderPtr, 1]]) assert.ok(freedU32.some(([freedPtr, freedLen]) => freedPtr === ptr && freedLen === len), `Expected replaced u32 allocation ${ptr}/${len} to be freed`);
        assert.equal(store.tmpAxisPtr, old.tmpAxisPtr, "Capacity growth must reuse the fixed temporary axis allocation");
        assert.equal(store.tmpQuatPtr, old.tmpQuatPtr, "Capacity growth must reuse the fixed temporary quaternion allocation");

        for (let i = 2; i < 8; i++) store.alloc({});
        store.updateIfNeeded();
        store.markIndexDirty(0);
        store.updateIfNeeded();
        const oldDirtyIndicesPtr = store.dirtyIndicesPtr;
        store.markIndexDirty(0);
        store.markIndexDirty(1);
        store.updateIfNeeded();
        assert.ok(freedU32.some(([ptr, len]) => ptr === oldDirtyIndicesPtr && len === 1), "Growing dirty-index scratch must free the replaced block");
    } finally {
        wasm.freeF32 = originalFreeF32;
        wasm.freeU32 = originalFreeU32;
        if (store.dirtyIndicesPtr) originalFreeU32(store.dirtyIndicesPtr, store.dirtyIndicesCap);
        originalFreeF32(store.posPtr, store.cap * 3);
        originalFreeF32(store.rotPtr, store.cap * 4);
        originalFreeF32(store.sclPtr, store.cap * 3);
        originalFreeF32(store.localPtr, store.cap * 16);
        originalFreeF32(store.worldPtr, store.cap * 16);
        originalFreeU32(store.parentPtr, store.cap);
        originalFreeU32(store.orderPtr, store.cap);
        originalFreeF32(store.tmpAxisPtr, 4);
        originalFreeF32(store.tmpQuatPtr, 4);
    }
}
