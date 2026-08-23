/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "renderer-latticespace-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete Renderer frame latency for one static transparent scalar LatticeSpace volume, including sorting, submission, and GPU completion.",
    sizes: { quick: [4_096, 32_768], full: [32_768, 262_144, 1_000_000] },
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
        const side = Math.round(Math.cbrt(size));
        const data = new Float32Array(side * side * side);
        for (let i = 0; i < data.length; i++) data[i] = (i % 1024) / 1023;
        scene.add(engine.createLatticeSpace({
            dimensions: [side, side, side],
            data,
            origin: [-3, -3, -3],
            spacing: [6 / side, 6 / side, 6 / side],
            cellScale: 0.8,
            blendMode: "transparent",
            depthWrite: false,
            opacity: 0.55,
            scaleTransform: {
                componentCount: 1,
                stride: 1,
                domainMin: 0,
                domainMax: 1
            }
        }));
        engine.render(scene, camera);
        await engine.gpu.queue.onSubmittedWorkDone();
        return { engine, scene, camera, cells: data.length, side };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(_size, state) { return { renderedLatticeSpaces: 1, dimensions: [state.side, state.side, state.side], cells: state.cells, viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
