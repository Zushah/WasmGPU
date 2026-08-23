/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "renderer-many-meshes-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency for many opaque Mesh objects sharing geometry and material, including GPU completion.",
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
        const geometry = engine.geometry.box(0.12, 0.12, 0.12);
        const material = engine.material.unlit({ color: [0.35, 0.75, 0.95] });
        const side = Math.ceil(Math.sqrt(size));
        for (let i = 0; i < size; i++) {
            if (i > 0) {
                geometry.retain();
                material.retain();
            }
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
    workload(size) { return { renderedMeshes: size, aggregateTriangles: size * 12, trianglesPerMesh: 12, viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
