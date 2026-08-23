/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "renderer-data-material-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency for static scalar geometry through the public DataMaterial shader path, including GPU completion.",
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
        const data = new Float32Array(geometry.vertexCount);
        for (let i = 0; i < data.length; i++) data[i] = (i % 1_024) / 1_023;
        const material = engine.material.data({
            data,
            colormap: "viridis",
            shading: 0.5,
            scaleTransform: {
                componentCount: 1,
                componentIndex: 0,
                stride: 1,
                domainMin: 0,
                domainMax: 1,
                clampMode: "range",
                clampMin: 0,
                clampMax: 1
            }
        });
        const mesh = engine.createMesh(geometry, material);
        mesh.transform.rotateX(Math.PI * 0.5);
        scene.add(mesh);
        engine.render(scene, camera);
        await engine.gpu.queue.onSubmittedWorkDone();
        return {
            engine,
            scene,
            camera,
            vertices: geometry.vertexCount,
            triangles: segments * segments * 2
        };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(_size, state) { return { dataMaterialMeshes: 1, scalarElements: state.vertices, vertices: state.vertices, triangles: state.triangles, colormap: "viridis", viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
