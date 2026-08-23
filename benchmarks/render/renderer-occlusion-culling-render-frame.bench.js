/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "renderer-occlusion-culling-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Steady-state complete Renderer frame latency with previous-frame occlusion filtering verified active, including GPU completion.",
    sizes: { quick: [64, 256], full: [64, 512, 2_048] },
    warmup: { quick: 8, full: 12 },
    gpu: false,
    async setup({ WasmGPU }, size) {
        const canvas = document.querySelector("canvas");
        canvas.style.width = "800px";
        canvas.style.height = "600px";
        const engine = await WasmGPU.WasmGPU.create(canvas, { antialias: false, frustumCulling: false, occlusionCulling: true, occlusionCullingStats: true });
        const scene = engine.createScene([0.02, 0.02, 0.02]);
        const camera = engine.createCamera.perspective({ fov: 50, near: 0.1, far: 2_000 });
        camera.transform.setPosition(0, 0, 12);
        camera.lookAt(0, 0, 0);
        const material = engine.material.unlit({ color: [0.25, 0.25, 0.28] });
        const occluder = engine.createMesh(engine.geometry.box(9, 9, 0.5), material);
        scene.add(occluder);
        const geometry = engine.geometry.box(0.18, 0.18, 0.18);
        const side = Math.ceil(Math.sqrt(size));
        for (let i = 0; i < size; i++) {
            if (i > 0) geometry.retain();
            material.retain();
            const mesh = engine.createMesh(geometry, material);
            mesh.transform.setPosition(((i % side) - side / 2) * (4 / side), (Math.floor(i / side) - side / 2) * (4 / side), -3 - (i % 4) * 0.1);
            scene.add(mesh);
        }
        for (let i = 0; i < 16; i++) {
            engine.render(scene, camera);
            await engine.gpu.queue.onSubmittedWorkDone();
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        const stats = engine.cullingStats.occlusion;
        if (stats.tested <= 0 || stats.occluded <= 0) throw new Error(`Occlusion benchmark did not reach an actually occluding steady state: ${JSON.stringify(stats)}`);
        return {
            engine,
            scene,
            camera,
            occlusion: { ...stats }
        };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(size, state) { return { occluders: 1, occludedCandidateMeshes: size, verifiedTested: state.occlusion.tested, verifiedOccluded: state.occlusion.occluded, viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
