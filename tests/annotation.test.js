/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../release/WasmGPU.js";

const { numberApproxEqual } = createApproxHelpers();

const hit = (overrides = {}) => ({
    kind: "pointcloud",
    object: {},
    objectId: 7,
    elementIndex: 3,
    worldPosition: [1, 2, 3],
    ndIndex: [1, 0, 2],
    attributes: { scalar: 0.25, packedPoint: [1, 2, 3, 0.25] },
    ...overrides
});

await setupTest({ initWebAssembly: WasmGPU.initWebAssembly });

const { AnnotationToolkit, AnnotationStore, AnnotationMarkerRenderer, AnnotationLabelLayer, AnnotationMode, AnnotationKind, createAnnotationAnchor, computeDistanceWorld, computeAngleRadians, formatDistanceWorld, formatAngleRadians, mapAnnotationProbeReadout } = WasmGPU;

assert.ok(AnnotationToolkit, "Missing export: AnnotationToolkit");
assert.ok(AnnotationStore, "Missing export: AnnotationStore");
assert.ok(AnnotationMarkerRenderer, "Missing export: AnnotationMarkerRenderer");
assert.ok(AnnotationLabelLayer, "Missing export: AnnotationLabelLayer");
assert.strictEqual(AnnotationMode.Marker, "marker", "AnnotationMode.Marker mismatch");
assert.strictEqual(AnnotationKind.Distance, "distance", "AnnotationKind.Distance mismatch");
assert.ok(typeof mapAnnotationProbeReadout === "function", "Missing export: mapAnnotationProbeReadout()");

// 1) Store lifecycle: deterministic IDs + CRUD + recomputation on edits.
{
    let now = 100;
    const store = new AnnotationStore({ idPrefix: "anno", nowMs: () => now++ });
    const a0 = createAnnotationAnchor([0, 0, 0]);
    const a1 = createAnnotationAnchor([3, 4, 0]);
    const a2 = createAnnotationAnchor([3, 4, 3]);
    const marker = store.createMarker(a0, { label: "m0" });
    const distance = store.createDistance(a0, a1, { label: "d0" });
    const angle = store.createAngle(a0, a1, a2, { label: "a0" });
    assert.strictEqual(marker.id, "anno-marker-000001", "Marker ID mismatch");
    assert.strictEqual(distance.id, "anno-distance-000002", "Distance ID mismatch");
    assert.strictEqual(angle.id, "anno-angle-000003", "Angle ID mismatch");
    assert.strictEqual(store.size, 3, "Store size mismatch after creates");
    const updated = store.updateDistance(distance.id, { end: createAnnotationAnchor([6, 8, 0]) });
    assert.ok(updated, "updateDistance should return updated record");
    numberApproxEqual(updated.distanceWorld, 10, 1e-9, "Distance recomputation mismatch");
    assert.strictEqual(store.remove(marker.id), true, "remove() should return true for existing record");
    assert.strictEqual(store.size, 2, "Store size mismatch after remove");
    store.clear();
    assert.strictEqual(store.size, 0, "Store size mismatch after clear()");
}

// 2) Distance/angle math + units formatting.
{
    numberApproxEqual(computeDistanceWorld([0, 0, 0], [3, 4, 12]), 13, 1e-9, "Distance math mismatch");
    numberApproxEqual(computeAngleRadians([1, 0, 0], [0, 0, 0], [0, 1, 0]), Math.PI * 0.5, 1e-9, "Right-angle mismatch");
    const distanceText = formatDistanceWorld(2500, { worldUnitsPerUnit: 1, symbol: "m", autoMetric: true, decimals: 1 }).text;
    assert.strictEqual(distanceText, "2.5 km", "Metric distance formatting mismatch");
    const angleText = formatAngleRadians(Math.PI, { angleUnit: "deg", angleDecimals: 1 }).text;
    assert.strictEqual(angleText, "180 deg", "Angle formatting mismatch");
}

// 3) Toolkit interaction state machine + readout mapping.
{
    const toolkit = new AnnotationToolkit({ pick: async () => null }, { autoCreateOverlay: false, autoBindPointerEvents: false });
    const h0 = hit({ worldPosition: [0, 0, 0], elementIndex: 0 });
    const h1 = hit({ worldPosition: [3, 4, 0], elementIndex: 1 });
    const h2 = hit({ worldPosition: [3, 4, 4], elementIndex: 2 });

    toolkit.setMode("distance");
    assert.strictEqual(toolkit.ingestSelectionHit(h0), null, "Distance mode click #1 should stage only");
    assert.strictEqual(toolkit.pendingCount, 1, "Distance mode pending count mismatch after click #1");
    const d = toolkit.ingestSelectionHit(h1);
    assert.ok(d && d.kind === "distance", "Distance mode click #2 should create record");
    assert.strictEqual(toolkit.pendingCount, 0, "Distance mode pending count should reset after completion");

    toolkit.setMode("angle");
    assert.strictEqual(toolkit.ingestSelectionHit(h0), null, "Angle mode click #1 should stage");
    assert.strictEqual(toolkit.ingestSelectionHit(h1), null, "Angle mode click #2 should stage");
    const a = toolkit.ingestSelectionHit(h2);
    assert.ok(a && a.kind === "angle", "Angle mode click #3 should create record");

    toolkit.setMode("marker");
    const m = toolkit.ingestSelectionHit(h2);
    assert.ok(m && m.kind === "marker", "Marker mode click should create marker record");
    toolkit.cancel();
    assert.strictEqual(toolkit.mode, "idle", "cancel() should set mode to idle");

    const probe = mapAnnotationProbeReadout(hit({ objectId: 91, elementIndex: 12, worldPosition: [9, 8, 7], ndIndex: [4, 5], attributes: { scalar: 1.25 } }));
    assert.strictEqual(probe.hit, true, "Probe mapping should preserve hit state");
    assert.strictEqual(probe.objectId, 91, "Probe mapping objectId mismatch");
    assert.deepStrictEqual(probe.worldPosition, [9, 8, 7], "Probe mapping worldPosition mismatch");
    numberApproxEqual(probe.attributes.scalar, 1.25, 1e-9, "Probe scalar mapping mismatch");
}

// 4) Marker renderer sync should be revision-driven and content-stable.
{
    const store = new AnnotationStore({ idPrefix: "mr" });
    const renderer = new AnnotationMarkerRenderer({ markerScale: 0.1, maxInstances: 16 });
    const p0 = createAnnotationAnchor([0, 0, 0]);
    const p1 = createAnnotationAnchor([1, 0, 0]);
    store.createMarker(p0);
    assert.strictEqual(renderer.sync(store.values(), store.revision), true, "First sync should apply");
    assert.strictEqual(renderer.instanceCount, 1, "Renderer instance count mismatch after first sync");
    const syncCount = renderer.syncCount;
    assert.strictEqual(renderer.sync(store.values(), store.revision), false, "Sync with unchanged revision should skip");
    assert.strictEqual(renderer.syncCount, syncCount, "Sync count should not advance on skipped sync");
    store.createDistance(p0, p1);
    assert.strictEqual(renderer.sync(store.values(), store.revision), true, "Sync should apply after mutation");
    assert.strictEqual(renderer.instanceCount, 3, "Distance record should contribute two additional marker instances");
}

// 5) Label layer should reuse pooled nodes under stable annotation count.
{
    const root = document.createElement("div");
    document.body.appendChild(root);
    try {
        const layer = new AnnotationLabelLayer({ maxLabels: 3 });
        layer.attach(root);
        const camera = {
            type: "perspective",
            viewProjectionMatrix: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ],
            viewMatrix: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]
        };
        const entries = [
            { key: "e0", text: "A", color: "rgba(255,0,0,1)", position: [0, 0, 0.5] },
            { key: "e1", text: "B", color: "rgba(0,255,0,1)", position: [0.2, -0.2, 0.5] }
        ];
        layer.setEntries(entries, 1);
        layer.update({
            camera,
            scene: null,
            width: 800,
            height: 600,
            dpr: 1,
            nowMs: 0,
            reasons: new Set(["manual"]),
            root
        });
        const poolA = layer.pooledNodeCount;
        assert.strictEqual(poolA, 2, "Expected two pooled nodes after first render");
        layer.update({
            camera,
            scene: null,
            width: 800,
            height: 600,
            dpr: 1,
            nowMs: 1,
            reasons: new Set(["camera"]),
            root
        });
        const poolB = layer.pooledNodeCount;
        assert.strictEqual(poolB, poolA, "Pool size should remain stable for unchanged annotation count");
        layer.detach();
    } finally {
        root.remove();
    }
}
