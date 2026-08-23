/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeSplatData } from "./helpers.js";

export default {
    name: "renderer-splatfield-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency for one static SplatField with its normal GPU sort, submission, and completion.",
    sizes: { quick: [4_096, 65_536], full: [65_536, 262_144, 1_048_576] },
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
        scene.add(engine.createSplatField({
            ...makeSplatData(size),
            colorSpace: "linear",
            opacityScale: 1
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
    workload(size) { return { renderedSplatFields: 1, splats: size, sphericalHarmonicsDegree: 0, viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
