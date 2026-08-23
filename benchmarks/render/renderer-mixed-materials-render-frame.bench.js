/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const MATERIAL_COUNT = 4;

export default {
    name: "renderer-mixed-materials-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency for many simple Mesh objects across four distinct material pipeline configurations, including GPU completion.",
    sizes: { quick: [64, 512], full: [64, 1_024, 4_096] },
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
        scene.addLight(engine.createLight.ambient({ intensity: 0.7 }));
        const geometry = engine.geometry.box(0.12, 0.12, 0.12);
        const materials = [
            engine.material.unlit({ color: [0.9, 0.3, 0.2] }),
            engine.material.unlit({ color: [0.2, 0.8, 0.4], cullMode: "none" }),
            engine.material.standard({ color: [0.3, 0.5, 0.95], roughness: 0.8 }),
            engine.material.standard({ color: [0.8, 0.75, 0.25], metallic: 0.6, roughness: 0.3, cullMode: "none" })
        ];
        const uses = new Array(materials.length).fill(0);
        const side = Math.ceil(Math.sqrt(size));
        for (let i = 0; i < size; i++) {
            if (i > 0) geometry.retain();
            const materialIndex = i % materials.length;
            const material = materials[materialIndex];
            if (uses[materialIndex] > 0) material.retain();
            uses[materialIndex]++;
            const mesh = engine.createMesh(geometry, material);
            mesh.transform.setPosition(((i % side) - side / 2) * 0.16, (Math.floor(i / side) - side / 2) * 0.16, 0);
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
    workload(size) { return { renderedMeshes: size, materials: MATERIAL_COUNT, pipelineConfigurations: MATERIAL_COUNT, aggregateTriangles: size * 12, viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
