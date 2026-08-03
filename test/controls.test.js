/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, createBrowserCanvasScope, destroyTestDevice, setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../dist/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers(1e-5);
const browserCanvases = createBrowserCanvasScope();

const makeCanvas = (width = 800, height = 600) => { const listeners = new Map(); return { style: {}, clientWidth: width, clientHeight: height, addEventListener(type, handler) { listeners.set(type, handler); }, removeEventListener(type, handler) { if (listeners.get(type) === handler) listeners.delete(type); }, setPointerCapture() {}, releasePointerCapture() {}, getBoundingClientRect() { return { left: 0, top: 0, width, height, right: width, bottom: height }; }, listeners }; };

const makeEventTarget = () => { const listeners = new Map(); return { addEventListener(type, handler) { listeners.set(type, handler); }, removeEventListener(type, handler) { if (listeners.get(type) === handler) listeners.delete(type); }, listeners }; };

const dispatch = (target, type, event = {}) => target.listeners.get(type)?.({ preventDefault() {}, stopPropagation() {}, target: null, ...event });

const cameraForward = (camera) => { const m = camera.transform.worldMatrix; return [-m[8], -m[9], -m[10]]; };

const cameraUp = (camera) => { const m = camera.transform.worldMatrix; return [m[4], m[5], m[6]]; };

const { device } = await setupTest({ initWebAssembly: WasmGPU.initWebAssembly, webgpu: true });
const { NavigationControls, OrbitControls, TrackballControls, FlyControls, PerspectiveCamera, OrthographicCamera, Geometry, Mesh, PointCloud, GlyphField, Scene, UnlitMaterial, AxisConventions } = WasmGPU;
assert.ok(NavigationControls, "Missing export: NavigationControls");
assert.ok(FlyControls, "Missing export: FlyControls");
assert.ok(AxisConventions && AxisConventions.Y_UP_RH, "Missing export: AxisConventions");

const pointScaleTransform = { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 };
const glyphScaleTransform = { componentCount: 4, componentIndex: 0, stride: 4, offset: 0 };

// 1) Orbit perspective controls preserve spherical state, damping, named views, reset, and dolly.
{
    const canvas = makeCanvas();
    const camera = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, near: 0.1, far: 200 });
    camera.transform.setPosition(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new OrbitControls(camera, canvas, { target: [0, 0, 0] });
    numberApproxEqual(controls.distance, 10, 1e-5, "Orbit distance mismatch on init");
    numberApproxEqual(controls.azimuthAngle, 0, 1e-5, "Orbit azimuth mismatch on init");
    numberApproxEqual(controls.polarAngle, Math.PI * 0.5, 1e-5, "Orbit polar mismatch on init");

    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls._thetaDelta = Math.PI * 0.5;
    controls.update(1 / 60);
    assert.ok(controls.azimuthAngle > 0 && controls.azimuthAngle < Math.PI * 0.5, "Orbit damping should apply partial azimuth update");
    for (let i = 0; i < 80; i++) controls.update(1 / 60);
    numberApproxEqual(controls.azimuthAngle, Math.PI * 0.5, 1e-2, "Orbit damping should converge toward full rotation");

    controls.setView("right", { animate: false, distance: 6, target: [1, 2, 3] });
    arraysApproxEqual(camera.position, [7, 2, 3], 1e-4, "Orbit named view position mismatch");
    arraysApproxEqual(camera.up, [0, 1, 0], 1e-4, "Orbit right-view up mismatch");
    controls.reset();
    arraysApproxEqual(camera.position, [0, 0, 10], 1e-4, "Orbit reset should restore saved position");

    controls._dollyDelta = Math.log(2);
    controls.enableDamping = false;
    controls.update(1 / 60);
    numberApproxEqual(controls.distance, 20, 1e-4, "Orbit perspective dolly mismatch");
}

// 2) Orbit orthographic controls apply zoom through projection bounds.
{
    const canvas = makeCanvas();
    const camera = new OrthographicCamera({ left: -4, right: 4, top: 4, bottom: -4, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new OrbitControls(camera, canvas, { target: [0, 0, 0] });
    controls.zoom = 2;
    controls.update(1 / 60);
    numberApproxEqual(camera.left, -2, 1e-5, "Orbit orthographic left mismatch after zoom");
    numberApproxEqual(camera.right, 2, 1e-5, "Orbit orthographic right mismatch after zoom");
}

// 3) Trackball perspective controls rotate, pan, and reset target-centric camera state.
{
    const canvas = makeCanvas();
    const camera = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, near: 0.1, far: 200 });
    camera.transform.setPosition(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new TrackballControls(camera, canvas, { target: [0, 0, 0] });
    numberApproxEqual(controls.distance, 10, 1e-5, "Trackball distance mismatch on init");
    controls._trackballRotationDelta = [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)];
    controls.update(1 / 60);
    assert.ok(Math.abs(camera.position[0]) > 1, "Trackball rotation should move camera off the Z axis");
    arraysApproxEqual(camera.up, [0, 1, 0], 1e-4, "Trackball rotation should preserve up for a Y-axis spin");

    controls.saveState();
    controls._panOffset = [1, -2, 3];
    controls.update(1 / 60);
    arraysApproxEqual(controls.target, [1, -2, 3], 1e-4, "Trackball pan should move target");
    controls.reset();
    arraysApproxEqual(controls.target, [0, 0, 0], 1e-5, "Trackball reset should restore target");
}

// 4) Trackball orthographic controls apply zoom through projection bounds.
{
    const canvas = makeCanvas();
    const camera = new OrthographicCamera({ left: -6, right: 6, top: 3, bottom: -3, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 12);
    camera.lookAt(0, 0, 0);
    const controls = new TrackballControls(camera, canvas, { target: [0, 0, 0] });
    controls.zoom = 3;
    controls.update(1 / 60);
    numberApproxEqual(camera.left, -2, 1e-5, "Trackball orthographic zoom left mismatch");
    numberApproxEqual(camera.right, 2, 1e-5, "Trackball orthographic zoom right mismatch");
}

// 5) Navigation controls preserve shared view, transition, mode-switch, and camera-sync behavior.
{
    const canvas = makeCanvas();
    const camera = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, near: 0.1, far: 200 });
    camera.transform.setPosition(0, 0, 8);
    camera.lookAt(0, 0, 0);
    const controls = new NavigationControls(camera, canvas, { target: [0, 0, 0], mode: "orbit" });
    controls.setView("front", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [0, 0, 4], 1e-4, "Front view position mismatch");
    arraysApproxEqual(camera.up, [0, 1, 0], 1e-4, "Front view up mismatch");
    controls.setView("back", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [0, 0, -4], 1e-4, "Back view position mismatch");
    controls.setView("left", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [-4, 0, 0], 1e-4, "Left view position mismatch");
    controls.setView("right", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [4, 0, 0], 1e-4, "Right view position mismatch");
    controls.setView("top", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [0, 4, 0], 1e-4, "Top view position mismatch");
    arraysApproxEqual(camera.up, [0, 0, -1], 1e-4, "Top view up mismatch");
    controls.setView("bottom", { animate: false, distance: 4 });
    arraysApproxEqual(camera.position, [0, -4, 0], 1e-4, "Bottom view position mismatch");
    arraysApproxEqual(camera.up, [0, 0, 1], 1e-4, "Bottom view up mismatch");

    const positionBefore = Array.from(camera.position);
    controls.target = [1, 2, 3];
    controls.setMode("trackball");
    arraysApproxEqual(controls.target, [1, 2, 3], 1e-5, "Mode switch should preserve target");
    arraysApproxEqual(camera.position, positionBefore, 1e-5, "Mode switch should preserve camera pose");
    controls.setView("front", { animate: true, duration: 0.25 });
    assert.strictEqual(controls.hasActiveTransition, true, "Animated setView should start a transition");
    controls.cancelTransition();
    assert.strictEqual(controls.hasActiveTransition, false, "cancelTransition should clear active transition state");

    camera.transform.setPosition(5, 5, 5);
    camera.lookAtWithUp([1, 2, 3], [0, 1, 0]);
    controls.syncFromCamera();
    numberApproxEqual(controls.distance, Math.sqrt(29), 1e-4, "syncFromCamera should refresh distance from external camera edits");
}

// 6) Fly controls move in camera space, scale speed with the wheel, drag-look, reset, and clean up listeners.
{
    const modeKeyboard = makeEventTarget();
    const orbit = new OrbitControls(new PerspectiveCamera(), makeCanvas());
    const trackball = new TrackballControls(new PerspectiveCamera(), makeCanvas());
    assert.strictEqual(modeKeyboard.listeners.size, 0, "Orbit/trackball controls should not attach keyboard listeners");
    orbit.dispose();
    trackball.dispose();
    const navigationFlyMode = new NavigationControls(new PerspectiveCamera(), makeCanvas(), { mode: "fly", keyboardTarget: modeKeyboard });
    assert.ok(modeKeyboard.listeners.has("keydown") && modeKeyboard.listeners.has("keyup"), "Fly mode should attach configured keyboard listeners");
    navigationFlyMode.setMode("orbit");
    assert.strictEqual(modeKeyboard.listeners.size, 0, "Leaving fly mode should detach configured keyboard listeners");
    navigationFlyMode.setMode("fly");
    assert.ok(modeKeyboard.listeners.has("keydown") && modeKeyboard.listeners.has("keyup"), "Re-entering fly mode should restore configured keyboard listeners");
    navigationFlyMode.dispose();

    const keyboard = makeEventTarget();
    const canvas = makeCanvas();
    const camera = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, near: 0.1, far: 200 });
    camera.transform.setPosition(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new FlyControls(camera, canvas, { keyboardTarget: keyboard, moveSpeed: 10, wheelSpeedFactor: 1.1, pointerLock: "on-click" });
    assert.strictEqual(controls.mode, "fly", "FlyControls should force fly mode");
    const navigationFly = new NavigationControls(new PerspectiveCamera(), makeCanvas(), { mode: "fly", keyboardTarget: null });
    assert.strictEqual(navigationFly.mode, "fly", "NavigationControls should accept fly mode directly");
    navigationFly.dispose();

    dispatch(keyboard, "keydown", { code: "KeyW" });
    controls.update(0.5);
    dispatch(keyboard, "keyup", { code: "KeyW" });
    arraysApproxEqual(camera.position, [0, 0, 5], 1e-4, "Fly forward movement should follow camera forward");

    dispatch(keyboard, "keydown", { code: "KeyE" });
    controls.update(0.25);
    dispatch(keyboard, "keyup", { code: "KeyE" });
    arraysApproxEqual(camera.position, [0, 2.5, 5], 1e-4, "Fly vertical movement should follow camera up");

    controls.moveSpeed = 10;
    dispatch(canvas, "wheel", { deltaY: 100, deltaMode: 0, clientX: 0, clientY: 0 });
    numberApproxEqual(controls.moveSpeed, 11, 1e-5, "Fly wheel should scale moveSpeed by wheelSpeedFactor");

    const beforeForward = cameraForward(camera);
    dispatch(canvas, "pointerdown", { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    dispatch(canvas, "pointermove", { pointerId: 1, clientX: 180, clientY: 100, movementX: 80, movementY: 0 });
    controls.update(1 / 60);
    dispatch(canvas, "pointerup", { pointerId: 1 });
    const afterForward = cameraForward(camera);
    assert.ok(afterForward[0] > beforeForward[0] + 0.01, "Fly pointer drag should yaw the camera");

    controls.reset();
    arraysApproxEqual(camera.position, [0, 0, 10], 1e-4, "Fly reset should restore saved camera position");

    camera.transform.setPosition(2, 3, 4);
    camera.lookAtWithUp([5, 5, 1], [0, 1, 0]);
    controls.target = [99, 99, 99];
    controls.saveState();
    const savedForward = cameraForward(camera);
    const savedUp = cameraUp(camera);
    camera.transform.setPosition(-4, -5, -6);
    camera.lookAtWithUp([0, 0, 0], [0, 1, 0]);
    controls.target = [0, 0, 0];
    controls.reset();
    arraysApproxEqual(camera.position, [2, 3, 4], 1e-4, "Fly reset should restore explicitly saved position");
    arraysApproxEqual(cameraForward(camera), savedForward, 1e-4, "Fly reset should restore saved forward direction independent of target");
    arraysApproxEqual(cameraUp(camera), savedUp, 1e-4, "Fly reset should restore saved up direction independent of target");
    controls.dispose();
    assert.strictEqual(canvas.listeners.size, 0, "Fly dispose should remove canvas listeners");
    assert.strictEqual(keyboard.listeners.size, 0, "Fly dispose should remove keyboard listeners");

    const globalYawCamera = new PerspectiveCamera();
    globalYawCamera.transform.setPosition(0, 0, 0);
    globalYawCamera.lookAtWithUp([0, 0, -1], [1, 0, 0]);
    const globalYawControls = new FlyControls(globalYawCamera, makeCanvas(), { keyboardTarget: null });
    globalYawControls._flyYawDelta = Math.PI * 0.25;
    globalYawControls.update(1 / 60);

    const localYawCamera = new PerspectiveCamera();
    localYawCamera.transform.setPosition(0, 0, 0);
    localYawCamera.lookAtWithUp([0, 0, -1], [1, 0, 0]);
    const localYawControls = new FlyControls(localYawCamera, makeCanvas(), { keyboardTarget: null, yawMode: "local" });
    localYawControls._flyYawDelta = Math.PI * 0.25;
    localYawControls.update(1 / 60);

    const globalForward = cameraForward(globalYawCamera);
    const localForward = cameraForward(localYawCamera);
    assert.ok(Math.abs(globalForward[1]) < 1e-4, "Default fly yaw should use global up after roll");
    assert.ok(Math.abs(localForward[1]) > 0.5, "Local fly yaw should keep aircraft-style rolled yaw");
    globalYawControls.dispose();
    localYawControls.dispose();
}

// 7) Scene fitting frames mixed object bounds for perspective and orthographic cameras.
{
    const scene = new Scene();
    const mesh = new Mesh(Geometry.box(2, 4, 6), new UnlitMaterial());
    mesh.transform.setPosition(-4, 0, 0);
    const pointCloud = new PointCloud({
        data: new Float32Array([2, -1, 1, 0.2, 5, 1, 2, 0.8]),
        keepCPUData: true,
        scaleTransform: pointScaleTransform
    });
    const glyphField = new GlyphField({
        geometry: Geometry.box(1, 1, 1),
        instanceCount: 1,
        positions: new Float32Array([0, 5, 0, 0]),
        rotations: new Float32Array([0, 0, 0, 1]),
        scales: new Float32Array([1, 2, 1, 0]),
        attributes: new Float32Array([0, 0, 0, 0]),
        keepCPUData: true,
        scaleTransform: glyphScaleTransform
    });
    scene.add(mesh).add(pointCloud).add(glyphField);
    const bounds = scene.getBounds();
    assert.strictEqual(bounds.empty, false, "Mixed-scene bounds should not be empty");
    assert.ok(bounds.boxMin[0] <= -5, "Mesh bounds should contribute to scene min X");
    assert.ok(bounds.boxMax[0] >= 5, "Point-cloud bounds should contribute to scene max X");
    assert.ok(bounds.boxMax[1] >= 5.5, "Glyph-field bounds should contribute to scene max Y");

    const canvas = makeCanvas(1200, 400);
    const perspective = new PerspectiveCamera({ fov: 55, aspect: 3, near: 0.1, far: 500 });
    perspective.transform.setPosition(0, 0, 20);
    perspective.lookAt(0, 0, 0);
    const controls = new NavigationControls(perspective, canvas, { target: [0, 0, 0], mode: "orbit" });
    controls.fitScene(scene, { animate: false, padding: 1.2 });
    assert.ok(perspective.near > 0, "Perspective fit should keep near > 0");
    assert.ok(perspective.far > perspective.near, "Perspective fit should widen depth range");
    assert.ok(controls.distance > bounds.sphereRadius, "Perspective fit should place camera outside the scene sphere");

    const orthographic = new OrthographicCamera({ left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10 });
    orthographic.transform.copyFrom(perspective.transform);
    const orthoControls = new NavigationControls(orthographic, canvas, { target: Array.from(controls.target), mode: "orbit" });
    orthoControls.fitScene(scene, { animate: false, padding: 1.1, view: "front" });
    assert.ok((orthographic.right - orthographic.left) >= (orthographic.top - orthographic.bottom), "Orthographic fit should respect wide aspect framing");
    assert.ok(orthographic.far > orthographic.near, "Orthographic fit should stabilize depth range");
}

// 8) Partial bounds remain usable when at least one scene contributor has explicit bounds.
{
    const explicit = new PointCloud({ pointCount: 4, boundsMin: [-1, -2, -3], boundsMax: [4, 5, 6], scaleTransform: pointScaleTransform });
    const explicitBounds = explicit.getBounds();
    arraysApproxEqual(explicitBounds.boxMin, [-1, -2, -3], 1e-6, "Explicit point-cloud bounds min mismatch");
    arraysApproxEqual(explicitBounds.boxMax, [4, 5, 6], 1e-6, "Explicit point-cloud bounds max mismatch");

    const scene = new Scene();
    scene.add(explicit);
    scene.add(new PointCloud({ pointCount: 8, scaleTransform: pointScaleTransform }));
    const bounds = scene.getBounds();
    assert.strictEqual(bounds.empty, false, "Partial scene with one bounded contributor should still have finite bounds");
    assert.strictEqual(bounds.partial, true, "Scene bounds should report partial when visible contributors lack bounds");

    const canvas = makeCanvas();
    const camera = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new NavigationControls(camera, canvas, { target: [0, 0, 0], mode: "orbit" });
    controls.fitScene(scene, { animate: false });
    assert.ok(Number.isFinite(controls.distance), "Fit on a partial scene should still produce a finite camera distance from bounded contributors");
}

// 9) Real DOM canvas events drive controls through the browser event system.
{
    const canvas = browserCanvases.createCanvas(800, 600);
    const camera = new PerspectiveCamera({ fov: 60, aspect: 4 / 3, near: 0.1, far: 200 });
    camera.transform.setPosition(0, 0, 10);
    camera.lookAt(0, 0, 0);
    const controls = new OrbitControls(camera, canvas, { target: [0, 0, 0], enableDamping: false });
    const dispatched = canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, clientX: 400, clientY: 300, bubbles: true, cancelable: true }));
    assert.strictEqual(dispatched, false, "The real wheel listener should prevent the browser's default scroll behavior");
    controls.update(1 / 60);
    assert.ok(controls.distance > 10, "A real wheel event should dolly the orbit camera away from its target");
    controls.dispose();
}

// 10) Cleanup removes real canvases and waits for shared GPU work before destroying the browser device.
{
    browserCanvases.restore();
    await destroyTestDevice(device);
}
