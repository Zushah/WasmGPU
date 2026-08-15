/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../release/WasmGPU.js";

const view = (vp = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], view = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], type = "perspective") => ({
    type,
    get viewProjectionMatrix() { return vp; },
    get viewMatrix() { return view; },
    setViewProjection(next) { vp = next; }
});

const createDOMTestScope = () => {
    const roots = [];
    const countNodes = (node) => {
        let total = 1;
        for (const child of node.children ?? []) total += countNodes(child);
        return total;
    };

    const countVisibleLines = (node) => {
        let total = 0;
        const stack = [node];
        while (stack.length > 0) {
            const cur = stack.pop();
            for (const child of cur.children ?? []) stack.push(child);
            if (typeof cur?.style?.width === "string" && cur.style.width.endsWith("px") && cur.style.display !== "none") total++;
        }
        return total;
    };

    const countVisibleLabels = (node) => {
        let total = 0;
        const stack = [node];
        while (stack.length > 0) {
            const cur = stack.pop();
            for (const child of cur.children ?? []) stack.push(child);
            if (typeof cur?.textContent === "string" && cur.textContent.length > 0 && cur.style?.display !== "none") total++;
        }
        return total;
    };

    const getFirstCanvas = (node) => {
        const stack = [node];
        while (stack.length > 0) {
            const cur = stack.pop();
            if (cur.tagName === "CANVAS") return cur;
            for (const child of cur.children ?? []) stack.push(child);
        }
        return null;
    };

    return {
        createCanvas(width = 800, height = 600) {
            const root = document.createElement("div");
            root.style.position = "relative";
            document.body.appendChild(root);
            roots.push(root);
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON() {} });
            Object.defineProperties(canvas, {
                clientWidth: { configurable: true, get: () => width },
                clientHeight: { configurable: true, get: () => height }
            });
            root.appendChild(canvas);
            return canvas;
        },
        countNodes,
        countVisibleLines,
        countVisibleLabels,
        getFirstCanvas,
        restore() {
            for (const root of roots) root.remove();
        }
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
    const grid = new GridLayer({
        extentMode: "fixed",
        fixedUMin: -8,
        fixedUMax: 8,
        fixedVMin: -8,
        fixedVMax: 8,
        maxLines: 40,
        maxLabels: 12
    });
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

// 2) World-anchored triad should hide when clip-W goes behind camera.
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

// 3) Legend should render a gradient canvas from a valid source.
{
    const canvas = dom.createCanvas(700, 420);
    const overlay = new OverlaySystem({ canvas, autoUpdate: false });
    const source = new PointCloud({
        data: new Float32Array([
            0, 0, 0, 0.1,
            1, 0, 0, 0.5,
            0, 1, 0, 0.9
        ]),
        keepCPUData: true,
        scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 }
    });
    const legend = new LegendLayer({
        id: "legend-test",
        title: "Legend",
        source,
        widthPx: 20,
        heightPx: 120,
        tickCount: 5
    });
    overlay.addLayer(legend);
    overlay.setView(view(), null);
    overlay.update({ force: true });
    const legendCanvas = dom.getFirstCanvas(overlay.root);
    assert.ok(legendCanvas, "Legend should create a canvas");
    const ctx = legendCanvas.getContext("2d");
    const pixel = ctx?.getImageData(0, 0, 1, 1).data;
    assert.ok(pixel && pixel[3] > 0, "Legend should render gradient image data");
    source.setScaleTransform({ componentCount: 4, componentIndex: 3, stride: 4, offset: 0, mode: "log", clampMode: "none", domainMin: 0.01, domainMax: 1.0, logBase: 10 });
    overlay.invalidate("scale");
    assert.strictEqual(overlay.update({ force: true }), true, "Legend update should run after source scale change");
    overlay.destroy();
}

// 4) Cleanup removes every real DOM root created by the overlay themes.
{
    dom.restore();
}
