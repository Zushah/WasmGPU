/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import { initWebAssembly, Geometry, Mesh, Scene, TransformStore, UnlitMaterial, StandardMaterial } from "../dist/WasmGPU.js";

const approxEqual = (actual, expected, tol = 1e-6, msg = "Numbers differ") => { assert.ok(Number.isFinite(actual) && Number.isFinite(expected), `${msg}: expected finite numbers`); assert.ok(Math.abs(actual - expected) <= tol, `${msg}: ${actual} vs ${expected}`); };
const approxArray = (actual, expected, tol = 1e-6, msg = "Arrays differ") => { assert.equal(actual.length, expected.length, `${msg}: length ${actual.length} vs ${expected.length}`); for (let i = 0; i < actual.length; i++) approxEqual(actual[i], expected[i], tol, `${msg} at index ${i}`); };

await initWebAssembly(new URL("../dist/", import.meta.url).toString());

// 1) Mesh runtime state preserves transforms, hierarchy, visibility, flags, and bounds.
{
    const baseTransformCount = TransformStore.global().count;
    const geometry = Geometry.box(2, 2, 2);
    const material = new UnlitMaterial({ color: [0.2, 0.4, 0.8] });
    const parent = new Mesh(Geometry.box(), new UnlitMaterial());
    const mesh = new Mesh(geometry, material);
    const child = new Mesh(Geometry.box(), new UnlitMaterial());

    mesh.name = "RuntimeMesh";
    mesh.userData.kind = "mesh-test";
    mesh.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.transform.setPosition(2, 3, 4);
    mesh.transform.setScale(2, 3, 4);
    parent.transform.setPosition(10, 0, 0);
    parent.addChild(mesh);
    mesh.addChild(child);
    child.transform.setPosition(0, 1, 0);

    assert.equal(mesh.destroyed, false);
    assert.equal(mesh.name, "RuntimeMesh");
    assert.equal(mesh.userData.kind, "mesh-test");
    assert.equal(mesh.visible, false);
    assert.equal(mesh.castShadow, false);
    assert.equal(mesh.receiveShadow, false);
    assert.equal(mesh.transform.parent, parent.transform);
    assert.equal(child.transform.parent, mesh.transform);
    approxArray(mesh.transform.worldPosition, [12, 3, 4]);
    approxArray(child.transform.worldPosition, [12, 6, 4]);

    const local = mesh.getLocalBounds();
    const world = mesh.getWorldBounds();
    approxArray(local.boxMin, [-1, -1, -1]);
    approxArray(local.boxMax, [1, 1, 1]);
    approxArray(world.boxMin, [10, 0, 0]);
    approxArray(world.boxMax, [14, 6, 8]);
    assert.equal(mesh.getBounds().sphereRadius, world.sphereRadius);

    mesh.removeChild(child);
    assert.equal(child.transform.parent, null);
    mesh.setParent(null);
    assert.equal(mesh.transform.parent, null);
    child.destroy();
    mesh.destroy();
    parent.destroy();
    assert.equal(TransformStore.global().count, baseTransformCount);
}

// 2) Scene ownership tracks meshes, names, visibility, traversal, and destroyed-mesh detachment.
{
    const scene = new Scene({ background: [0.1, 0.2, 0.3] });
    const visible = new Mesh(Geometry.box(1, 1, 1), new UnlitMaterial());
    const hidden = new Mesh(Geometry.box(1, 1, 1), new UnlitMaterial());
    visible.name = "Box";
    hidden.name = "Box";
    hidden.visible = false;
    hidden.transform.setPosition(10, 0, 0);

    scene.add(visible).add(visible).add(hidden);
    assert.equal(scene.meshes.length, 2);
    assert.equal(scene.visibleMeshes.length, 1);
    assert.equal(scene.findByName("Box"), visible);
    assert.equal(scene.findAllByName("Box").length, 2);
    assert.deepEqual(scene.background, [0.1, 0.2, 0.3]);

    const traversed = [];
    scene.traverse((mesh) => traversed.push(mesh.name));
    assert.deepEqual(traversed, ["Box", "Box"]);
    const visibleTraversed = [];
    scene.traverseVisible((mesh) => visibleTraversed.push(mesh.name));
    assert.deepEqual(visibleTraversed, ["Box"]);

    const visibleBounds = scene.getBounds();
    const allBounds = scene.getBounds({ visibleOnly: false });
    approxArray(visibleBounds.boxMax, [0.5, 0.5, 0.5]);
    approxArray(allBounds.boxMax, [10.5, 0.5, 0.5]);

    visible.destroy();
    assert.equal(scene.meshes.length, 1);
    assert.throws(() => scene.add(visible), /destroyed mesh/);
    scene.destroy();
    assert.equal(scene.meshes.length, 0);
}

// 3) Cloning and material replacement retain ownership while preserving mesh state.
{
    const geometry = Geometry.box();
    const material = new UnlitMaterial({ color: [0.8, 0.2, 0.1] });
    const mesh = new Mesh(geometry, material);
    mesh.name = "CloneSource";
    mesh.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.transform.setPosition(1, 2, 3);

    const clone = mesh.clone();
    assert.notEqual(clone, mesh);
    assert.equal(clone.geometry, geometry);
    assert.equal(clone.material, material);
    assert.equal(clone.name, "CloneSource");
    assert.equal(clone.visible, false);
    assert.equal(clone.castShadow, false);
    assert.equal(clone.receiveShadow, false);
    approxArray(clone.transform.position, [1, 2, 3]);
    mesh.destroy();
    assert.doesNotThrow(() => clone.geometry.retain().release());
    assert.doesNotThrow(() => clone.material.getUniformData());

    const replacement = new StandardMaterial({ color: [0.1, 0.6, 0.9] });
    const cloneWithMaterial = clone.cloneWithMaterial(replacement);
    assert.equal(cloneWithMaterial.geometry, geometry);
    assert.equal(cloneWithMaterial.material, replacement);
    assert.equal(cloneWithMaterial.name, "CloneSource");
    clone.destroy();
    assert.doesNotThrow(() => cloneWithMaterial.geometry.retain().release());
    assert.doesNotThrow(() => cloneWithMaterial.material.getUniformData());
    cloneWithMaterial.destroy();
}

// 4) Lifecycle edges protect shared resources and reject use after destruction.
{
    const sharedGeometry = Geometry.box();
    const sharedMaterial = new UnlitMaterial();
    const meshA = new Mesh(sharedGeometry.retain(), sharedMaterial.retain());
    const meshB = new Mesh(sharedGeometry, sharedMaterial);
    const baseline = new UnlitMaterial();
    const alternate = new UnlitMaterial({ color: [0.9, 0.4, 0.2] });
    const swappable = new Mesh(Geometry.box(), baseline);

    meshA.destroy();
    assert.doesNotThrow(() => meshB.geometry.retain().release());
    assert.doesNotThrow(() => meshB.material.getUniformData());

    baseline.retain();
    alternate.retain();
    swappable.setMaterial(alternate);
    assert.doesNotThrow(() => baseline.getUniformData());
    swappable.setMaterial(baseline);
    alternate.destroy();
    assert.equal(swappable.material, baseline);
    assert.doesNotThrow(() => swappable.material.getUniformData());

    meshB.destroy();
    swappable.destroy();
    swappable.destroy();
    assert.equal(swappable.destroyed, true);
    const deadReplacement = new UnlitMaterial();
    try {
        assert.throws(() => swappable.setMaterial(deadReplacement), /already been destroyed/);
    } finally {
        deadReplacement.destroy();
    }
    assert.throws(() => swappable.clone(), /already been destroyed/);
    assert.throws(() => swappable.worldMatrix, /already been destroyed/);
}
