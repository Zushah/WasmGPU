/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makePointData } from "./helpers.js";

const POINTS_PER_CLOUD = 64;

export default {
    name: "renderer-many-pointclouds-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency for many static opaque PointCloud objects with constant points per cloud, including GPU completion.",
    sizes: { quick: [16, 128], full: [16, 256, 1_024] },
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
        const data = makePointData(POINTS_PER_CLOUD, 0, 0.12);
        const side = Math.ceil(Math.sqrt(size));
        for (let i = 0; i < size; i++) {
            const cloud = engine.createPointCloud({
                data,
                blendMode: "opaque",
                depthWrite: true,
                basePointSize: 2,
                boundsCenter: [0, 0, 0],
                boundsRadius: 0.2,
                scaleTransform: {
                    componentCount: 4,
                    componentIndex: 3,
                    stride: 4,
                    domainMin: 0,
                    domainMax: 1
                }
            });
            cloud.transform.setPosition(((i % side) - side / 2) * 0.25, (Math.floor(i / side) - side / 2) * 0.25, 0);
            scene.add(cloud);
        }
        engine.render(scene, camera);
        await engine.gpu.queue.onSubmittedWorkDone();
        return { engine, scene, camera };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(size) { return { renderedPointClouds: size, pointsPerCloud: POINTS_PER_CLOUD, totalPoints: size * POINTS_PER_CLOUD, viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
