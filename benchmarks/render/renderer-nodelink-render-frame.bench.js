/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeGraphData } from "./helpers.js";

export default {
    name: "renderer-nodelink-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency for one static opaque NodeLink graph, including command submission and GPU completion.",
    sizes: { quick: [1_024, 8_192], full: [1_024, 16_384, 65_536] },
    warmup: { quick: 8, full: 12 },
    gpu: false,
    async setup({ WasmGPU }, size) {
        const canvas = document.querySelector("canvas");
        canvas.style.width = "800px";
        canvas.style.height = "600px";
        const engine = await WasmGPU.WasmGPU.create(canvas, { antialias: false, frustumCulling: false });
        const scene = engine.createScene([0.02, 0.02, 0.02]);
        const camera = engine.createCamera.perspective({ fov: 50, near: 0.1, far: 2_000 });
        camera.transform.setPosition(0, 0, 12);
        camera.lookAt(0, 0, 0);
        const data = makeGraphData(size);
        scene.add(engine.createNodeLink({
            ...data,
            nodeGeometryMode: "spheres",
            edgeGeometryMode: "cylinders",
            nodeColorMode: "scalar",
            nodeScaleTransform: {
                componentCount: 1,
                stride: 1,
                domainMin: 0,
                domainMax: 1
            },
            blendMode: "opaque",
            nodeSize: 0.08,
            edgeSize: 0.025
        }));
        engine.render(scene, camera);
        await engine.gpu.queue.onSubmittedWorkDone();
        return { engine, scene, camera, edgeCount: data.edgeCount };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(size, state) { return { renderedNodeLinks: 1, nodes: size, edges: state.edgeCount, nodeMode: "spheres", edgeMode: "cylinders", viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
