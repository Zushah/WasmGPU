/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "renderer-transmission-mesh-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency for StandardMaterial optical transmission targets and draws, including GPU completion.",
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
        scene.addLight(engine.createLight.ambient({ intensity: 0.8 }));
        const backdrop = engine.createMesh(engine.geometry.plane(10, 8, 16, 16), engine.material.unlit({ color: [0.15, 0.5, 0.9] }));
        backdrop.transform.setPosition(0, 0, -2);
        scene.add(backdrop);
        const geometry = engine.geometry.sphere(0.18, 12, 8);
        const material = engine.material.standard({
            color: [0.8, 0.95, 1],
            opacity: 0.7,
            blendMode: "transparent",
            depthWrite: false,
            roughness: 0.15,
            extensions: {
                transmission: { factor: 0.75 }
            }
        });
        if (!material.usesTransmissionLayout()) throw new Error("Transmission benchmark material did not select the optical transmission layout.");
        const side = Math.ceil(Math.sqrt(size));
        for (let i = 0; i < size; i++) {
            if (i > 0) {
                geometry.retain();
                material.retain();
            }
            const mesh = engine.createMesh(geometry, material);
            mesh.transform.setPosition(((i % side) - side / 2) * 0.32, (Math.floor(i / side) - side / 2) * 0.32, -(i % 16) * 0.03);
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
    workload(size) { return { transmissiveMeshes: size, transmissionFactor: 0.75, sphereTrianglesPerMesh: 192, viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
