/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "renderer-pointcloud-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Renderer frame latency for one opaque PointCloud workload, including command submission and GPU completion.",
    sizes: { quick: [4_096, 65_536], full: [65_536, 262_144, 1_048_576] },
    warmup: { quick: 8, full: 12 },
    gpu: false,
    async setup({ WasmGPU }, size) {
        const canvas = document.querySelector("canvas"), engine = await WasmGPU.WasmGPU.create(canvas, { antialias: false, frustumCulling: false });
        const scene = engine.createScene([0.02, 0.02, 0.02]), camera = engine.createCamera.perspective({ fov: 50, near: 0.1, far: 100 });
        camera.transform.setPosition(0, 0, 8); camera.lookAt(0, 0, 0);
        const data = new Float32Array(size * 4);
        for (let i = 0; i < size; i++) { data[i * 4] = ((i % 256) - 128) / 32; data[i * 4 + 1] = ((Math.floor(i / 256) % 256) - 128) / 32; data[i * 4 + 3] = 2; }
        scene.add(engine.createPointCloud({ data, basePointSize: 2, scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4 } }));
        engine.render(scene, camera); await engine.gpu.queue.onSubmittedWorkDone();
        return { engine, scene, camera };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(size) { return { renderedPointClouds: 1, points: size, viewport: [800, 600] }; },
    teardown(state) { state.engine.destroy(); }
};
