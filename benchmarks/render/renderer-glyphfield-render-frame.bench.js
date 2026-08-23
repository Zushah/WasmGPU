/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeGlyphData } from "./helpers.js";

export default {
    name: "renderer-glyphfield-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency for one static opaque GlyphField, including command submission and GPU completion.",
    sizes: { quick: [4_096, 32_768], full: [16_384, 131_072, 524_288] },
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
        const data = makeGlyphData(size);
        scene.add(engine.createGlyphField({
            shape: "arrow",
            ...data,
            instanceCount: size,
            colorMode: "scalar",
            blendMode: "opaque",
            scaleTransform: {
                componentCount: 4,
                componentIndex: 3,
                stride: 4,
                domainMin: 0,
                domainMax: 1
            }
        }));
        engine.render(scene, camera);
        await engine.gpu.queue.onSubmittedWorkDone();
        return { engine, scene, camera };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(size) { return { renderedGlyphFields: 1, glyphs: size, shape: "arrow", viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
