/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "renderer-antialias-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency with SMAA antialias post-processing over a fixed scene, including GPU completion.",
    sizes: { quick: [800, 1_280], full: [1_280, 2_400, 3_200] },
    warmup: { quick: 8, full: 12 },
    gpu: false,
    async setup({ WasmGPU }, size) {
        const viewport = [size, Math.round(size * 0.75)];
        const canvas = document.querySelector("canvas");
        canvas.style.width = `${viewport[0]}px`;
        canvas.style.height = `${viewport[1]}px`;
        const engine = await WasmGPU.WasmGPU.create(canvas, { antialias: true, frustumCulling: false });
        const scene = engine.createScene([0.02, 0.02, 0.02]);
        const camera = engine.createCamera.perspective({ fov: 50, near: 0.1, far: 2_000 });
        camera.transform.setPosition(0, 0, 12);
        camera.lookAt(0, 0, 0);
        const geometry = engine.geometry.torus(2.5, 0.7, 24, 96);
        const material = engine.material.unlit({ color: [0.3, 0.8, 0.95] });
        scene.add(engine.createMesh(geometry, material));
        engine.render(scene, camera);
        await engine.gpu.queue.onSubmittedWorkDone();
        return { engine, scene, camera, viewport };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(_size, state) { return { antialias: true, postprocess: "SMAA", renderedMeshes: 1, viewport: state.viewport, pixels: state.viewport[0] * state.viewport[1] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
