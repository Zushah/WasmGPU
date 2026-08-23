/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const SHADOW_MAP_SIZE = 1_024;

export default {
    name: "renderer-directional-shadows-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency with recurring directional shadow-map rendering, submission, and GPU completion.",
    sizes: { quick: [8, 64], full: [8, 128, 512] },
    warmup: { quick: 8, full: 12 },
    gpu: false,
    async setup({ WasmGPU }, size) {
        const canvas = document.querySelector("canvas");
        canvas.style.width = "800px";
        canvas.style.height = "600px";
        const engine = await WasmGPU.WasmGPU.create(canvas, { antialias: false, frustumCulling: false });
        const scene = engine.createScene([0.02, 0.02, 0.02]);
        const camera = engine.createCamera.perspective({ fov: 50, near: 0.1, far: 2_000 });
        camera.transform.setPosition(7, 7, 12);
        camera.lookAt(0, 0, 0);
        const sun = engine.createLight.directional({ direction: [-1, -2, -1], intensity: 2 });
        scene.addLight(engine.createLight.ambient({ intensity: 0.25 })).addLight(sun);
        engine.effects.shadows.mapSize = SHADOW_MAP_SIZE;
        engine.effects.shadows.enable(sun, { updateMode: "always", distance: 40 });
        if (engine.effects.shadows.get(sun)?.updateMode !== "always") throw new Error("Directional shadow benchmark requires recurring updates.");
        const material = engine.material.standard({ color: [0.65, 0.68, 0.72], roughness: 0.9 });
        const ground = engine.createMesh(engine.geometry.box(9, 0.1, 9), material);
        ground.transform.setPosition(0, -2, 0);
        scene.add(ground);
        const geometry = engine.geometry.box(0.35, 0.7, 0.35);
        const side = Math.ceil(Math.sqrt(size));
        for (let i = 0; i < size; i++) {
            if (i > 0) geometry.retain();
            material.retain();
            const mesh = engine.createMesh(geometry, material);
            mesh.transform.setPosition(((i % side) - side / 2) * 0.55, -1.6, (Math.floor(i / side) - side / 2) * 0.55);
            scene.add(mesh);
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
    workload(size) { return { renderedMeshes: size + 1, shadowViews: 1, shadowMapSize: SHADOW_MAP_SIZE, updateMode: "always", viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
