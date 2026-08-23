/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "renderer-mesh-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency for one opaque indexed Mesh, including command submission and GPU completion.",
    sizes: { quick: [32_768, 262_144], full: [262_144, 2_097_152, 8_388_608] },
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
        const segments = Math.max(1, Math.floor(Math.sqrt(size / 2)));
        const geometry = engine.geometry.plane(8, 8, segments, segments);
        const material = engine.material.unlit({ color: [0.3, 0.7, 0.95] });
        const mesh = engine.createMesh(geometry, material);
        mesh.transform.rotateX(Math.PI * 0.5);
        scene.add(mesh);
        engine.render(scene, camera);
        await engine.gpu.queue.onSubmittedWorkDone();
        return {
            engine,
            scene,
            camera,
            triangles: segments * segments * 2,
            vertices: geometry.vertexCount
        };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(_size, state) { return { renderedMeshes: 1, vertices: state.vertices, triangles: state.triangles, viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
