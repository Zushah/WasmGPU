/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeGlyphData, makeGraphData, makePointData } from "./helpers.js";

export default {
    name: "renderer-mixed-scientific-scene-render-frame",
    subsystem: "render",
    type: "frame",
    unit: "ms/frame",
    description: "Complete heterogeneous scientific Renderer frame across Mesh, PointCloud, GlyphField, NodeLink, and LatticeSpace paths, including GPU completion.",
    sizes: { quick: [1, 4], full: [4, 16, 64] },
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
        const pointCount = 16_384 * size;
        const cloud = engine.createPointCloud({
            data: makePointData(pointCount, 0, 4),
            blendMode: "opaque",
            depthWrite: true,
            basePointSize: 2,
            scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4, domainMin: 0, domainMax: 1 }
        });
        cloud.transform.setPosition(-3, 1.8, 0);
        scene.add(cloud);
        const glyphCount = 2_048 * size;
        const glyphData = makeGlyphData(glyphCount);
        const glyphs = engine.createGlyphField({
            shape: "arrow",
            ...glyphData,
            instanceCount: glyphCount,
            blendMode: "opaque",
            scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4, domainMin: 0, domainMax: 1 }
        });
        glyphs.transform.setPosition(2.5, 1.8, 0);
        scene.add(glyphs);
        const nodeCount = 1_024 * size;
        const graphData = makeGraphData(nodeCount);
        const graph = engine.createNodeLink({
            ...graphData,
            nodeGeometryMode: "spheres",
            edgeGeometryMode: "lines",
            nodeScaleTransform: { componentCount: 1, componentIndex: 0, stride: 1, domainMin: 0, domainMax: 1 },
            blendMode: "opaque",
            nodeSize: 0.06
        });
        graph.transform.setPosition(-2.5, -2, 0);
        scene.add(graph);
        const latticeSide = 16 * Math.round(Math.sqrt(size));
        const latticeData = new Float32Array(latticeSide * latticeSide);
        for (let i = 0; i < latticeData.length; i++) latticeData[i] = (i % 256) / 255;
        const lattice = engine.createLatticeSpace({
            dimensions: [latticeSide, latticeSide],
            data: latticeData,
            origin: [-1, -1, 0],
            spacing: [2 / latticeSide, 2 / latticeSide, 1],
            cellScale: 0.9,
            blendMode: "opaque",
            scaleTransform: { componentCount: 1, componentIndex: 0, stride: 1, domainMin: 0, domainMax: 1 }
        });
        lattice.transform.setPosition(2.5, -2, 0);
        scene.add(lattice);
        const meshCount = 32 * size;
        const geometry = engine.geometry.box(0.15, 0.15, 0.15);
        const material = engine.material.unlit({ color: [0.95, 0.55, 0.2] });
        for (let i = 0; i < meshCount; i++) {
            if (i > 0) {
                geometry.retain();
                material.retain();
            }
            const mesh = engine.createMesh(geometry, material);
            mesh.transform.setPosition(((i % 64) - 32) * 0.12, ((Math.floor(i / 64) % 32) - 16) * 0.12, -1);
            scene.add(mesh);
        }
        engine.render(scene, camera);
        await engine.gpu.queue.onSubmittedWorkDone();
        return {
            engine,
            scene,
            camera,
            counts: {
                pointCount,
                glyphCount,
                nodeCount,
                edgeCount: graphData.edgeCount,
                latticeCells: latticeData.length,
                meshCount
            }
        };
    },
    async run(state) {
        state.engine.render(state.scene, state.camera);
        await state.engine.gpu.queue.onSubmittedWorkDone();
    },
    operations() { return 1; },
    workload(size, state) { return { scaleFactor: size, families: 5, points: state.counts.pointCount, glyphs: state.counts.glyphCount, nodes: state.counts.nodeCount, edges: state.counts.edgeCount, latticeCells: state.counts.latticeCells, meshes: state.counts.meshCount, viewport: [800, 600] }; },
    teardown(state) { state.scene.destroy(); state.camera.destroy(); state.engine.destroy(); }
};
