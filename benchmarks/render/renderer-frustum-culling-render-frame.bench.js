/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "renderer-frustum-culling-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency with frustum culling active over visible and out-of-frustum Mesh candidates, including GPU completion.",
    sizes: { quick: [128, 1_024], full: [128, 2_048, 8_192] },
    warmup: { quick: 8, full: 12 },
    gpu: false,
    async setup({ WasmGPU }, size) {
        const canvas = document.querySelector("canvas");
        canvas.style.width = "800px";
        canvas.style.height = "600px";
        const engine = await WasmGPU.WasmGPU.create(canvas, { antialias: false, frustumCulling: true, frustumCullingStats: true });
        const scene = engine.createScene([0.02, 0.02, 0.02]);
        const camera = engine.createCamera.perspective({ fov: 50, near: 0.1, far: 2_000 });
        camera.transform.setPosition(0, 0, 12);
        camera.lookAt(0, 0, 0);
        const geometry = engine.geometry.box(0.12, 0.12, 0.12);
        const material = engine.material.unlit();
        const visible = Math.floor(size / 2);
        for (let i = 0; i < size; i++) {
            if (i > 0) {
                geometry.retain();
                material.retain();
            }
            const local = i % Math.max(1, visible);
            const position = i < visible ? [((local % 10) - 5) * 0.25, ((Math.floor(local / 10) % 10) - 5) * 0.25, -(Math.floor(local / 100) % 8) * 0.1] : [1_000 + i, 0, 0];
            const mesh = engine.createMesh(geometry, material);
            mesh.transform.setPosition(...position);
            scene.add(mesh);
        }
        engine.render(scene, camera);
        await engine.gpu.queue.onSubmittedWorkDone();
        const stats = engine.cullingStats.frustum;
        if (stats.tested !== size || stats.visible <= 0 || stats.visible >= stats.tested) throw new Error(`Frustum benchmark did not exercise both outcomes: ${JSON.stringify(stats)}`);
        return {
            engine,
            scene,
            camera,
            frustum: { ...stats }
        };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(size, state) { return { candidateMeshes: size, intendedVisible: Math.floor(size / 2), intendedCulled: size - Math.floor(size / 2), verifiedVisible: state.frustum.visible, verifiedCulled: state.frustum.tested - state.frustum.visible, viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
