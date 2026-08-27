/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../release/WasmGPU.js";

const view = (vp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], view = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], type = "perspective") => ({ type, get viewProjectionMatrix() { return vp; }, get viewMatrix() { return view; }, setViewProjection(next) { vp = next; } });
const rgbaApproxEqual = (a, b, tolerance = 2) => !!a && !!b && a.length === b.length && Array.from(a).every((value, i) => Math.abs(value - b[i]) <= tolerance);
const createDOMTestScope = () => {
    const roots = [];
    const countNodes = (node) => { let total = 1; for (const child of node.children ?? []) total += countNodes(child); return total; };
    const countVisibleLines = (node) => { let total = 0; const stack = [node]; while (stack.length > 0) { const cur = stack.pop(); for (const child of cur.children ?? []) stack.push(child); if (typeof cur?.style?.width === "string" && cur.style.width.endsWith("px") && cur.style.display !== "none") total++; } return total; };
    const countVisibleLabels = (node) => { let total = 0; const stack = [node]; while (stack.length > 0) { const cur = stack.pop(); for (const child of cur.children ?? []) stack.push(child); if (typeof cur?.textContent === "string" && cur.textContent.length > 0 && cur.style?.display !== "none") total++; } return total; };
    const getFirstCanvas = (node) => { const stack = [node]; while (stack.length > 0) { const cur = stack.pop(); if (cur.tagName === "CANVAS") return cur; for (const child of cur.children ?? []) stack.push(child); } return null; };
    const visible = (node, selector) => Array.from(node.querySelectorAll(selector)).filter((el) => el.style.display !== "none");
    return {
        createCanvas(width = 800, height = 600) {
            const root = document.createElement("div"); root.style.position = "relative"; document.body.appendChild(root); roots.push(root);
            const canvas = document.createElement("canvas");
            canvas.width = width; canvas.height = height; canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
            canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON() {} });
            Object.defineProperties(canvas, { clientWidth: { configurable: true, get: () => width }, clientHeight: { configurable: true, get: () => height } });
            root.appendChild(canvas);
            return canvas;
        }, countNodes, countVisibleLines, countVisibleLabels, getFirstCanvas, visible, restore() { for (const root of roots) root.remove(); }
    };
};
await setupTest({ initWebAssembly: WasmGPU.initWebAssembly });
const dom = createDOMTestScope();
const { OverlaySystem, AxisTriadLayer, GridLayer, LegendLayer, PointCloud } = WasmGPU;
assert.ok(OverlaySystem, "Missing export: OverlaySystem");
assert.ok(AxisTriadLayer, "Missing export: AxisTriadLayer");
assert.ok(GridLayer, "Missing export: GridLayer");
assert.ok(LegendLayer, "Missing export: LegendLayer");

// 1) OverlaySystem + pooled DOM nodes should stay bounded across updates.
{
    const canvas = dom.createCanvas(900, 600);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    const grid = new GridLayer({ extentMode: "fixed", fixedUMin: -8, fixedUMax: 8, fixedVMin: -8, fixedVMax: 8, maxLines: 40, maxLabels: 12 });
    overlay.addLayer(grid);
    overlay.setView(view(), null);
    assert.strictEqual(overlay.update({ force: true }), true, "Expected first overlay update to run");
    const nodesA = dom.countNodes(overlay.root);
    const linesA = dom.countVisibleLines(overlay.root);
    const labelsA = dom.countVisibleLabels(overlay.root);
    assert.ok(linesA <= 40, `Expected line budget <= 40, got ${linesA}`);
    assert.ok(labelsA <= 12, `Expected label budget <= 12, got ${labelsA}`);
    assert.strictEqual(overlay.update({ force: true }), true, "Forced update should run");
    const nodesB = dom.countNodes(overlay.root);
    assert.strictEqual(nodesA, nodesB, "Overlay DOM node count should remain stable");
    overlay.destroy();
}

// 2) Layer lookup and enabled state preserve identity and lifecycle while skipping updates.
{
    const canvas = dom.createCanvas(640, 360);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    let attaches = 0, detaches = 0, updates = 0;
    let output = null;
    let attachedRoot = null, updateRoot = null, lateSvg = null;
    const layer = {
        id: "counting-layer",
        attach(root) { attaches++; attachedRoot = root; output = document.createElement("div"); output.textContent = "counting"; output.style.display = "flex"; root.appendChild(output); },
        detach() { detaches++; output?.remove(); },
        update(ctx) { updates++; updateRoot = ctx.root; if (!lateSvg) { lateSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); attachedRoot.appendChild(lateSvg); } }
    };
    overlay.addLayer(layer).setView(view(), null);
    assert.strictEqual(overlay.getLayer("counting-layer"), layer, "Lookup should return exact registered layer");
    assert.strictEqual(overlay.getLayer("missing"), null, "Missing lookup should return null");
    assert.strictEqual(overlay.isLayerEnabled("missing"), false, "Missing enable state should be false");
    overlay.update({ force: true });
    const wrapper = output.parentElement;
    assert.ok(wrapper.classList.contains("wasmgpu-overlay-layer"), "System should attach each layer inside a wrapper");
    assert.notStrictEqual(attachedRoot, overlay.root, "Layer attach root should be the system-owned wrapper");
    assert.strictEqual(updateRoot, overlay.root, "Update context should retain the public system root");
    assert.strictEqual(lateSvg.parentElement, wrapper, "Late and non-HTMLElement output should remain inside the wrapper");
    const updated = updates;
    overlay.setLayerEnabled("counting-layer", false);
    assert.strictEqual(overlay.layerCount, 1, "Disabled layer should remain registered");
    assert.strictEqual(wrapper.style.display, "none", "Disabled wrapper should hide all layer output");
    assert.strictEqual(output.style.display, "flex", "Disable should preserve a layer's intentional display value");
    overlay.update({ force: true });
    assert.strictEqual(updates, updated, "Disabled layer should not update");
    assert.strictEqual(detaches, 0, "Disable should not detach");
    overlay.setLayerEnabled("counting-layer", true);
    assert.strictEqual(wrapper.style.display, "", "Re-enable should reveal the wrapper without changing child display");
    assert.strictEqual(output.style.display, "flex", "Re-enable should preserve child display semantics");
    assert.strictEqual(attaches, 1, "Re-enable should not reattach");
    assert.strictEqual(overlay.update(), true, "Re-enable should dirty the overlay");
    assert.ok(updates > updated, "Re-enable should refresh the layer");
    overlay.setLayerEnabled("counting-layer", false).removeLayer("counting-layer");
    assert.strictEqual(detaches, 1, "Remove should detach a disabled layer");
    assert.strictEqual(overlay.getLayer("counting-layer"), null, "Removed layer should no longer be discoverable");
    const cleanupLayer = { id: "cleanup-layer", node: null, attach(root) { this.node = document.createElement("div"); root.appendChild(this.node); }, detach() { detaches++; this.node?.remove(); this.node = null; }, update() {} };
    overlay.addLayer(cleanupLayer).setLayerEnabled("cleanup-layer", false).clearLayers();
    assert.strictEqual(detaches, 2, "Clear should detach disabled layers");
    overlay.addLayer({ ...cleanupLayer, id: "destroy-layer" }).setLayerEnabled("destroy-layer", false).destroy();
    assert.strictEqual(detaches, 3, "Destroy should detach a disabled layer");
}

// 3) Automatic invalidation coalesces and becomes idle instead of permanently ticking.
{
    const canvas = dom.createCanvas(320, 200);
    let updates = 0;
    const overlay = new OverlaySystem({ canvas, autoUpdate: true, camera: view() });
    overlay.addLayer({ id: "idle-layer", attach() {}, detach() {}, update() { updates++; } });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const settled = updates;
    assert.ok(settled > 0, "Automatic invalidation should schedule an update");
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.strictEqual(updates, settled, "Idle overlay should not continuously update");
    overlay.destroy();
}

// 4) Scene-fit extents and front/near-plane clipping remain bounded and recover through mutation.
{
    const canvas = dom.createCanvas(500, 320);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    let boundsReads = 0;
    const scene = { getBounds() { boundsReads++; return { empty: false, boxMin: [-2, -3, -4], boxMax: [2, 3, 4] }; } };
    const grid = new GridLayer({ plane: "xy", extentMode: "scene-fit", maxLines: 36, maxLabels: 10 });
    overlay.addLayer(grid).setView(view(), scene);
    overlay.update({ force: true });
    assert.ok(boundsReads > 0, "Scene-fit grid should read scene bounds");
    assert.ok(dom.visible(overlay.root, ".wasmgpu-overlay-grid-line").length <= 36, "Scene-fit grid should preserve line budget");
    const clippingCamera = view();
    clippingCamera.near = 0.1;
    grid.setPlane("xz").setExtentMode("fixed").setFixedExtent(-2, 2, 0.2, 1);
    overlay.setView(clippingCamera, null).update({ force: true });
    assert.strictEqual(dom.visible(overlay.root, ".wasmgpu-overlay-grid-line").length, 0, "Grid wholly behind the near plane should be suppressed");
    grid.setFixedExtent(-2, 2, -1, 1);
    assert.strictEqual(overlay.update(), true, "Clipped-extent mutation should self-invalidate");
    const clippedLines = dom.visible(overlay.root, ".wasmgpu-overlay-grid-line");
    assert.ok(clippedLines.length > 0 && clippedLines.every((line) => !line.style.transform.includes("NaN")), "Near-plane crossing grid should render finite clipped segments");
    overlay.destroy();
}

// 5) Triads preserve foreshortening and fixed signed-axis DOM across runtime mutation.
{
    const canvas = dom.createCanvas(800, 600);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    const triad = new AxisTriadLayer({ id: "signed-triad", sizePx: 60, directions: { x: "positive", y: "negative", z: "both" }, negativeLabels: ["west", "south", "depth-"] });
    overlay.addLayer(triad).setView(view(), null);
    overlay.update({ force: true });
    const container = overlay.root.querySelector(".wasmgpu-overlay-axis-triad");
    assert.ok(container, "Triad should expose a stable container class");
    assert.strictEqual(container.querySelectorAll(".wasmgpu-overlay-axis-triad-line").length, 6, "Triad should allocate six bounded signed lines");
    assert.strictEqual(container.querySelectorAll(".wasmgpu-overlay-axis-triad-arrowhead").length, 6, "Triad should allocate six bounded arrows");
    assert.strictEqual(container.querySelectorAll(".wasmgpu-overlay-axis-triad-origin").length, 1, "Triad should allocate one origin marker");
    assert.strictEqual(dom.visible(container, ".wasmgpu-overlay-axis-triad-line").length, 2, "View-aligned Z directions should foreshorten below the visibility threshold");
    const xLine = container.querySelector(".wasmgpu-overlay-axis-triad-line.wasmgpu-overlay-axis-triad-x.wasmgpu-overlay-axis-triad-positive");
    const xArrow = container.querySelector(".wasmgpu-overlay-axis-triad-arrowhead.wasmgpu-overlay-axis-triad-x.wasmgpu-overlay-axis-triad-positive");
    assert.ok(parseFloat(xLine.style.width) > 50, "View-plane X should approach configured size");
    assert.ok(Math.abs((parseFloat(xLine.style.left) + parseFloat(xLine.style.width)) - parseFloat(xArrow.style.left)) < 1e-6, "Identity +X shaft endpoint should equal arrow base");
    assert.ok(Math.abs((parseFloat(xArrow.style.left) + parseFloat(xArrow.style.width)) - 86) < 1e-6, "Identity +X arrow tip should equal the projected axis endpoint");
    assert.ok(dom.visible(container, ".wasmgpu-overlay-axis-triad-label").some((el) => el.textContent === "south"), "Custom signed label should render");
    const nodes = dom.countNodes(container);
    triad.setDirections({ x: "both", y: "both", z: "none" }).setClassName("triad-runtime").setStyle({ label: { fontWeight: "700" }, originMarker: { background: "rgb(255, 255, 0)" } });
    assert.strictEqual(overlay.update(), true, "Triad mutation should self-invalidate");
    assert.strictEqual(dom.visible(container, ".wasmgpu-overlay-axis-triad-line.wasmgpu-overlay-axis-triad-x").length, 2, "Both X directions should show both signed lines");
    assert.strictEqual(dom.visible(container, ".wasmgpu-overlay-axis-triad-z").length, 0, "None direction should hide every Z element");
    assert.strictEqual(dom.countNodes(container), nodes, "Direction/style mutation should not grow triad DOM");
    assert.strictEqual(container.querySelector(".wasmgpu-overlay-axis-triad-label").style.fontWeight, "700", "Runtime label style should apply");
    assert.ok(container.classList.contains("triad-runtime"), "Triad class name should be mutable");
    triad.setStyle({ label: { color: "rgb(255, 0, 0)" } });
    overlay.update();
    assert.notStrictEqual(container.querySelector(".wasmgpu-overlay-axis-triad-label").style.fontWeight, "700", "Triad replacement style should clear omitted properties");
    overlay.destroy();
}

// 6) World-anchored triad should hide when clip-W goes behind camera.
{
    const canvas = dom.createCanvas(800, 600);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    const triad = new AxisTriadLayer({ anchor: { kind: "world", position: [0, 0, 0] }, lengthWorld: 1 });
    const camera = view([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], "perspective");
    overlay.addLayer(triad);
    overlay.setView(camera, null);
    overlay.update({ force: true });
    const visibleFront = dom.countVisibleLines(overlay.root);
    assert.ok(visibleFront >= 3, "Expected visible triad lines when in front");
    camera.setViewProjection([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1]);
    overlay.invalidate("camera");
    overlay.update({ force: true });
    const visibleBack = dom.countVisibleLines(overlay.root);
    assert.ok(visibleBack < visibleFront, "Expected fewer visible lines when anchor is behind");
    overlay.destroy();
}

// 7) Grid formatting, metadata, sides, collision filtering, styling, and mutation are bounded.
{
    const canvas = dom.createCanvas(360, 260);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    const calls = [];
    const grid = new GridLayer({
        extentMode: "fixed", fixedUMin: -1, fixedUMax: 1, fixedVMin: -1, fixedVMax: 1,
        targetMinorSpacingPx: 12, majorStepFactor: 2, minLabelSpacingPx: 8, maxLines: 40, maxLabels: 14,
        tickFormatter: (value, axis) => { calls.push(axis); return `${axis}:${value.toFixed(2)}-long-label`; },
        uAxis: { name: "Longitude", unit: "m", labelSide: "min" }, vAxis: { name: "Latitude", unit: "s", labelSide: "none" }
    });
    overlay.addLayer(grid).setView(view(), null);
    overlay.update({ force: true });
    assert.ok(calls.includes("u"), "Formatter should receive U identity");
    assert.ok(calls.every((axis) => axis === "u"), "Formatter should only run for renderable U candidates when V labels are disabled");
    assert.ok(Array.from(overlay.root.querySelectorAll(".wasmgpu-overlay-grid-axis-title")).some((el) => el.textContent === "Longitude (m)"), "Grid metadata should render name and unit");
    assert.strictEqual(dom.visible(overlay.root, '[data-side^="v-"]').length, 0, "V none side should hide V labels");
    const tickLabels = dom.visible(overlay.root, ".wasmgpu-overlay-grid-tick-label");
    const candidateCount = Number(overlay.root.querySelector(".wasmgpu-overlay-grid").dataset.labelCandidateCount);
    assert.strictEqual(candidateCount, calls.length, "One enabled side should produce one renderable candidate per formatter call");
    assert.ok(tickLabels.length < candidateCount, "Long labels on the enabled side should be collision-suppressed");
    assert.ok(tickLabels.length <= 14, "Label budget should remain bounded");
    for (const side of new Set(tickLabels.map((el) => el.dataset.side))) {
        const rectangles = dom.visible(overlay.root, `[data-side="${side}"]`).map((el) => el.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
        for (let i = 0; i < rectangles.length; i++) for (let j = i + 1; j < rectangles.length; j++) assert.ok(rectangles[i].right <= rectangles[j].left || rectangles[j].right <= rectangles[i].left || rectangles[i].bottom <= rectangles[j].top || rectangles[j].bottom <= rectangles[i].top, `Visible ${side} grid labels should not overlap`);
    }
    const gridStyle = { tickLabel: { fontWeight: "700" }, axisTitle: { color: "rgb(255, 255, 0)" } };
    grid.setLabelSides("max", "both").setTickFormatter((value, axis) => `${axis.toUpperCase()}=${value}`).setClassName("grid-runtime").setStyle(gridStyle);
    assert.strictEqual(overlay.update(), true, "Grid mutation should self-invalidate");
    assert.ok(dom.visible(overlay.root, '[data-side="v-max"]').length > 0, "V max side should render after mutation");
    assert.ok(overlay.root.querySelector(".wasmgpu-overlay-grid").classList.contains("grid-runtime"), "Grid class name should be mutable");
    const nodeCount = dom.countNodes(overlay.root);
    overlay.update({ force: true });
    assert.strictEqual(dom.countNodes(overlay.root), nodeCount, "Repeated grid mutation/update should reuse bounded pools");
    grid.setStyle({ tickLabel: { color: "rgb(255, 0, 0)" } });
    overlay.update();
    assert.notStrictEqual(overlay.root.querySelector(".wasmgpu-overlay-grid-tick-label")?.style.fontWeight, "700", "Grid replacement style should clear omitted properties");
    assert.strictEqual(overlay.update(), false, "An idle grid should not update");
    grid.setLabelSides("max", "both").setPlane("xy").setStyle({ tickLabel: { color: "rgb(255, 0, 0)" } });
    assert.strictEqual(overlay.update(), false, "Obvious grid no-op setters should not invalidate");
    overlay.destroy();
}

// 8) Dense scene-fit labels remain two-phase/bounded across repeated zoom changes.
{
    const canvas = dom.createCanvas(640, 420);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    const camera = view();
    const scene = { getBounds() { return { empty: false, boxMin: [-100, -100, -1], boxMax: [100, 100, 1] }; } };
    const grid = new GridLayer({
        plane: "xy", extentMode: "scene-fit", targetMinorSpacingPx: 8, majorStepFactor: 2, minLabelSpacingPx: 8,
        maxLines: 120, maxLabels: 50, tickFormatter: (value, axis) => `${axis}:${value.toFixed(5)}-dense-scene-fit-label`,
        uAxis: { name: "Dense U", unit: "m", labelSide: "both" }, vAxis: { name: "Dense V", unit: "m", labelSide: "both" }
    });
    overlay.addLayer(grid).setView(camera, scene);
    for (let i = 0; i < 28; i++) {
        const scale = 0.002 * Math.pow(1.18, i);
        camera.setViewProjection([scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        overlay.invalidate("camera");
        assert.strictEqual(overlay.update(), true, `Dense grid zoom update ${i} should complete`);
        const gridRoot = overlay.root.querySelector(".wasmgpu-overlay-grid");
        assert.ok(gridRoot.querySelectorAll(".wasmgpu-overlay-grid-tick-label, .wasmgpu-overlay-grid-axis-title").length <= 50, "Dense grid label pool should never exceed maxLabels");
        assert.ok(Number(gridRoot.dataset.labelAcceptedCount) <= 50, "Two-phase selection should cap accepted labels before DOM acquisition");
    }
    overlay.destroy();
}

// 9) Legend should render vertical/horizontal gradients, metadata, styles, and DPR backing.
{
    const dprDescriptor = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
    const canvas = dom.createCanvas(700, 420);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    const source = new PointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.5, 0, 1, 0, 0.9]), keepCPUData: true, scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 } });
    const subscribe = source.onVisualChange.bind(source);
    let sourceSubscriptions = 0;
    source.onVisualChange = (listener) => { sourceSubscriptions++; const unsubscribe = subscribe(listener); return () => { sourceSubscriptions--; unsubscribe(); }; };
    const legend = new LegendLayer({ id: "legend-test", title: "Legend", source, widthPx: 20, heightPx: 120, tickCount: 5, subtitle: "Measured samples", units: "kelvin" });
    overlay.addLayer(legend);
    assert.strictEqual(sourceSubscriptions, 1, "Attach should establish one source subscription");
    overlay.setView(view(), null);
    overlay.update({ force: true });
    const legendCanvas = dom.getFirstCanvas(overlay.root);
    assert.ok(legendCanvas, "Legend should create a canvas");
    const ctx = legendCanvas.getContext("2d", { willReadFrequently: true });
    const verticalPixels = ctx?.getImageData(0, 0, 1, legendCanvas.height).data;
    const pixel = verticalPixels?.slice(0, 4);
    const lowVertical = verticalPixels?.slice(-4);
    assert.ok(pixel && pixel[3] > 0, "Legend should render gradient image data");
    assert.ok(overlay.root.querySelector(".wasmgpu-overlay-legend-subtitle")?.textContent === "Measured samples", "Legend subtitle should render");
    assert.ok(overlay.root.querySelector(".wasmgpu-overlay-legend-units")?.textContent === "kelvin", "Legend units should render independently");
    const verticalContainerRect = overlay.root.querySelector(".wasmgpu-overlay-legend").getBoundingClientRect();
    const verticalUnitsRect = overlay.root.querySelector(".wasmgpu-overlay-legend-units").getBoundingClientRect();
    assert.ok(verticalUnitsRect.bottom <= verticalContainerRect.bottom + 0.5, "Vertical units should participate in the legend container footprint");
    legend.setOrientation("horizontal").setGradientSize(120, 20).setTitle("Horizontal").setSubtitle("Runtime").setUnits("K").setClassName("legend-runtime").setStyle({ tickLabel: { fontWeight: "700" } });
    assert.strictEqual(overlay.update(), true, "Legend mutation should self-invalidate");
    assert.strictEqual(legendCanvas.style.width, "120px", "Horizontal CSS width should use explicit size");
    assert.strictEqual(legendCanvas.style.height, "20px", "Horizontal CSS height should use explicit size");
    assert.strictEqual(legendCanvas.width, Math.round(120 * window.devicePixelRatio), "Canvas backing width should use DPR");
    const horizontalPixels = ctx?.getImageData(0, 0, legendCanvas.width, 1).data;
    const lowHorizontal = horizontalPixels?.slice(0, 4);
    const highHorizontal = horizontalPixels?.slice(-4);
    assert.ok(rgbaApproxEqual(lowHorizontal, lowVertical), "Horizontal low value should match vertical bottom at the left");
    assert.ok(rgbaApproxEqual(highHorizontal, pixel), "Horizontal high value should match vertical top at the right");
    const horizontalMarks = dom.visible(overlay.root, ".wasmgpu-overlay-legend-tick-mark");
    assert.ok(horizontalMarks.every((el) => el.style.width === "1px" && el.style.height === "8px"), "Horizontal ticks should use vertical marks");
    const horizontalLabels = dom.visible(overlay.root, ".wasmgpu-overlay-legend-tick-label");
    for (let i = 1; i < horizontalLabels.length; i++) assert.ok(horizontalLabels[i - 1].getBoundingClientRect().right <= horizontalLabels[i].getBoundingClientRect().left, "Horizontal tick labels should not overlap");
    assert.strictEqual(overlay.root.querySelector(".wasmgpu-overlay-legend-tick-label")?.style.fontWeight, "700", "Legend runtime style should apply");
    assert.ok(overlay.root.querySelector(".wasmgpu-overlay-legend").classList.contains("legend-runtime"), "Legend class name should be mutable");
    legend.setStyle({ tickLabel: { color: "rgb(255, 0, 0)" } });
    overlay.update();
    assert.notStrictEqual(overlay.root.querySelector(".wasmgpu-overlay-legend-tick-label")?.style.fontWeight, "700", "Legend replacement style should clear omitted properties");
    legend.setGradientSize(16, 20);
    overlay.update();
    assert.ok(dom.visible(overlay.root, ".wasmgpu-overlay-legend-tick-label").length <= 1, "Extremely narrow horizontal legends should not force overlapping endpoint labels");
    legend.setGradientSize(120, 20);
    overlay.update();
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
    overlay.invalidate("viewport");
    assert.strictEqual(overlay.update(), true, "DPR change should refresh the legend");
    assert.strictEqual(legendCanvas.width, 240, "DPR change should refresh backing width without changing CSS width");
    assert.strictEqual(legendCanvas.style.width, "120px", "DPR change should preserve CSS-space width");
    source.setScaleTransform({ componentCount: 4, componentIndex: 3, stride: 4, offset: 0, mode: "log", clampMode: "none", domainMin: 0.01, domainMax: 1.0, logBase: 10 });
    assert.strictEqual(overlay.update({ force: true }), true, "Legend update should run after source scale change");
    overlay.removeLayer("legend-test");
    assert.strictEqual(sourceSubscriptions, 0, "Detach should remove the source subscription");
    overlay.addLayer(legend);
    assert.strictEqual(sourceSubscriptions, 1, "Reattach should restore exactly one source subscription");
    source.setScaleTransform({ componentCount: 4, componentIndex: 3, stride: 4, offset: 0, mode: "linear" });
    assert.strictEqual(overlay.update(), true, "Reattached legend should still self-invalidate from source changes");
    const source2 = new PointCloud({ data: new Float32Array([0, 0, 0, 0.25]), keepCPUData: true, scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 } });
    legend.setSource(source2);
    assert.strictEqual(sourceSubscriptions, 0, "Source mutation should unsubscribe the previous source");
    assert.strictEqual(overlay.update(), true, "Source mutation should self-invalidate");
    overlay.destroy();
    assert.strictEqual(sourceSubscriptions, 0, "Destroy should remove the reattached subscription");
    if (dprDescriptor) Object.defineProperty(window, "devicePixelRatio", dprDescriptor);
    else delete window.devicePixelRatio;
}

// 10) Cleanup removes every real DOM root created by the overlay themes.
{
    dom.restore();
}
