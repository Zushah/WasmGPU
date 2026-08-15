/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, createWebGPUCanvasDouble, setupTest } from "./utils/helpers.js";
import { initWebAssembly, PerspectiveCamera, OrthographicCamera, Renderer, Scene, Transform, Mesh, Geometry, UnlitMaterial, FlyControls, OrbitControls, importGltf, mat4, quat, frameArena, wasm } from "../release/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers();
const mat3DetFromMat4 = (m) => (m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]));
const transformPoint = (m, x, y, z, w = 1) => [m[0] * x + m[4] * y + m[8] * z + m[12] * w, m[1] * x + m[5] * y + m[9] * z + m[13] * w, m[2] * x + m[6] * y + m[10] * z + m[14] * w, m[3] * x + m[7] * y + m[11] * z + m[15] * w];
const resizeCanvas = (canvas, w, h) => { canvas.width = w; canvas.height = h; canvas.clientWidth = w; canvas.clientHeight = h; };

await setupTest({ initWebAssembly });

// 1) Camera constructors expose their documented defaults and descriptor values.
{
    const perspective = new PerspectiveCamera();
    const orthographic = new OrthographicCamera({ left: -4, right: 6, top: 3, bottom: -2, near: 0.5, far: 250 });
    try {
        assert.strictEqual(perspective.type, "perspective");
        assert.ok(perspective.transform instanceof Transform);
        assert.strictEqual(perspective.fov, 60);
        numberApproxEqual(perspective.aspect, 16 / 9, 1e-6);
        assert.strictEqual(perspective.autoAspect, true);
        assert.strictEqual(perspective.near, 0.1);
        assert.strictEqual(perspective.far, 1000);
        assert.strictEqual(orthographic.type, "orthographic");
        assert.strictEqual(orthographic.left, -4);
        assert.strictEqual(orthographic.right, 6);
        assert.strictEqual(orthographic.top, 3);
        assert.strictEqual(orthographic.bottom, -2);
        assert.strictEqual(orthographic.near, 0.5);
        assert.strictEqual(orthographic.far, 250);
    } finally { perspective.destroy(); orthographic.destroy(); }
}

// 2) Perspective projection parameters produce and invalidate the expected matrix.
{
    const cam = new PerspectiveCamera({ fov: 90, aspect: 2, autoAspect: false, near: 1, far: 11 });
    try {
        const initial = cam.getProjectionMatrix();
        numberApproxEqual(initial[0], 0.5, 1e-6);
        numberApproxEqual(initial[5], 1, 1e-6);
        numberApproxEqual(initial[10], -1.1, 1e-6);
        assert.strictEqual(initial[11], -1);
        numberApproxEqual(initial[14], -1.1, 1e-6);
        assert.strictEqual(initial[15], 0);
        assert.strictEqual(cam.getProjectionMatrix(), initial, "Unchanged perspective parameters should reuse the cached matrix");
        cam.fov = 60; cam.aspect = 1.5; cam.near = 0.25; cam.far = 400;
        const updated = cam.getProjectionMatrix();
        assert.notStrictEqual(updated, initial, "Changed perspective parameters should rebuild the projection matrix");
        arraysApproxEqual(updated, mat4.perspective(Math.PI / 3, 1.5, 0.25, 400), 1e-6);
    } finally { cam.destroy(); }
}

// 3) Orthographic projection parameters produce and invalidate the expected matrix.
{
    const cam = new OrthographicCamera({ left: -4, right: 4, top: 3, bottom: -3, near: 1, far: 101 });
    try {
        const initial = cam.getProjectionMatrix();
        arraysApproxEqual(initial, [0.25, 0, 0, 0, 0, 1 / 3, 0, 0, 0, 0, -0.01, 0, 0, 0, -0.01, 1], 1e-6);
        assert.strictEqual(cam.getProjectionMatrix(), initial, "Unchanged orthographic parameters should reuse the cached matrix");
        cam.left = -8; cam.right = 2; cam.top = 5; cam.bottom = -1; cam.near = 2; cam.far = 202;
        const updated = cam.getProjectionMatrix();
        assert.notStrictEqual(updated, initial, "Changed orthographic parameters should rebuild the projection matrix");
        arraysApproxEqual(updated, [0.2, 0, 0, 0, 0, 1 / 3, 0, 0, 0, 0, -0.005, 0, 0.6, -2 / 3, -0.01, 1], 1e-6);
    } finally { cam.destroy(); }
}

// 4) Camera sizing helpers update projection extents and preserve their fluent API.
{
    const perspective = new PerspectiveCamera({ autoAspect: false });
    const orthographic = new OrthographicCamera();
    try {
        assert.strictEqual(perspective.updateAspect(1920, 1080), perspective);
        numberApproxEqual(perspective.aspect, 16 / 9, 1e-6);
        assert.strictEqual(perspective.autoAspect, false);
        assert.strictEqual(orthographic.updateFromCanvas(800, 600, 2), orthographic);
        assert.strictEqual(orthographic.left, -200);
        assert.strictEqual(orthographic.right, 200);
        assert.strictEqual(orthographic.top, 150);
        assert.strictEqual(orthographic.bottom, -150);
        numberApproxEqual(orthographic.getProjectionMatrix()[0], 1 / 200, 1e-6);
        numberApproxEqual(orthographic.getProjectionMatrix()[5], 1 / 150, 1e-6);
    } finally { perspective.destroy(); orthographic.destroy(); }
}

// 5) Camera position and view writers represent the inverse of the camera pose.
{
    const cam = new PerspectiveCamera();
    try {
        arraysApproxEqual(cam.viewMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 0);
        assert.strictEqual(cam.setWorldPosition(3, -2, 7), cam);
        Transform.updateAll();
        arraysApproxEqual(cam.position, [3, -2, 7], 1e-6);
        arraysApproxEqual(cam.viewMatrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -3, 2, -7, 1], 1e-6);
        const out = new Float32Array(20).fill(99);
        assert.strictEqual(cam.writeViewMatrixToArray(out, 2), out);
        arraysApproxEqual(Array.from(out.slice(2, 18)), cam.viewMatrix, 1e-6);
        assert.strictEqual(out[0], 99);
        assert.strictEqual(out[19], 99);
    } finally { cam.destroy(); }
}

// 6) lookAt overloads orient the camera optical axis toward a world-space target.
{
    const cam = new PerspectiveCamera({ fov: 90, aspect: 1, autoAspect: false, near: 0.1, far: 100 });
    try {
        cam.setWorldPosition(2, 3, 8);
        assert.strictEqual(cam.lookAt(2, 3, 0), cam);
        Transform.updateAll();
        arraysApproxEqual(cam.up, [0, 1, 0], 1e-6);
        let targetView = transformPoint(cam.viewMatrix, 2, 3, 0);
        arraysApproxEqual(targetView.slice(0, 3), [0, 0, -8], 1e-5);
        assert.strictEqual(cam.lookAt([-6, 3, 8]), cam);
        Transform.updateAll();
        targetView = transformPoint(cam.viewMatrix, -6, 3, 8);
        arraysApproxEqual(targetView.slice(0, 3), [0, 0, -8], 1e-5);
    } finally { cam.destroy(); }
}

// 7) lookAtWithUp applies a requested roll while keeping the target centered.
{
    const cam = new OrthographicCamera({ left: -2, right: 2, top: 2, bottom: -2 });
    try {
        cam.setWorldPosition(0, 0, 5);
        assert.strictEqual(cam.lookAtWithUp([0, 0, 0], [1, 0, 0]), cam);
        Transform.updateAll();
        arraysApproxEqual(cam.up, [1, 0, 0], 1e-6);
        const targetView = transformPoint(cam.viewMatrix, 0, 0, 0);
        arraysApproxEqual(targetView.slice(0, 3), [0, 0, -5], 1e-6);
    } finally { cam.destroy(); }
}

// 8) Camera world positioning respects transform ancestry and destruction state.
{
    const parent = new Transform();
    const cam = new PerspectiveCamera();
    try {
        parent.addChild(cam.transform);
        parent.setPosition(10, -4, 2);
        parent.setScale(2, 4, 5);
        Transform.updateAll();
        cam.setWorldPosition(14, 8, -8);
        arraysApproxEqual(cam.transform.position, [2, 3, -2], 1e-6);
        Transform.updateAll();
        arraysApproxEqual(cam.position, [14, 8, -8], 1e-6);
        assert.strictEqual(cam.destroyed, false);
    } finally { parent.dispose(); cam.destroy(); }
    assert.strictEqual(cam.destroyed, true);
}

// 9) Perspective camera aspect ratio policies and projection matrix updates on canvas resize.
{
    const canvas = createWebGPUCanvasDouble(800, 400);
    const renderer = await Renderer.create(canvas);
    const scene = new Scene();
    try {
        const autoCam = new PerspectiveCamera({ fov: 60, aspect: 1.0, autoAspect: true, near: 0.1, far: 100 });
        assert.strictEqual(autoCam.autoAspect, true);
        renderer.render(scene, autoCam);
        numberApproxEqual(autoCam.aspect, 2.0, 1e-5, "autoCam aspect must update to canvas aspect 2.0");
        let proj = autoCam.getProjectionMatrix();
        numberApproxEqual(proj[0], proj[5] / 2.0, 1e-5, "proj[0] must equal proj[5] / 2.0 for aspect 2.0");
        resizeCanvas(canvas, 400, 800);
        renderer.render(scene, autoCam);
        numberApproxEqual(autoCam.aspect, 0.5, 1e-5, "autoCam aspect must update to canvas aspect 0.5");
        proj = autoCam.getProjectionMatrix();
        numberApproxEqual(proj[0], proj[5] / 0.5, 1e-5, "proj[0] must equal proj[5] / 0.5 for aspect 0.5");
        const fixedCam = new PerspectiveCamera({ fov: 60, aspect: 2.5, autoAspect: false, near: 0.1, far: 100 });
        assert.strictEqual(fixedCam.autoAspect, false);
        renderer.render(scene, fixedCam);
        numberApproxEqual(fixedCam.aspect, 2.5, 1e-5, "fixedCam aspect must be preserved at 2.5");
        proj = fixedCam.getProjectionMatrix();
        numberApproxEqual(proj[0], proj[5] / 2.5, 1e-5, "proj[0] must equal proj[5] / 2.5 for fixed aspect 2.5");
        resizeCanvas(canvas, 1920, 1080);
        renderer.render(scene, fixedCam);
        numberApproxEqual(fixedCam.aspect, 2.5, 1e-5, "fixedCam aspect must remain 2.5 after resize");
        proj = fixedCam.getProjectionMatrix();
        numberApproxEqual(proj[0], proj[5] / 2.5, 1e-5, "proj[0] must remain proj[5] / 2.5");
        fixedCam.updateAspect(1200, 600);
        numberApproxEqual(fixedCam.aspect, 2.0, 1e-5, "updateAspect must set aspect to 2.0");
        assert.strictEqual(fixedCam.autoAspect, false, "updateAspect must preserve autoAspect = false");
        fixedCam.autoAspect = true;
        renderer.render(scene, fixedCam);
        numberApproxEqual(fixedCam.aspect, 1920 / 1080, 1e-5, "Enabling autoAspect must update on next render");
        proj = fixedCam.getProjectionMatrix();
        numberApproxEqual(proj[0], proj[5] / (1920 / 1080), 1e-5, "Projection matrix must reflect updated aspect");
    } finally { renderer.destroy(); }
}

// 10) Imported glTF cameras rendered and resized across frames.
{
    const canvas = createWebGPUCanvasDouble(800, 600);
    const renderer = await Renderer.create(canvas);
    const gltfDoc = {
        json: {
            asset: { version: "2.0" },
            cameras: [
                { type: "perspective", perspective: { yfov: Math.PI / 3, aspectRatio: 1.6, znear: 0.1 } },
                { type: "perspective", perspective: { yfov: Math.PI / 3, znear: 0.1, zfar: 500 } }
            ],
            nodes: [{ name: "CameraFixed", camera: 0 }, { name: "CameraAuto", camera: 1 }],
            scenes: [{ nodes: [0, 1] }], scene: 0
        },
        buffers: [], resourceBaseUrl: ""
    };
    const imported = importGltf(gltfDoc, { addToScene: true, importCameras: true });
    try {
        const camFixed = imported.nodes[0].camera;
        const camAuto = imported.nodes[1].camera;
        assert.ok(camFixed instanceof PerspectiveCamera);
        assert.ok(camAuto instanceof PerspectiveCamera);
        assert.strictEqual(camFixed.autoAspect, false);
        assert.strictEqual(camFixed.far, Infinity);
        assert.strictEqual(camAuto.autoAspect, true);
        assert.strictEqual(camAuto.far, 500);
        renderer.render(imported.scene, camAuto);
        numberApproxEqual(camAuto.aspect, 800 / 600, 1e-4, "camAuto aspect must match 800/600");
        let projAuto = camAuto.getProjectionMatrix();
        numberApproxEqual(projAuto[0], projAuto[5] / (800 / 600), 1e-4);
        renderer.render(imported.scene, camFixed);
        numberApproxEqual(camFixed.aspect, 1.6, 1e-4, "camFixed aspect must remain 1.6");
        let projFixed = camFixed.getProjectionMatrix();
        numberApproxEqual(projFixed[0], projFixed[5] / 1.6, 1e-4);
        resizeCanvas(canvas, 1200, 600);
        renderer.render(imported.scene, camAuto);
        numberApproxEqual(camAuto.aspect, 2.0, 1e-4, "camAuto aspect must update to 2.0");
        projAuto = camAuto.getProjectionMatrix();
        numberApproxEqual(projAuto[0], projAuto[5] / 2.0, 1e-4);
        renderer.render(imported.scene, camFixed);
        numberApproxEqual(camFixed.aspect, 1.6, 1e-4, "camFixed aspect must stay 1.6 across resize");
        projFixed = camFixed.getProjectionMatrix();
        numberApproxEqual(projFixed[0], projFixed[5] / 1.6, 1e-4);
    } finally { imported.destroy(); renderer.destroy(); }
}

// 11) KHR_animation_pointer updates to camera aspectRatio remain fixed during rendering/resizing.
{
    const canvas = createWebGPUCanvasDouble(800, 600);
    const renderer = await Renderer.create(canvas);
    const times = new Float32Array([0.0, 1.0]);
    const values = new Float32Array([1.5, 2.35]);
    const bin = new Uint8Array(times.byteLength + values.byteLength);
    bin.set(new Uint8Array(times.buffer), 0);
    bin.set(new Uint8Array(values.buffer), times.byteLength);
    const gltfDoc = {
        json: {
            asset: { version: "2.0" },
            extensionsUsed: ["KHR_animation_pointer"],
            buffers: [{ byteLength: bin.byteLength }],
            bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: times.byteLength }, { buffer: 0, byteOffset: times.byteLength, byteLength: values.byteLength }],
            accessors: [{ bufferView: 0, componentType: 5126, count: 2, type: "SCALAR" }, { bufferView: 1, componentType: 5126, count: 2, type: "SCALAR" }],
            cameras: [{ type: "perspective", perspective: { yfov: Math.PI / 3, aspectRatio: 1.5, znear: 0.1, zfar: 100 } }],
            nodes: [{ name: "AnimatedCam", camera: 0 }],
            animations: [
                {
                    name: "AspectAnim",
                    samplers: [{ input: 0, output: 1, interpolation: "LINEAR" }],
                    channels: [{ sampler: 0, target: { path: "pointer", extensions: { KHR_animation_pointer: { pointer: "/cameras/0/perspective/aspectRatio" } } } }]
                }
            ],
            scenes: [{ nodes: [0] }], scene: 0
        },
        buffers: [bin.buffer], resourceBaseUrl: ""
    };
    const imported = importGltf(gltfDoc, { addToScene: true, importCameras: true });
    try {
        const cam = imported.nodes[0].camera;
        assert.strictEqual(cam.autoAspect, false);
        numberApproxEqual(cam.aspect, 1.5, 1e-4);
        const clip = imported.clips[0];
        assert.ok(clip, "Animation clip with KHR_animation_pointer must be imported");
        clip.sample(1.0);
        numberApproxEqual(cam.aspect, 2.35, 1e-4, "Pointer animation must update camera aspect to 2.35");
        renderer.render(imported.scene, cam);
        numberApproxEqual(cam.aspect, 2.35, 1e-4, "Render must not overwrite animated aspect ratio");
        let proj = cam.getProjectionMatrix();
        numberApproxEqual(proj[0], proj[5] / 2.35, 1e-4, "Projection matrix must reflect animated aspect");
        resizeCanvas(canvas, 1920, 1080);
        renderer.render(imported.scene, cam);
        numberApproxEqual(cam.aspect, 2.35, 1e-4, "Canvas resize must not overwrite animated aspect ratio");
    } finally { imported.destroy(); renderer.destroy(); }
}

// 12) Finite <-> Infinite far plane projection cache switching.
{
    const near = 0.2;
    const cam = new PerspectiveCamera({ fov: 60, aspect: 1.0, near, far: 1000 });
    let proj = cam.getProjectionMatrix();
    const expectedFinite1000_10 = 1000 / (near - 1000);
    const expectedFinite1000_14 = (1000 * near) / (near - 1000);
    numberApproxEqual(proj[10], expectedFinite1000_10, 1e-5);
    numberApproxEqual(proj[14], expectedFinite1000_14, 1e-5);
    assert.strictEqual(proj[11], -1.0);
    assert.strictEqual(proj[15], 0.0);
    cam.far = Infinity;
    proj = cam.getProjectionMatrix();
    assert.strictEqual(proj[10], -1.0, "Infinite far proj[10] must be -1.0");
    assert.strictEqual(proj[11], -1.0, "Infinite far proj[11] must be -1.0");
    numberApproxEqual(proj[14], -near, 1e-5, "Infinite far proj[14] must be -near");
    assert.strictEqual(proj[15], 0.0, "Infinite far proj[15] must be 0.0");
    cam.far = 500;
    proj = cam.getProjectionMatrix();
    const expectedFinite500_10 = 500 / (near - 500);
    const expectedFinite500_14 = (500 * near) / (near - 500);
    numberApproxEqual(proj[10], expectedFinite500_10, 1e-5);
    numberApproxEqual(proj[14], expectedFinite500_14, 1e-5);
    cam.far = Infinity;
    proj = cam.getProjectionMatrix();
    assert.strictEqual(proj[10], -1.0);
    numberApproxEqual(proj[14], -near, 1e-5);
}

// 13) Renderer frustum culling fixture with infinite far plane.
{
    const canvas = createWebGPUCanvasDouble(800, 600);
    const renderer = await Renderer.create(canvas, { frustumCulling: true, frustumCullingStats: true });
    const scene = new Scene();
    const geo = Geometry.box(1, 1, 1);
    const mat = new UnlitMaterial();
    const mesh = new Mesh(geo, mat);
    mesh.transform.setPosition(0, 0, -2500);
    scene.add(mesh);
    const cam = new PerspectiveCamera({ fov: 60, aspect: 1.0, near: 0.1, far: 1000 });
    cam.transform.setPosition(0, 0, 0);
    cam.lookAt(0, 0, -1);
    Transform.updateAll();
    try {
        renderer.render(scene, cam);
        assert.strictEqual(renderer.cullingStats.frustum.tested, 1, "Frustum tested should be 1");
        assert.strictEqual(renderer.cullingStats.frustum.visible, 0, "Object at z = -2500 must be culled when camera.far = 1000");
        assert.strictEqual(renderer.opaqueDrawList.length, 0, "No objects in draw list when culled");
        cam.far = Infinity;
        renderer.render(scene, cam);
        assert.strictEqual(renderer.cullingStats.frustum.tested, 1, "Frustum tested should be 1");
        assert.strictEqual(renderer.cullingStats.frustum.visible, 1, "Object at z = -2500 must NOT be culled when camera.far = Infinity");
        assert.strictEqual(renderer.opaqueDrawList.length, 1, "Object must be in draw list with infinite far plane");
    } finally { scene.destroy(); renderer.destroy(); }
}

// 14) Scale-free view matrix under extreme near-zero and animated hierarchy scales.
{
    const root = new Transform();
    const parent = new Transform();
    const cam = new PerspectiveCamera({ fov: 60, aspect: 1.0, near: 0.1, far: 100 });
    try {
        root.addChild(parent);
        parent.addChild(cam.transform);
        root.setPosition(5, -2, 10);
        root.setRotationFromAxisAngle([0, 1, 0], 0.7);
        root.setScale(1e-8, 1e-8, 1e-8);
        parent.setPosition(1, 1, 1);
        parent.setRotationFromAxisAngle([1, 0, 0], 0.4);
        parent.setScale(1e-8, 1e-8, 1e-8);
        cam.transform.setPosition(0, 0, 0);
        cam.transform.setRotationFromAxisAngle([0, 0, 1], 0.3);
        cam.transform.setScale(1e-8, 1e-8, 1e-8);
        Transform.updateAll();
        let view = cam.viewMatrix;
        let det = mat3DetFromMat4(view);
        numberApproxEqual(det, 1.0, 1e-4, "Determinant must be 1.0 even under near-zero scale");
        for (let i = 0; i < 16; i++) assert.ok(Number.isFinite(view[i]), `view[${i}] must be finite under near-zero scale`);
        const scaleFrames = [[1000, 0.001, 500], [0.01, 200, 0.05], [-2, 3, 1], [50, 0.0001, 1000], [0, 0, 0]];
        for (let f = 0; f < scaleFrames.length; f++) {
            const [sx, sy, sz] = scaleFrames[f];
            root.setScale(sx, sy, sz);
            root.rotateY(0.2);
            parent.setScale(sy, sz, sx);
            parent.rotateX(0.15);
            cam.transform.setScale(sz, sx, sy);
            cam.transform.rotateZ(0.1);
            Transform.updateAll();
            view = cam.viewMatrix;
            det = mat3DetFromMat4(view);
            numberApproxEqual(det, 1.0, 1e-4, `Determinant must be 1.0 at frame ${f}`);
            const c0 = Math.hypot(view[0], view[1], view[2]);
            const c1 = Math.hypot(view[4], view[5], view[6]);
            const c2 = Math.hypot(view[8], view[9], view[10]);
            numberApproxEqual(c0, 1.0, 1e-4, `Col 0 norm must be 1.0 at frame ${f}`);
            numberApproxEqual(c1, 1.0, 1e-4, `Col 1 norm must be 1.0 at frame ${f}`);
            numberApproxEqual(c2, 1.0, 1e-4, `Col 2 norm must be 1.0 at frame ${f}`);
            const up = cam.up;
            const upNorm = Math.hypot(up[0], up[1], up[2]);
            numberApproxEqual(upNorm, 1.0, 1e-4, `up norm must be 1.0 at frame ${f}`);
        }
    } finally { root.dispose(); parent.dispose(); cam.destroy(); }
}

// 15) Scale-free renderer staging parity with public viewMatrix and viewProjectionMatrix.
{
    const root = new Transform();
    const parent = new Transform();
    const cam = new PerspectiveCamera({ fov: 60, aspect: 1.5, near: 0.1, far: 100 });
    try {
        root.addChild(parent);
        parent.addChild(cam.transform);
        root.setPosition(3, 4, 5);
        root.setRotationFromAxisAngle([0, 1, 0], 1.2);
        root.setScale(2.5, 0.4, 3.1);
        parent.setPosition(-1, 2, 0);
        parent.setRotationFromAxisAngle([1, 0, 0], -0.8);
        parent.setScale(0.7, 4.0, 1.2);
        cam.transform.setPosition(1, 0, -2);
        cam.transform.setRotationFromAxisAngle([0, 0, 1], 0.5);
        Transform.updateAll();
        const pubView = cam.viewMatrix;
        const pubViewProj = cam.viewProjectionMatrix;
        const stagingPtr = frameArena.allocF32(16);
        cam.writeViewMatrixTo(stagingPtr);
        const stagedPtr = Array.from(wasm.f32view(stagingPtr, 16));
        const staged = new Float32Array(16);
        cam.writeViewMatrixToArray(staged);
        arraysApproxEqual(stagedPtr, pubView, 1e-6, "writeViewMatrixTo pointer output and viewMatrix must match exactly");
        arraysApproxEqual(Array.from(staged), pubView, 1e-6, "writeViewMatrixToArray and viewMatrix must match exactly");
        const proj = cam.getProjectionMatrix();
        const expectedViewProj = mat4.mul(proj, pubView);
        arraysApproxEqual(pubViewProj, expectedViewProj, 1e-6, "viewProjectionMatrix must equal mat4.mul(proj, view)");
        const expectedRotation = quat.normalize(quat.mul(quat.mul(quat.fromAxisAngle([0, 1, 0], 1.2), quat.fromAxisAngle([1, 0, 0], -0.8)), quat.fromAxisAngle([0, 0, 1], 0.5)));
        const expectedUp = quat.toRotation(expectedRotation, [0, 1, 0]);
        const expectedForward = quat.toRotation(expectedRotation, [0, 0, -1]);
        arraysApproxEqual(cam.up, expectedUp, 1e-5, "Camera hierarchy rotation must compose root-to-camera in the expected order");
        const cameraPosition = cam.position;
        const oneUnitForwardInView = transformPoint(pubView, cameraPosition[0] + expectedForward[0], cameraPosition[1] + expectedForward[1], cameraPosition[2] + expectedForward[2]);
        arraysApproxEqual(oneUnitForwardInView.slice(0, 3), [0, 0, -1], 1e-5, "Expected hierarchy-composed forward axis must map to camera -Z");
    } finally { root.dispose(); parent.dispose(); cam.destroy(); }
}

// 16) Fly controls follow the rendered camera axes for every world-axis convention.
{
    const canvas = createWebGPUCanvasDouble(800, 600);
    for (const axisConvention of ["y-up-rh", "z-up-rh", "x-up-rh"]) {
        const cam = new PerspectiveCamera();
        const fly = new FlyControls(cam, canvas, { axisConvention, keyboardTarget: window, moveSpeed: 1 });
        try {
            window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
            fly.update(1);
            window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
            arraysApproxEqual(cam.position, [0, 0, -1], 1e-5, `Fly forward must follow camera-local -Z under ${axisConvention}`);
        } finally { window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" })); fly.dispose(); cam.destroy(); }
    }
}

// 17) Parented controls convert desired world poses through rotated, non-uniformly scaled ancestry.
{
    const canvas = createWebGPUCanvasDouble(800, 600);
    const root = new Transform();
    const cam = new PerspectiveCamera({ fov: 60, aspect: 2.0, autoAspect: false, near: 0.1, far: 100 });
    let fly = null;
    let orbit = null;
    try {
        root.addChild(cam.transform);
        root.setPosition(10, 5, -20);
        root.setRotationFromAxisAngle([0, 1, 0], Math.PI / 4);
        root.setScale(3.0, 0.5, 2.0);
        cam.transform.setPosition(0, 0, 0);
        cam.transform.setRotationFromAxisAngle([1, 0, 0], 0.2);
        Transform.updateAll();
        fly = new FlyControls(cam, canvas, { keyboardTarget: window, moveSpeed: 1 });
        const before = cam.position.slice();
        const beforeView = cam.viewMatrix.slice();
        const forward = [-beforeView[2], -beforeView[6], -beforeView[10]];
        const expected = before.map((value, index) => value + forward[index]);
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
        fly.update(1);
        window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
        arraysApproxEqual(cam.position, expected, 1e-4, "Parented fly movement must advance one world-space unit along the rendered forward axis");
        const afterView = cam.viewMatrix;
        arraysApproxEqual([-afterView[2], -afterView[6], -afterView[10]], forward, 1e-4, "Parented fly translation must preserve rendered orientation");
        fly.dispose();
        fly = null;
        orbit = new OrbitControls(cam, canvas);
        orbit.setView("front", { target: [1, 2, 3], distance: 6, animate: false });
        arraysApproxEqual(cam.position, [1, 2, 9], 1e-4, "Parented setView must achieve the requested world-space position");
        const targetClip = transformPoint(cam.viewProjectionMatrix, 1, 2, 3, 1);
        numberApproxEqual(targetClip[0] / targetClip[3], 0, 1e-4, "Parented setView target must lie on the horizontal optical axis");
        numberApproxEqual(targetClip[1] / targetClip[3], 0, 1e-4, "Parented setView target must lie on the vertical optical axis");
        root.setScale(0, 0, 0);
        Transform.updateAll();
        const localBeforeSingularMove = cam.transform.position.slice();
        cam.setWorldPosition(100, 200, 300);
        arraysApproxEqual(cam.transform.position, localBeforeSingularMove, 0, "An unreachable world position must leave the local position stable under singular ancestry");
        for (const value of cam.position) assert.ok(Number.isFinite(value), "Singular-ancestry camera position must remain finite");
    } finally { window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" })); fly?.dispose(); orbit?.dispose(); root.dispose(); cam.destroy(); }
}

// 18) Fixed-aspect bounds fitting uses the camera projection rather than the viewport aspect.
{
    const canvas = createWebGPUCanvasDouble(800, 600);
    const bounds = { boxMin: [-10, -1, -1], boxMax: [10, 1, 1], sphereCenter: [0, 0, 0], sphereRadius: Math.sqrt(102), partial: false };
    const fixedCam = new PerspectiveCamera({ fov: 60, aspect: 2, autoAspect: false });
    const autoCam = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, autoAspect: true });
    const fixedControls = new OrbitControls(fixedCam, canvas);
    const autoControls = new OrbitControls(autoCam, canvas);
    try {
        fixedControls.fitToBounds(bounds, { animate: false });
        autoControls.fitToBounds(bounds, { animate: false });
        assert.ok(fixedControls.distance < autoControls.distance, "A wider fixed projection must fit wide bounds closer than the viewport-aspect projection");
    } finally { fixedControls.dispose(); autoControls.dispose(); fixedCam.destroy(); autoCam.destroy(); }
}

// 19) Infinite-far navigation transitions use finite reciprocal interpolation without NaNs.
{
    const canvas = createWebGPUCanvasDouble(800, 600);
    const cam = new PerspectiveCamera({ far: Infinity });
    cam.setWorldPosition(0, 0, 10).lookAt(0, 0, 0);
    const controls = new OrbitControls(cam, canvas);
    const bounds = { boxMin: [-1, -1, -1], boxMax: [1, 1, 1], sphereCenter: [0, 0, 0], sphereRadius: Math.sqrt(3), partial: false };
    try {
        controls.fitToBounds(bounds, { animate: true, duration: 1 });
        controls.update(0.5);
        assert.ok(Number.isFinite(cam.far) && cam.far > cam.near, "Infinity-to-finite transition midpoint must have a valid reciprocal-interpolated far plane");
        controls.update(0.5);
        assert.ok(Number.isFinite(cam.far) && cam.far > cam.near, "Infinity-to-finite transition endpoint must remain valid");
        cam.far = Infinity;
        controls.setView("right", { animate: true, duration: 1 });
        controls.update(0.5);
        assert.strictEqual(cam.far, Infinity, "Infinity-to-Infinity transition must preserve Infinity");
        for (const value of cam.getProjectionMatrix()) assert.ok(Number.isFinite(value), "Transitioned infinite projection entries must remain finite");
    } finally { controls.dispose(); cam.destroy(); }
}

// 20) viewProjectionMatrix under scaled ancestry correctly maps world points into NDC.
{
    const root = new Transform();
    const cam = new PerspectiveCamera({ fov: 90, aspect: 1.0, near: 0.1, far: 100 });
    try {
        root.addChild(cam.transform);
        root.setPosition(0, 0, 10);
        root.setScale(4.0, 0.25, 2.0);
        cam.transform.setPosition(0, 0, 0);
        cam.transform.setRotation(0, 0, 0, 1);
        Transform.updateAll();
        const viewProj = cam.viewProjectionMatrix;
        const pClip = transformPoint(viewProj, 0, 0, 5, 1);
        const ndcX = pClip[0] / pClip[3];
        const ndcY = pClip[1] / pClip[3];
        const ndcZ = pClip[2] / pClip[3];
        numberApproxEqual(ndcX, 0.0, 1e-4, "Target on central optical axis must map to NDC X = 0");
        numberApproxEqual(ndcY, 0.0, 1e-4, "Target on central optical axis must map to NDC Y = 0");
        assert.ok(ndcZ > 0.0 && ndcZ < 1.0, `NDC Z must be within [0, 1), got ${ndcZ}`);
    } finally { root.dispose(); cam.destroy(); }
}
