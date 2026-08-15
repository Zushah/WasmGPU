/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Camera, PerspectiveCamera, OrthographicCamera } from "./camera";
import type { Bounds3, BoundsLike, Vec3 } from "./bounds";
import { boundsFromSphere, expandBounds, getBoundsCenter, getBoundsCorners, normalizeBounds } from "./bounds";
import type { Scene } from "./scene";

export type NavigationMode = "orbit" | "trackball" | "fly";
export type InspectionView = "front" | "back" | "left" | "right" | "top" | "bottom";

export type NavigationControlsMouseButtons = {
    rotate?: number;
    pan?: number;
    zoom?: number;
};

export type FlyControlsKeyMap = {
    forward?: readonly string[];
    backward?: readonly string[];
    left?: readonly string[];
    right?: readonly string[];
    up?: readonly string[];
    down?: readonly string[];
    rollLeft?: readonly string[];
    rollRight?: readonly string[];
    fast?: readonly string[];
    slow?: readonly string[];
};

export type AxisConventionDescriptor = {
    right?: Vec3;
    up: Vec3;
    forward: Vec3;
};

export type AxisConventionPreset = "y-up-rh" | "z-up-rh" | "x-up-rh";
export type AxisConventionInput = AxisConventionPreset | AxisConventionDescriptor;

export const AxisConventions = {
    Y_UP_RH: { right: [1, 0, 0] as Vec3, up: [0, 1, 0] as Vec3, forward: [0, 0, 1] as Vec3 },
    Z_UP_RH: { right: [1, 0, 0] as Vec3, up: [0, 0, 1] as Vec3, forward: [0, -1, 0] as Vec3 },
    X_UP_RH: { right: [0, 0, 1] as Vec3, up: [1, 0, 0] as Vec3, forward: [0, 1, 0] as Vec3 }
} as const;

type AxisConventionResolved = {
    right: Vec3;
    up: Vec3;
    forward: Vec3;
};

type ProjectionState = { type: "perspective"; near: number; far: number; } | { type: "orthographic"; left: number; right: number; top: number; bottom: number; near: number; far: number; };

type TransitionState = {
    elapsed: number;
    duration: number;
    fromPosition: Vec3;
    toPosition: Vec3;
    fromTarget: Vec3;
    toTarget: Vec3;
    fromUp: Vec3;
    toUp: Vec3;
    fromProjection: ProjectionState;
    toProjection: ProjectionState;
};

type Basis3 = {
    right: Vec3;
    up: Vec3;
    forward: Vec3;
};

type FitSolveResult = {
    position: Vec3;
    target: Vec3;
    up: Vec3;
    projection: ProjectionState;
};

type FlyControlsKeyAction = keyof Required<FlyControlsKeyMap>;

type FlyControlsPointerLockMode = false | "on-click" | "on-drag";

export type FlyControlsYawMode = "global" | "local";

export type NavigationControlsDescriptor = {
    mode?: NavigationMode;
    axisConvention?: AxisConventionInput;
    target?: Vec3;
    enabled?: boolean;
    enableRotate?: boolean;
    enablePan?: boolean;
    enableZoom?: boolean;
    rotateSpeed?: number;
    panSpeed?: number;
    zoomSpeed?: number;
    zoomOnCursor?: boolean;
    enableDamping?: boolean;
    dampingFactor?: number;
    minDistance?: number;
    maxDistance?: number;
    minZoom?: number;
    maxZoom?: number;
    minPolarAngle?: number;
    maxPolarAngle?: number;
    minAzimuthAngle?: number;
    maxAzimuthAngle?: number;
    mouseButtons?: NavigationControlsMouseButtons;
    enableKeyboard?: boolean;
    enablePointer?: boolean;
    enableWheel?: boolean;
    moveSpeed?: number;
    lookSpeed?: number;
    rollSpeed?: number;
    fastMultiplier?: number;
    slowMultiplier?: number;
    wheelSpeedFactor?: number;
    minMoveSpeed?: number;
    maxMoveSpeed?: number;
    invertY?: boolean;
    yawMode?: FlyControlsYawMode;
    mouseButton?: number;
    pointerLock?: boolean | "on-click" | "on-drag";
    keyMap?: FlyControlsKeyMap;
    keyboardTarget?: HTMLElement | Window | Document | null;
    preventDefaultKeys?: boolean;
};

export type OrbitControlsMouseButtons = NavigationControlsMouseButtons;
export type TrackballControlsMouseButtons = NavigationControlsMouseButtons;
export type OrbitControlsDescriptor = NavigationControlsDescriptor;
export type TrackballControlsDescriptor = NavigationControlsDescriptor;
export type FlyControlsDescriptor = NavigationControlsDescriptor;
export type NavigationControlsChangeListener = () => void;
export type NavigationControlsInteractionListener = (active: boolean) => void;

export type SetViewOptions = {
    target?: Vec3;
    distance?: number;
    up?: Vec3;
    animate?: boolean;
    duration?: number;
    orthographic?: boolean;
};

export type FitToBoundsOptions = {
    padding?: number;
    boundsMode?: "box" | "sphere";
    aspect?: number;
    minNear?: number;
    animate?: boolean;
    duration?: number;
    view?: InspectionView;
    eyeDirection?: Vec3;
    up?: Vec3;
};

const EPSILON = 1e-6;
const ORBIT_POLE_EPS = 1e-3;
const DEFAULT_TRANSITION_SECONDS = 0.35;
const clamp = (x: number, min: number, max: number): number => Math.max(min, Math.min(max, x));
const clamp01 = (x: number): number => clamp(x, 0, 1);
const lerp = (a: number, b: number, t: number): number => a + ((b - a) * t);
const easeInOutCubic = (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - (Math.pow(-2 * t + 2, 3) * 0.5);
const vec3clone = (v: readonly number[]): Vec3 => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
const vec3add = (a: readonly number[], b: readonly number[]): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vec3sub = (a: readonly number[], b: readonly number[]): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vec3scl = (v: readonly number[], s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];
const vec3dot = (a: readonly number[], b: readonly number[]): number => (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
const vec3cross = (a: readonly number[], b: readonly number[]): Vec3 => [(a[1] * b[2]) - (a[2] * b[1]), (a[2] * b[0]) - (a[0] * b[2]), (a[0] * b[1]) - (a[1] * b[0])];
const vec3mag = (v: readonly number[]): number => Math.hypot(v[0], v[1], v[2]);
const vec3normalize = (v: readonly number[], fallback: readonly number[] = [0, 0, 1]): Vec3 => { const len = vec3mag(v); if (len <= EPSILON) return vec3clone(fallback); const inv = 1 / len; return [v[0] * inv, v[1] * inv, v[2] * inv]; };
const vec3lerp = (a: readonly number[], b: readonly number[], t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const vec3rotate = (v: readonly number[], axisInput: readonly number[], angle: number): Vec3 => { const axis = vec3normalize(axisInput, [0, 1, 0]); const c = Math.cos(angle); const s = Math.sin(angle); const d = vec3dot(axis, v); const cross = vec3cross(axis, v); return [(v[0] * c) + (cross[0] * s) + (axis[0] * d * (1 - c)), (v[1] * c) + (cross[1] * s) + (axis[1] * d * (1 - c)), (v[2] * c) + (cross[2] * s) + (axis[2] * d * (1 - c))]; };
const quatmul = (ax: number, ay: number, az: number, aw: number, bx: number, by: number, bz: number, bw: number): [number, number, number, number] => { return [(aw * bx) + (ax * bw) + (ay * bz) - (az * by), (aw * by) - (ax * bz) + (ay * bw) + (az * bx), (aw * bz) + (ax * by) - (ay * bx) + (az * bw), (aw * bw) - (ax * bx) - (ay * by) - (az * bz)]; };
const quatinvert = (x: number, y: number, z: number, w: number): [number, number, number, number] => [-x, -y, -z, w];
const quatnormalize = (x: number, y: number, z: number, w: number): [number, number, number, number] => { const len = Math.hypot(x, y, z, w); if (len <= EPSILON) return [0, 0, 0, 1]; const inv = 1 / len; return [x * inv, y * inv, z * inv, w * inv]; };
const quatrotvec = (vx: number, vy: number, vz: number, qx: number, qy: number, qz: number, qw: number): Vec3 => { const tx = 2 * ((qy * vz) - (qz * vy)); const ty = 2 * ((qz * vx) - (qx * vz)); const tz = 2 * ((qx * vy) - (qy * vx)); return [vx + (qw * tx) + ((qy * tz) - (qz * ty)), vy + (qw * ty) + ((qz * tx) - (qx * tz)), vz + (qw * tz) + ((qx * ty) - (qy * tx))]; };
const quatisid = (x: number, y: number, z: number, w: number): boolean => Math.abs(x) < EPSILON && Math.abs(y) < EPSILON && Math.abs(z) < EPSILON && Math.abs(1 - w) < EPSILON;
const quatslerpid = (x: number, y: number, z: number, w: number, t: number): [number, number, number, number] => { const tt = clamp01(t); let cosHalfTheta = clamp(w, -1, 1); let qx = x; let qy = y; let qz = z; let qw = w; if (cosHalfTheta < 0) { cosHalfTheta = -cosHalfTheta; qx = -qx; qy = -qy; qz = -qz; qw = -qw; } if (cosHalfTheta >= 0.9995) return quatnormalize(qx * tt, qy * tt, qz * tt, (1 - tt) + (qw * tt)); const halfTheta = Math.acos(cosHalfTheta); const sinHalfTheta = Math.sqrt(1 - (cosHalfTheta * cosHalfTheta)); if (sinHalfTheta <= EPSILON) return [0, 0, 0, 1]; const a = Math.sin((1 - tt) * halfTheta) / sinHalfTheta; const b = Math.sin(tt * halfTheta) / sinHalfTheta; return [qx * b, qy * b, qz * b, a + (qw * b)]; };

const resolveAxisConvention = (input: AxisConventionInput | undefined): AxisConventionResolved => {
    if (!input || input === "y-up-rh") return { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1] };
    if (input === "z-up-rh") return { right: [1, 0, 0], up: [0, 0, 1], forward: [0, -1, 0] };
    if (input === "x-up-rh") return { right: [0, 0, 1], up: [1, 0, 0], forward: [0, 1, 0] };
    const rightHint = input.right ?? vec3cross(input.up, input.forward);
    const right = vec3normalize(rightHint, [1, 0, 0]);
    const up = vec3normalize(input.up, [0, 1, 0]);
    const forward = vec3normalize(vec3cross(right, up), input.forward);
    const correctedRight = vec3normalize(vec3cross(up, forward), right);
    const correctedUp = vec3normalize(vec3cross(forward, correctedRight), up);
    return { right: correctedRight, up: correctedUp, forward };
};

const FLY_KEY_ACTIONS: readonly FlyControlsKeyAction[] = ["forward", "backward", "left", "right", "up", "down", "rollLeft", "rollRight", "fast", "slow"];

const DEFAULT_FLY_KEY_MAP: Required<FlyControlsKeyMap> = {
    forward: ["KeyW", "ArrowUp"],
    backward: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    up: ["KeyE"],
    down: ["KeyQ"],
    rollLeft: ["KeyZ"],
    rollRight: ["KeyC"],
    fast: ["ShiftLeft", "ShiftRight"],
    slow: ["AltLeft", "AltRight"]
};

const resolveFlyKeyMap = (input: FlyControlsKeyMap | undefined): Required<FlyControlsKeyMap> => {
    const out = {} as Required<FlyControlsKeyMap>;
    for (const action of FLY_KEY_ACTIONS) out[action] = [...(input?.[action] ?? DEFAULT_FLY_KEY_MAP[action])];
    return out;
};

const collectFlyKeyCodes = (keyMap: Required<FlyControlsKeyMap>): Set<string> => {
    const codes = new Set<string>();
    for (const action of FLY_KEY_ACTIONS) for (const code of keyMap[action]) codes.add(code);
    return codes;
};

const normalizePointerLockMode = (mode: boolean | "on-click" | "on-drag" | undefined): FlyControlsPointerLockMode => {
    if (mode === true) return "on-click";
    if (mode === "on-click" || mode === "on-drag") return mode;
    return false;
};

const defaultKeyboardTarget = (mode: NavigationMode): HTMLElement | Window | Document | null => mode === "fly" && typeof window !== "undefined" ? window : null;

const isEditableEventTarget = (target: EventTarget | null): boolean => {
    if (!target || typeof target !== "object") return false;
    const candidate = target as { tagName?: string; isContentEditable?: boolean; getAttribute?: (name: string) => string | null };
    if (candidate.isContentEditable) return true;
    const tag = typeof candidate.tagName === "string" ? candidate.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    const editable = candidate.getAttribute?.("contenteditable");
    return editable === "" || editable === "true";
};

export class NavigationControls {
    camera: Camera;
    readonly domElement: HTMLCanvasElement;
    target: Vec3;
    enabled: boolean = true;
    enableRotate: boolean = true;
    enablePan: boolean = true;
    enableZoom: boolean = true;
    rotateSpeed: number = 1.0;
    panSpeed: number = 1.0;
    zoomSpeed: number = 1.0;
    zoomOnCursor: boolean = false;
    enableDamping: boolean = false;
    dampingFactor: number = 0.1;
    minDistance: number = 0.0;
    maxDistance: number = Infinity;
    minZoom: number = 0.01;
    maxZoom: number = Infinity;
    minPolarAngle: number = 0.0;
    maxPolarAngle: number = Math.PI;
    minAzimuthAngle: number = -Infinity;
    maxAzimuthAngle: number = Infinity;
    mouseButtons: Required<NavigationControlsMouseButtons> = { rotate: 0, zoom: 1, pan: 2 };
    enableKeyboard: boolean = true;
    enablePointer: boolean = true;
    enableWheel: boolean = true;
    moveSpeed: number = 10;
    lookSpeed: number = 0.002;
    rollSpeed: number = 1.5;
    fastMultiplier: number = 4;
    slowMultiplier: number = 0.25;
    wheelSpeedFactor: number = 1.1;
    minMoveSpeed: number = 0.001;
    maxMoveSpeed: number = Infinity;
    invertY: boolean = false;
    yawMode: FlyControlsYawMode = "global";
    mouseButton: number = 0;
    pointerLock: FlyControlsPointerLockMode = false;
    keyMap: Required<FlyControlsKeyMap> = resolveFlyKeyMap(undefined);
    keyboardTarget: HTMLElement | Window | Document | null = null;
    preventDefaultKeys: boolean = false;
    private _mode: NavigationMode;
    private _axisConvention: AxisConventionResolved = resolveAxisConvention(undefined);
    private _state: "none" | "rotate" | "pan" | "zoom" | "fly" = "none";
    private _pointerId: number | null = null;
    private _pointerX: number = 0;
    private _pointerY: number = 0;
    private _zoomCursorClientX: number = 0;
    private _zoomCursorClientY: number = 0;
    private _zoomCursorValid: boolean = false;
    private _transition: TransitionState | null = null;
    private _theta: number = 0;
    private _phi: number = Math.PI * 0.5;
    private _thetaDelta: number = 0;
    private _phiDelta: number = 0;
    private _trackballRotateStart: Vec3 = [0, 0, 1];
    private _trackballRotationDelta: [number, number, number, number] = [0, 0, 0, 1];
    private _trackballEye: Vec3 = [0, 0, 1];
    private _trackballUp: Vec3 = [0, 1, 0];
    private _radius: number = 1.0;
    private _zoom: number = 1.0;
    private _dollyDelta: number = 0;
    private _panOffset: Vec3 = [0, 0, 0];
    private _flyYawDelta: number = 0;
    private _flyPitchDelta: number = 0;
    private _flyPressedKeys: Set<string> = new Set();
    private _flyMappedKeys: Set<string> = collectFlyKeyCodes(this.keyMap);
    private _flyPointerLocked: boolean = false;
    private _flyPointerLockRequested: boolean = false;
    private _pointerLockDocument: Document | null = null;
    private _documentMouseMoveAttached: boolean = false;
    private _keyboardTargetExplicit: boolean = false;
    private _keyboardListenerTarget: HTMLElement | Window | Document | null = null;
    private _orthoBaseLeft: number = -1;
    private _orthoBaseRight: number = 1;
    private _orthoBaseTop: number = 1;
    private _orthoBaseBottom: number = -1;
    private _savedTarget: Vec3 = [0, 0, 0];
    private _savedPosition: Vec3 = [0, 0, 1];
    private _savedUp: Vec3 = [0, 1, 0];
    private _savedProjection: ProjectionState = { type: "perspective", near: 0.1, far: 1000 };
    private readonly _wheelListenerOptions: AddEventListenerOptions = { passive: false };
    private readonly _changeListeners: Set<NavigationControlsChangeListener> = new Set();
    private readonly _interactionListeners: Set<NavigationControlsInteractionListener> = new Set();
    private _interactionActive: boolean = false;
    private _wheelInteractionTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(camera: Camera, domElement: HTMLCanvasElement, desc: NavigationControlsDescriptor = {}) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = desc.target ? vec3clone(desc.target) : [0, 0, 0];
        this._mode = desc.mode ?? "orbit";
        this._axisConvention = resolveAxisConvention(desc.axisConvention ?? "y-up-rh");
        if (desc.enabled !== undefined) this.enabled = desc.enabled;
        if (desc.enableRotate !== undefined) this.enableRotate = desc.enableRotate;
        if (desc.enablePan !== undefined) this.enablePan = desc.enablePan;
        if (desc.enableZoom !== undefined) this.enableZoom = desc.enableZoom;
        if (desc.rotateSpeed !== undefined) this.rotateSpeed = desc.rotateSpeed;
        if (desc.panSpeed !== undefined) this.panSpeed = desc.panSpeed;
        if (desc.zoomSpeed !== undefined) this.zoomSpeed = desc.zoomSpeed;
        if (desc.zoomOnCursor !== undefined) this.zoomOnCursor = desc.zoomOnCursor;
        if (desc.enableDamping !== undefined) this.enableDamping = desc.enableDamping;
        if (desc.dampingFactor !== undefined) this.dampingFactor = desc.dampingFactor;
        if (desc.minDistance !== undefined) this.minDistance = desc.minDistance;
        if (desc.maxDistance !== undefined) this.maxDistance = desc.maxDistance;
        if (desc.minZoom !== undefined) this.minZoom = desc.minZoom;
        if (desc.maxZoom !== undefined) this.maxZoom = desc.maxZoom;
        if (desc.minPolarAngle !== undefined) this.minPolarAngle = desc.minPolarAngle;
        if (desc.maxPolarAngle !== undefined) this.maxPolarAngle = desc.maxPolarAngle;
        if (desc.minAzimuthAngle !== undefined) this.minAzimuthAngle = desc.minAzimuthAngle;
        if (desc.maxAzimuthAngle !== undefined) this.maxAzimuthAngle = desc.maxAzimuthAngle;
        if (desc.mouseButtons) {
            if (desc.mouseButtons.rotate !== undefined) this.mouseButtons.rotate = desc.mouseButtons.rotate;
            if (desc.mouseButtons.zoom !== undefined) this.mouseButtons.zoom = desc.mouseButtons.zoom;
            if (desc.mouseButtons.pan !== undefined) this.mouseButtons.pan = desc.mouseButtons.pan;
        }
        if (desc.enableKeyboard !== undefined) this.enableKeyboard = desc.enableKeyboard;
        if (desc.enablePointer !== undefined) this.enablePointer = desc.enablePointer;
        if (desc.enableWheel !== undefined) this.enableWheel = desc.enableWheel;
        if (desc.moveSpeed !== undefined) this.moveSpeed = desc.moveSpeed;
        if (desc.lookSpeed !== undefined) this.lookSpeed = desc.lookSpeed;
        if (desc.rollSpeed !== undefined) this.rollSpeed = desc.rollSpeed;
        if (desc.fastMultiplier !== undefined) this.fastMultiplier = desc.fastMultiplier;
        if (desc.slowMultiplier !== undefined) this.slowMultiplier = desc.slowMultiplier;
        if (desc.wheelSpeedFactor !== undefined) this.wheelSpeedFactor = Math.max(EPSILON, desc.wheelSpeedFactor);
        if (desc.minMoveSpeed !== undefined) this.minMoveSpeed = Math.max(EPSILON, desc.minMoveSpeed);
        if (desc.maxMoveSpeed !== undefined) this.maxMoveSpeed = Math.max(this.minMoveSpeed, desc.maxMoveSpeed);
        if (desc.invertY !== undefined) this.invertY = desc.invertY;
        if (desc.yawMode !== undefined) this.yawMode = desc.yawMode;
        if (desc.mouseButton !== undefined) this.mouseButton = desc.mouseButton;
        this.pointerLock = normalizePointerLockMode(desc.pointerLock);
        this.keyMap = resolveFlyKeyMap(desc.keyMap);
        this._flyMappedKeys = collectFlyKeyCodes(this.keyMap);
        this._keyboardTargetExplicit = desc.keyboardTarget !== undefined;
        this.keyboardTarget = this._keyboardTargetExplicit ? desc.keyboardTarget ?? null : defaultKeyboardTarget(this._mode);
        if (desc.preventDefaultKeys !== undefined) this.preventDefaultKeys = desc.preventDefaultKeys;
        this.domElement.style.touchAction = "none";
        this.syncFromCameraState();
        this.saveState();
        this.domElement.addEventListener("pointerdown", this.onPointerDown);
        this.domElement.addEventListener("pointermove", this.onPointerMove);
        this.domElement.addEventListener("pointerup", this.onPointerUp);
        this.domElement.addEventListener("pointercancel", this.onPointerUp);
        this.domElement.addEventListener("wheel", this.onWheel, this._wheelListenerOptions);
        this.domElement.addEventListener("contextmenu", this.onContextMenu);
        this._pointerLockDocument = this.getPointerLockDocument();
        this._pointerLockDocument?.addEventListener("pointerlockchange", this.onPointerLockChange);
        this._pointerLockDocument?.addEventListener("pointerlockerror", this.onPointerLockError);
        this.syncKeyboardListeners();
    }

    dispose(): void {
        this.cancelTransition();
        this.clearWheelInteractionTimer();
        this.exitFlyPointerLock();
        this.detachPointerLockMouseMove();
        this.setInteractionState(false);
        this.domElement.removeEventListener("pointerdown", this.onPointerDown);
        this.domElement.removeEventListener("pointermove", this.onPointerMove);
        this.domElement.removeEventListener("pointerup", this.onPointerUp);
        this.domElement.removeEventListener("pointercancel", this.onPointerUp);
        this.domElement.removeEventListener("wheel", this.onWheel, this._wheelListenerOptions);
        this.domElement.removeEventListener("contextmenu", this.onContextMenu);
        this._pointerLockDocument?.removeEventListener("pointerlockchange", this.onPointerLockChange);
        this._pointerLockDocument?.removeEventListener("pointerlockerror", this.onPointerLockError);
        this.detachKeyboardListeners();
        this._flyPressedKeys.clear();
        this._changeListeners.clear();
        this._interactionListeners.clear();
    }

    onChange(listener: NavigationControlsChangeListener): () => void {
        this._changeListeners.add(listener);
        return () => {
            this._changeListeners.delete(listener);
        };
    }

    onInteractionState(listener: NavigationControlsInteractionListener): () => void {
        this._interactionListeners.add(listener);
        return () => {
            this._interactionListeners.delete(listener);
        };
    }

    get mode(): NavigationMode {
        return this._mode;
    }

    set mode(value: NavigationMode) {
        this.setMode(value);
    }

    get axisConvention(): AxisConventionDescriptor {
        return {
            right: vec3clone(this._axisConvention.right),
            up: vec3clone(this._axisConvention.up),
            forward: vec3clone(this._axisConvention.forward)
        };
    }

    set axisConvention(value: AxisConventionInput) {
        this._axisConvention = resolveAxisConvention(value);
        this.syncFromCamera();
    }

    get azimuthAngle(): number {
        return this._theta;
    }

    set azimuthAngle(value: number) {
        this._theta = value;
    }

    get polarAngle(): number {
        return this._phi;
    }

    set polarAngle(value: number) {
        this._phi = value;
    }

    get distance(): number {
        return this._radius;
    }

    set distance(value: number) {
        const next = Math.max(EPSILON, value);
        this._radius = next;
        if (this._mode === "trackball") {
            const eye = vec3normalize(this._trackballEye, this._axisConvention.forward);
            this._trackballEye = vec3scl(eye, next);
        }
    }

    get zoom(): number {
        return this._zoom;
    }

    set zoom(value: number) {
        this._zoom = clamp(value, this.minZoom, this.maxZoom);
    }

    get hasActiveTransition(): boolean {
        return this._transition !== null;
    }

    setCamera(camera: Camera): this {
        this.camera = camera;
        this.cancelTransition();
        this.syncFromCamera();
        this.emitChange();
        return this;
    }

    setMode(mode: NavigationMode): this {
        if (mode === this._mode) return this;
        this.syncFromCamera();
        if (this._mode === "fly") this.stopFlyInteraction();
        this._mode = mode;
        this.updateImplicitKeyboardTarget();
        this.syncKeyboardListeners();
        this.syncFromCamera();
        return this;
    }

    syncFromCamera(): void {
        this.syncFromCameraState();
    }

    private syncFromCameraState(): void {
        const position = vec3clone(this.camera.position);
        const offset = vec3sub(position, this.target);
        this._radius = Math.max(EPSILON, vec3mag(offset));
        if (this.camera.type === "orthographic") {
            const ortho = this.camera as OrthographicCamera;
            this._orthoBaseLeft = ortho.left;
            this._orthoBaseRight = ortho.right;
            this._orthoBaseTop = ortho.top;
            this._orthoBaseBottom = ortho.bottom;
            this._zoom = 1.0;
        }
        const spherical = this.offsetToSpherical(offset);
        this._theta = spherical.theta;
        this._phi = spherical.phi;
        this._thetaDelta = 0;
        this._phiDelta = 0;
        this._dollyDelta = 0;
        this._panOffset = [0, 0, 0];
        this._flyYawDelta = 0;
        this._flyPitchDelta = 0;
        this._trackballEye = offset;
        this._trackballUp = vec3normalize(this.camera.up, this._axisConvention.up);
        this._trackballRotateStart = [0, 0, 1];
        this._trackballRotationDelta = [0, 0, 0, 1];
    }

    saveState(): void {
        const position = vec3clone(this.camera.position);
        this._savedPosition = position;
        this._savedTarget = this._mode === "fly" ? vec3add(position, this.computeFlyBasis().forward) : vec3clone(this.target);
        this._savedUp = vec3normalize(this.camera.up, this._axisConvention.up);
        this._savedProjection = this.captureProjectionState();
    }

    reset(): void {
        this.cancelTransition();
        this.applyPose(this._savedPosition, this._savedTarget, this._savedUp);
        this.applyProjectionState(this._savedProjection);
        this.syncFromCamera();
        this.emitChange();
    }

    setTarget(x: number, y: number, z: number): this;
    setTarget(target: Vec3): this;
    setTarget(xOrTarget: number | Vec3, y?: number, z?: number): this {
        if (typeof xOrTarget === "number") this.target = [xOrTarget, y ?? 0, z ?? 0];
        else this.target = vec3clone(xOrTarget);
        return this;
    }

    cancelTransition(): this {
        this._transition = null;
        return this;
    }

    update(dtSeconds: number = 0): void {
        if (!this.enabled) return;
        const dt = dtSeconds > 0 ? dtSeconds : (1 / 60);
        if (this._transition) {
            this.updateTransition(dt);
            this.emitChange();
            return;
        }
        if (this._mode === "orbit") this.updateOrbit(dt);
        else if (this._mode === "trackball") this.updateTrackball(dt);
        else this.updateFly(dt);
        this.emitChange();
    }

    setView(view: InspectionView, options: SetViewOptions = {}): this {
        const direction = this.getInspectionViewDirection(view);
        const up = options.up ? vec3normalize(options.up, this._axisConvention.up) : this.getInspectionViewUp(view);
        const target = options.target ? vec3clone(options.target) : vec3clone(this.target);
        const distance = Math.max(EPSILON, options.distance ?? this._radius);
        const position = vec3add(target, vec3scl(direction, distance));
        this.applyPoseOrTransition(position, target, up, this.captureProjectionState(), options.animate, options.duration);
        return this;
    }

    fitScene(scene: Scene, options: FitToBoundsOptions = {}): Bounds3 {
        return this.fitToBounds(scene.getBounds(), options);
    }

    viewBounds(view: InspectionView, source: BoundsLike | Scene, options: FitToBoundsOptions = {}): Bounds3 {
        return this.fitToBounds(source, { ...options, view });
    }

    fitToBounds(source: BoundsLike | Scene, options: FitToBoundsOptions = {}): Bounds3 {
        const bounds = this.resolveBounds(source);
        if (bounds.empty) return bounds;
        const result = this.solveFit(bounds, options);
        this.applyPoseOrTransition(result.position, result.target, result.up, result.projection, options.animate, options.duration);
        return bounds;
    }

    private updateTransition(dt: number): void {
        const transition = this._transition;
        if (!transition) return;
        transition.elapsed += dt;
        const rawT = clamp01(transition.elapsed / Math.max(EPSILON, transition.duration));
        const t = easeInOutCubic(rawT);
        const position = vec3lerp(transition.fromPosition, transition.toPosition, t);
        const target = vec3lerp(transition.fromTarget, transition.toTarget, t);
        const up = vec3normalize(vec3lerp(transition.fromUp, transition.toUp, t), transition.toUp);
        this.applyPose(position, target, up);
        this.applyProjectionState(this.lerpProjectionState(transition.fromProjection, transition.toProjection, t));
        if (rawT >= 1) {
            this._transition = null;
            this.syncFromCamera();
        }
    }

    private onPointerDown = (event: PointerEvent): void => {
        if (!this.enabled || this._pointerId !== null) return;
        this.cancelTransition();
        if (this._mode === "fly") { this.onFlyPointerDown(event); return; }
        this._pointerId = event.pointerId;
        this.domElement.setPointerCapture(this._pointerId);
        this._pointerX = event.clientX;
        this._pointerY = event.clientY;
        this._zoomCursorClientX = event.clientX;
        this._zoomCursorClientY = event.clientY;
        this._zoomCursorValid = true;
        if (event.button === this.mouseButtons.rotate) this._state = "rotate";
        else if (event.button === this.mouseButtons.pan) this._state = "pan";
        else if (event.button === this.mouseButtons.zoom) this._state = "zoom";
        else this._state = "none";
        if (this._state !== "none") this.setInteractionState(true);
        if (this._state === "rotate" && this._mode === "trackball") this._trackballRotateStart = this.getTrackballVector(event.clientX, event.clientY);
        event.preventDefault();
    };

    private onPointerMove = (event: PointerEvent): void => {
        if (this._mode === "fly") { this.onFlyPointerMove(event); return; }
        if (!this.enabled || this._pointerId === null || event.pointerId !== this._pointerId) return;
        const dx = event.clientX - this._pointerX;
        const dy = event.clientY - this._pointerY;
        this._pointerX = event.clientX;
        this._pointerY = event.clientY;
        this._zoomCursorClientX = event.clientX;
        this._zoomCursorClientY = event.clientY;
        this._zoomCursorValid = true;
        if (dx === 0 && dy === 0) return;
        if (this._state === "rotate" && this.enableRotate) {
            if (this._mode === "orbit") {
                const h = Math.max(1, this.getViewportHeight());
                const s = (2 * Math.PI) / h;
                this._thetaDelta += (-dx * s) * this.rotateSpeed;
                this._phiDelta += (-dy * s) * this.rotateSpeed;
            } else {
                const v = this.getTrackballVector(event.clientX, event.clientY);
                const q = this.rotationFromTrackballDrag(this._trackballRotateStart, v);
                if (q) this._trackballRotationDelta = quatnormalize(...quatmul(q[0], q[1], q[2], q[3], this._trackballRotationDelta[0], this._trackballRotationDelta[1], this._trackballRotationDelta[2], this._trackballRotationDelta[3]));
                this._trackballRotateStart = v;
            }
        } else if (this._state === "pan" && this.enablePan) {
            if (this._mode === "orbit") this.panOrbit(dx, dy);
            else this.panTrackball(dx, dy);
        } else if (this._state === "zoom" && this.enableZoom) this._dollyDelta += dy * this.zoomSpeed * 0.002;
        event.preventDefault();
    };

    private onPointerUp = (event: PointerEvent): void => {
        if (this._mode === "fly") { this.onFlyPointerUp(event); return; }
        if (this._pointerId === null || event.pointerId !== this._pointerId) return;
        this.domElement.releasePointerCapture(this._pointerId);
        this._pointerId = null;
        this._state = "none";
        this.setInteractionState(false);
        event.preventDefault();
    };

    private onWheel = (event: WheelEvent): void => {
        if (this._mode === "fly") { this.onFlyWheel(event); return; }
        if (!this.enabled || !this.enableZoom) return;
        this.cancelTransition();
        this._dollyDelta += event.deltaY * this.zoomSpeed * 0.001;
        this._zoomCursorClientX = event.clientX;
        this._zoomCursorClientY = event.clientY;
        this._zoomCursorValid = true;
        this.setInteractionState(true);
        this.scheduleWheelInteractionEnd();
        event.preventDefault();
        event.stopPropagation();
    };

    private onContextMenu = (event: MouseEvent): void => {
        event.preventDefault();
    };

    private onFlyPointerDown(event: PointerEvent): void {
        if (!this.enablePointer || event.button !== this.mouseButton) return;
        this._pointerId = event.pointerId;
        try { this.domElement.setPointerCapture(this._pointerId); } catch { /* ignore */ }
        this._pointerX = event.clientX;
        this._pointerY = event.clientY;
        this._state = "fly";
        this.setInteractionState(true);
        if (this.pointerLock !== false && !this._flyPointerLocked) this.requestFlyPointerLock();
        event.preventDefault();
    }

    private onFlyPointerMove(event: PointerEvent): void {
        if (!this.enabled || !this.enablePointer) return;
        if (!this._flyPointerLocked && (this._pointerId === null || event.pointerId !== this._pointerId)) return;
        const dx = this._flyPointerLocked ? (event.movementX ?? 0) : event.clientX - this._pointerX;
        const dy = this._flyPointerLocked ? (event.movementY ?? 0) : event.clientY - this._pointerY;
        this._pointerX = event.clientX;
        this._pointerY = event.clientY;
        this.queueFlyLook(dx, dy);
        event.preventDefault();
    }

    private onFlyPointerUp(event: PointerEvent): void {
        if (this._pointerId === null || event.pointerId !== this._pointerId) return;
        try { this.domElement.releasePointerCapture(this._pointerId); } catch { /* ignore */ }
        this._pointerId = null;
        if (this.pointerLock === "on-drag") this.exitFlyPointerLock();
        const keepLocked = this.pointerLock === "on-click" && (this._flyPointerLocked || this._flyPointerLockRequested);
        if (!keepLocked) {
            this._state = "none";
            this.setInteractionState(false);
        }
        event.preventDefault();
    }

    private onFlyWheel(event: WheelEvent): void {
        if (!this.enabled || !this.enableWheel) return;
        this.cancelTransition();
        const lineHeight = 16;
        const pageHeight = this.getViewportHeight();
        const raw = event.deltaMode === 1 ? event.deltaY * lineHeight : event.deltaMode === 2 ? event.deltaY * pageHeight : event.deltaY;
        const steps = clamp(raw / 100, -1, 1);
        if (Math.abs(steps) > EPSILON) this.moveSpeed = clamp(this.moveSpeed * Math.pow(this.wheelSpeedFactor, steps), this.minMoveSpeed, this.maxMoveSpeed);
        this.setInteractionState(true);
        this.scheduleWheelInteractionEnd();
        event.preventDefault();
        event.stopPropagation();
    }

    private onKeyDown = (event: KeyboardEvent): void => {
        if (!this.enabled || this._mode !== "fly" || !this.enableKeyboard || isEditableEventTarget(event.target)) return;
        if (!this._flyMappedKeys.has(event.code)) return;
        this._flyPressedKeys.add(event.code);
        this.setInteractionState(true);
        if (this.preventDefaultKeys) event.preventDefault();
    };

    private onKeyUp = (event: KeyboardEvent): void => {
        if (!this._flyMappedKeys.has(event.code)) return;
        this._flyPressedKeys.delete(event.code);
        if (this._flyPressedKeys.size === 0 && this._pointerId === null && this._state === "none") this.setInteractionState(false);
        if (this.enabled && this._mode === "fly" && this.enableKeyboard && this.preventDefaultKeys && !isEditableEventTarget(event.target)) event.preventDefault();
    };

    private onDocumentMouseMove = (event: MouseEvent): void => {
        if (!this.enabled || this._mode !== "fly" || !this.enablePointer || !this._flyPointerLocked) return;
        this.queueFlyLook(event.movementX ?? 0, event.movementY ?? 0);
        event.preventDefault();
    };

    private onPointerLockChange = (): void => {
        const doc = this._pointerLockDocument;
        const locked = !!doc && doc.pointerLockElement === this.domElement;
        this._flyPointerLocked = locked;
        this._flyPointerLockRequested = false;
        if (locked) {
            this.attachPointerLockMouseMove();
            this._state = "fly";
            this.setInteractionState(true);
            return;
        }
        this.detachPointerLockMouseMove();
        if (this._state === "fly" && this._pointerId === null) {
            this._state = "none";
            this.setInteractionState(false);
        }
    };

    private onPointerLockError = (): void => {
        this._flyPointerLockRequested = false;
        if (this._state === "fly" && this._pointerId === null) {
            this._state = "none";
            this.setInteractionState(false);
        }
    };

    private queueFlyLook(dx: number, dy: number): void {
        if (dx === 0 && dy === 0) return;
        this._flyYawDelta += -dx * this.lookSpeed;
        this._flyPitchDelta += (this.invertY ? dy : -dy) * this.lookSpeed;
    }

    private requestFlyPointerLock(): void {
        const request = this.domElement.requestPointerLock;
        if (typeof request !== "function") return;
        this._flyPointerLockRequested = true;
        try {
            const result = request.call(this.domElement) as Promise<void> | void;
            if (result && typeof (result as Promise<void>).catch === "function") (result as Promise<void>).catch(() => { this.onPointerLockError(); });
        } catch { this.onPointerLockError(); }
    }

    private exitFlyPointerLock(): void {
        if (!this._flyPointerLocked && !this._flyPointerLockRequested) return;
        const doc = this._pointerLockDocument;
        this._flyPointerLockRequested = false;
        if (doc?.pointerLockElement === this.domElement && typeof doc.exitPointerLock === "function") try { doc.exitPointerLock(); } catch { /* ignore */ }
        this._flyPointerLocked = false;
        this.detachPointerLockMouseMove();
    }

    private attachPointerLockMouseMove(): void {
        if (this._documentMouseMoveAttached || !this._pointerLockDocument) return;
        this._pointerLockDocument.addEventListener("mousemove", this.onDocumentMouseMove);
        this._documentMouseMoveAttached = true;
    }

    private detachPointerLockMouseMove(): void {
        if (!this._documentMouseMoveAttached || !this._pointerLockDocument) return;
        this._pointerLockDocument.removeEventListener("mousemove", this.onDocumentMouseMove);
        this._documentMouseMoveAttached = false;
    }

    private updateImplicitKeyboardTarget(): void {
        if (!this._keyboardTargetExplicit) this.keyboardTarget = defaultKeyboardTarget(this._mode);
    }

    private syncKeyboardListeners(): void {
        const target = this._mode === "fly" ? this.keyboardTarget : null;
        if (target === this._keyboardListenerTarget) return;
        this.detachKeyboardListeners();
        if (!target) return;
        target.addEventListener("keydown", this.onKeyDown as EventListener);
        target.addEventListener("keyup", this.onKeyUp as EventListener);
        this._keyboardListenerTarget = target;
    }

    private detachKeyboardListeners(): void {
        if (!this._keyboardListenerTarget) return;
        this._keyboardListenerTarget.removeEventListener("keydown", this.onKeyDown as EventListener);
        this._keyboardListenerTarget.removeEventListener("keyup", this.onKeyUp as EventListener);
        this._keyboardListenerTarget = null;
    }

    private stopFlyInteraction(): void {
        this._flyPressedKeys.clear();
        this._flyYawDelta = 0;
        this._flyPitchDelta = 0;
        this.exitFlyPointerLock();
        if (this._pointerId !== null) try { this.domElement.releasePointerCapture(this._pointerId); } catch { /* ignore */ }
        this._state = "none";
        this._pointerId = null;
        this.setInteractionState(false);
    }

    private getPointerLockDocument(): Document | null {
        const doc = this.domElement.ownerDocument ?? (typeof document !== "undefined" ? document : null);
        if (!doc || typeof doc.addEventListener !== "function" || typeof doc.removeEventListener !== "function") return null;
        return doc;
    }

    private getViewportRect(): { left: number; top: number; width: number; height: number } {
        const rect = this.domElement.getBoundingClientRect();
        const width = Math.max(1, rect.width || this.domElement.clientWidth || 1);
        const height = Math.max(1, rect.height || this.domElement.clientHeight || 1);
        return { left: rect.left, top: rect.top, width, height };
    }

    private getViewportWidth(): number {
        return this.getViewportRect().width;
    }

    private getViewportHeight(): number {
        return this.getViewportRect().height;
    }

    private getAspect(aspectOverride?: number): number {
        if (aspectOverride && aspectOverride > 0) return aspectOverride;
        if (this.camera instanceof PerspectiveCamera && !this.camera.autoAspect && Number.isFinite(this.camera.aspect) && this.camera.aspect > 0) return this.camera.aspect;
        return this.getViewportWidth() / Math.max(1, this.getViewportHeight());
    }

    private captureProjectionState(): ProjectionState {
        if (this.camera.type === "orthographic") {
            const camera = this.camera as OrthographicCamera;
            return { type: "orthographic", left: camera.left, right: camera.right, top: camera.top, bottom: camera.bottom, near: camera.near, far: camera.far };
        }
        const camera = this.camera as PerspectiveCamera;
        return { type: "perspective", near: camera.near, far: camera.far };
    }

    private applyProjectionState(state: ProjectionState): void {
        if (state.type === "orthographic" && this.camera.type === "orthographic") {
            const camera = this.camera as OrthographicCamera;
            camera.left = state.left;
            camera.right = state.right;
            camera.top = state.top;
            camera.bottom = state.bottom;
            camera.near = state.near;
            camera.far = state.far;
        } else if (state.type === "perspective" && this.camera.type === "perspective") {
            const camera = this.camera as PerspectiveCamera;
            camera.near = state.near;
            camera.far = state.far;
        }
    }

    private lerpProjectionState(a: ProjectionState, b: ProjectionState, t: number): ProjectionState {
        if (a.type === "orthographic" && b.type === "orthographic") {
            return {
                type: "orthographic",
                left: lerp(a.left, b.left, t),
                right: lerp(a.right, b.right, t),
                top: lerp(a.top, b.top, t),
                bottom: lerp(a.bottom, b.bottom, t),
                near: lerp(a.near, b.near, t),
                far: lerp(a.far, b.far, t)
            };
        }
        const lerpFar = (farA: number, farB: number, factor: number): number => {
            const invA = Number.isFinite(farA) && farA > 0 ? 1 / farA : 0;
            const invB = Number.isFinite(farB) && farB > 0 ? 1 / farB : 0;
            const inv = lerp(invA, invB, factor);
            return inv <= 1e-12 ? Infinity : 1 / inv;
        };
        return {
            type: "perspective",
            near: lerp((a as ProjectionState).near, (b as ProjectionState).near, t),
            far: lerpFar((a as ProjectionState).far, (b as ProjectionState).far, t)
        };
    }

    private applyPose(position: Vec3, target: Vec3, up: Vec3): void {
        this.target = vec3clone(target);
        this.camera.setWorldPosition(position[0], position[1], position[2]);
        this.camera.lookAtWithUp(target, up);
    }

    private applyPoseOrTransition(position: Vec3, target: Vec3, up: Vec3, projection: ProjectionState, animate: boolean | undefined, duration: number | undefined): void {
        const shouldAnimate = animate ?? true;
        if (!shouldAnimate || (duration ?? DEFAULT_TRANSITION_SECONDS) <= 0) {
            this.cancelTransition();
            this.applyPose(position, target, up);
            this.applyProjectionState(projection);
            this.syncFromCamera();
            this.emitChange();
            return;
        }
        this._transition = {
            elapsed: 0,
            duration: duration ?? DEFAULT_TRANSITION_SECONDS,
            fromPosition: vec3clone(this.camera.position),
            toPosition: vec3clone(position),
            fromTarget: vec3clone(this.target),
            toTarget: vec3clone(target),
            fromUp: vec3normalize(this.camera.up, this._axisConvention.up),
            toUp: vec3normalize(up, this._axisConvention.up),
            fromProjection: this.captureProjectionState(),
            toProjection: projection
        };
    }

    private updateFly(dt: number): void {
        const damping = this.enableDamping ? (1 - Math.pow(1 - clamp01(this.dampingFactor), dt * 60)) : 1;
        const yaw = this.enablePointer ? this._flyYawDelta * damping : 0;
        const pitch = this.enablePointer ? this._flyPitchDelta * damping : 0;
        const roll = this.enableKeyboard ? this.getFlyAxis("rollRight", "rollLeft") * this.rollSpeed * dt : 0;
        if (Math.abs(yaw) > EPSILON || Math.abs(pitch) > EPSILON || Math.abs(roll) > EPSILON) this.applyFlyRotation(yaw, pitch, roll);
        if (this.enablePointer) {
            this._flyYawDelta *= (1 - damping);
            this._flyPitchDelta *= (1 - damping);
        } else {
            this._flyYawDelta = 0;
            this._flyPitchDelta = 0;
        }
        if (!this.enableKeyboard) return;
        const x = this.getFlyAxis("right", "left");
        const y = this.getFlyAxis("up", "down");
        const z = this.getFlyAxis("forward", "backward");
        const mag = Math.hypot(x, y, z);
        if (mag <= EPSILON) return;
        const basis = this.computeFlyBasis();
        const direction = vec3scl(vec3add(vec3add(vec3scl(basis.right, x), vec3scl(basis.up, y)), vec3scl(basis.forward, z)), 1 / mag);
        const speed = this.moveSpeed * this.getFlySpeedMultiplier() * dt;
        const position = vec3add(this.camera.position, vec3scl(direction, speed));
        this.applyFlyPose(position, basis.forward, basis.up);
    }

    private updateOrbit(dt: number): void {
        const damping = this.enableDamping ? (1 - Math.pow(1 - clamp01(this.dampingFactor), dt * 60)) : 1;
        if (this.enableRotate) {
            this._theta += this._thetaDelta * damping;
            this._phi += this._phiDelta * damping;
            this._thetaDelta *= (1 - damping);
            this._phiDelta *= (1 - damping);
        } else {
            this._thetaDelta = 0;
            this._phiDelta = 0;
        }
        const minPhi = Math.max(this.minPolarAngle, ORBIT_POLE_EPS);
        const maxPhi = Math.min(this.maxPolarAngle, Math.PI - ORBIT_POLE_EPS);
        if (minPhi <= maxPhi) this._phi = clamp(this._phi, minPhi, maxPhi);
        else this._phi = clamp(this._phi, this.minPolarAngle, this.maxPolarAngle);
        this._theta = clamp(this._theta, this.minAzimuthAngle, this.maxAzimuthAngle);
        this.applyDolly(damping, this.computeOrbitBasis());
        this.applyPan(damping);
        this._radius = clamp(this._radius, this.minDistance, this.maxDistance);
        const offset = this.sphericalToOffset(this._theta, this._phi, Math.max(EPSILON, this._radius));
        const position = vec3add(this.target, offset);
        const forward = vec3normalize(vec3sub(this.target, position), vec3scl(this._axisConvention.forward, -1));
        const up = this.getOrbitUp(forward);
        this.camera.setWorldPosition(position[0], position[1], position[2]);
        this.camera.lookAtWithUp(this.target, up);
        if (this.camera.type === "orthographic") this.applyOrthographicZoom();
        else this.relaxPerspectiveClipForZoom();
    }

    private updateTrackball(dt: number): void {
        const damping = this.enableDamping ? (1 - Math.pow(1 - clamp01(this.dampingFactor), dt * 60)) : 1;
        if (this.enableRotate) {
            const delta = this._trackballRotationDelta;
            if (!quatisid(delta[0], delta[1], delta[2], delta[3])) {
                const step = quatslerpid(delta[0], delta[1], delta[2], delta[3], damping);
                this._trackballEye = quatrotvec(this._trackballEye[0], this._trackballEye[1], this._trackballEye[2], step[0], step[1], step[2], step[3]);
                this._trackballUp = vec3normalize(quatrotvec(this._trackballUp[0], this._trackballUp[1], this._trackballUp[2], step[0], step[1], step[2], step[3]), this._axisConvention.up);
                const remainder = quatmul(delta[0], delta[1], delta[2], delta[3], ...quatinvert(step[0], step[1], step[2], step[3]));
                this._trackballRotationDelta = quatnormalize(remainder[0], remainder[1], remainder[2], remainder[3]);
            }
        } else this._trackballRotationDelta = [0, 0, 0, 1];
        this.applyDolly(damping, this.computeTrackballBasis());
        this.applyPan(damping);
        const radius = vec3mag(this._trackballEye);
        this._radius = clamp(Math.max(EPSILON, radius), this.minDistance, this.maxDistance);
        if (radius > EPSILON) this._trackballEye = vec3scl(this._trackballEye, this._radius / radius);
        else this._trackballEye = vec3scl(this._axisConvention.forward, this._radius);
        const position = vec3add(this.target, this._trackballEye);
        this.camera.setWorldPosition(position[0], position[1], position[2]);
        this.camera.lookAtWithUp(this.target, this._trackballUp);
        if (this.camera.type === "orthographic") this.applyOrthographicZoom();
        else this.relaxPerspectiveClipForZoom();
    }

    private emitChange(): void {
        for (const listener of this._changeListeners) try { listener(); } catch { /* ignore */ }
    }

    private setInteractionState(active: boolean): void {
        if (this._interactionActive === active) return;
        this._interactionActive = active;
        for (const listener of this._interactionListeners) try { listener(active); } catch { /* ignore */ }
    }

    private clearWheelInteractionTimer(): void {
        if (this._wheelInteractionTimer === null) return;
        clearTimeout(this._wheelInteractionTimer);
        this._wheelInteractionTimer = null;
    }

    private scheduleWheelInteractionEnd(): void {
        this.clearWheelInteractionTimer();
        this._wheelInteractionTimer = setTimeout(() => {
            this._wheelInteractionTimer = null;
            if (this._pointerId === null && this._state === "none") this.setInteractionState(false);
        }, 120);
    }

    private applyDolly(damping: number, basis: Basis3): void {
        if (!this.enableZoom) { this._dollyDelta = 0; return; }
        const dolly = this._dollyDelta * damping;
        if (Math.abs(dolly) <= EPSILON) { this._dollyDelta *= (1 - damping); return; }
        const prevRadius = this._radius;
        const prevZoom = this._zoom;
        if (this.camera.type === "orthographic") this._zoom = clamp(this._zoom * Math.exp(-dolly), this.minZoom, this.maxZoom);
        else {
            const next = clamp(this._radius * Math.exp(dolly), this.minDistance, this.maxDistance);
            if (this._mode === "trackball") {
                const current = Math.max(EPSILON, vec3mag(this._trackballEye));
                this._trackballEye = vec3scl(this._trackballEye, next / current);
            }
            this._radius = next;
        }
        if (this.zoomOnCursor && this._zoomCursorValid) this.applyZoomOnCursor(prevRadius, prevZoom, basis);
        this._dollyDelta *= (1 - damping);
    }

    private applyPan(damping: number): void {
        if (!this.enablePan) { this._panOffset = [0, 0, 0]; return; }
        this.target[0] += this._panOffset[0] * damping;
        this.target[1] += this._panOffset[1] * damping;
        this.target[2] += this._panOffset[2] * damping;
        this._panOffset = vec3scl(this._panOffset, 1 - damping);
    }

    private panOrbit(deltaX: number, deltaY: number): void {
        const basis = this.computeOrbitBasis();
        this.queuePan(deltaX, deltaY, basis);
    }

    private panTrackball(deltaX: number, deltaY: number): void {
        const basis = this.computeTrackballBasis();
        this.queuePan(deltaX, deltaY, basis);
    }

    private queuePan(deltaX: number, deltaY: number, basis: Basis3): void {
        const w = Math.max(1, this.getViewportWidth());
        const h = Math.max(1, this.getViewportHeight());
        let panX = 0;
        let panY = 0;
        if (this.camera.type === "orthographic") {
            const viewW = (this._orthoBaseRight - this._orthoBaseLeft) / Math.max(EPSILON, this._zoom);
            const viewH = (this._orthoBaseTop - this._orthoBaseBottom) / Math.max(EPSILON, this._zoom);
            panX = (deltaX * viewW / w) * this.panSpeed;
            panY = (deltaY * viewH / h) * this.panSpeed;
        } else {
            const camera = this.camera as PerspectiveCamera;
            const targetDistance = this._radius * Math.tan((camera.fov * Math.PI / 180) * 0.5);
            const aspect = (!camera.autoAspect && Number.isFinite(camera.aspect) && camera.aspect > 0) ? camera.aspect : (w / h);
            panX = (2 * deltaX * targetDistance * aspect / w) * this.panSpeed;
            panY = (2 * deltaY * targetDistance / h) * this.panSpeed;
        }
        this._panOffset = vec3add(this._panOffset, vec3add(vec3scl(basis.right, -panX), vec3scl(basis.up, panY)));
    }

    private applyZoomOnCursor(prevRadius: number, prevZoom: number, basis: Basis3): void {
        const rect = this.getViewportRect();
        const x01 = (this._zoomCursorClientX - rect.left) / rect.width;
        const y01 = (this._zoomCursorClientY - rect.top) / rect.height;
        const ndcX = (x01 * 2) - 1;
        const ndcY = 1 - (y01 * 2);
        if (this.camera.type === "orthographic") {
            const baseW = this._orthoBaseRight - this._orthoBaseLeft;
            const baseH = this._orthoBaseTop - this._orthoBaseBottom;
            const oldHalfW = (baseW / Math.max(EPSILON, prevZoom)) * 0.5;
            const newHalfW = (baseW / Math.max(EPSILON, this._zoom)) * 0.5;
            const oldHalfH = (baseH / Math.max(EPSILON, prevZoom)) * 0.5;
            const newHalfH = (baseH / Math.max(EPSILON, this._zoom)) * 0.5;
            this.target = vec3add(this.target, vec3add(vec3scl(basis.right, ndcX * (oldHalfW - newHalfW)), vec3scl(basis.up, ndcY * (oldHalfH - newHalfH))));
            return;
        }
        const camera = this.camera as PerspectiveCamera;
        const tanHalfFov = Math.tan((camera.fov * Math.PI / 180) * 0.5);
        const aspect = (!camera.autoAspect && Number.isFinite(camera.aspect) && camera.aspect > 0) ? camera.aspect : (rect.width / rect.height);
        const oldHalfH = prevRadius * tanHalfFov;
        const newHalfH = this._radius * tanHalfFov;
        const oldHalfW = oldHalfH * aspect;
        const newHalfW = newHalfH * aspect;
        this.target = vec3add(this.target, vec3add(vec3scl(basis.right, ndcX * (oldHalfW - newHalfW)), vec3scl(basis.up, ndcY * (oldHalfH - newHalfH))));
    }

    private applyOrthographicZoom(): void {
        if (this.camera.type !== "orthographic") return;
        const camera = this.camera as OrthographicCamera;
        const cx = (this._orthoBaseLeft + this._orthoBaseRight) * 0.5;
        const cy = (this._orthoBaseBottom + this._orthoBaseTop) * 0.5;
        const width = (this._orthoBaseRight - this._orthoBaseLeft) / Math.max(EPSILON, this._zoom);
        const height = (this._orthoBaseTop - this._orthoBaseBottom) / Math.max(EPSILON, this._zoom);
        camera.left = cx - width * 0.5;
        camera.right = cx + width * 0.5;
        camera.bottom = cy - height * 0.5;
        camera.top = cy + height * 0.5;
    }

    private relaxPerspectiveClipForZoom(): void {
        if (this.camera.type !== "perspective") return;
        const camera = this.camera as PerspectiveCamera;
        const minNear = 1e-5;
        const desiredNear = Math.max(minNear, this._radius * 1e-3);
        const maxNear = Number.isFinite(camera.far) ? Math.max(minNear, camera.far - 0.01) : desiredNear;
        const nextNear = clamp(desiredNear, minNear, maxNear);
        if (Math.abs(nextNear - camera.near) > Math.max(minNear, camera.near) * 1e-3) camera.near = nextNear;
        if (Number.isFinite(camera.far)) {
            const desiredFar = Math.max(this._radius * 4, camera.near + 0.01);
            if (desiredFar > camera.far) camera.far = desiredFar;
        }
    }

    private offsetToSpherical(offset: readonly number[]): { theta: number; phi: number; } {
        const localX = vec3dot(offset, this._axisConvention.right);
        const localY = vec3dot(offset, this._axisConvention.up);
        const localZ = vec3dot(offset, this._axisConvention.forward);
        const radius = Math.max(EPSILON, Math.hypot(localX, localY, localZ));
        return { theta: Math.atan2(localX, localZ), phi: Math.acos(clamp(localY / radius, -1, 1)) };
    }

    private sphericalToOffset(theta: number, phi: number, radius: number): Vec3 {
        const sinPhi = Math.sin(phi);
        const x = radius * sinPhi * Math.sin(theta);
        const y = radius * Math.cos(phi);
        const z = radius * sinPhi * Math.cos(theta);
        return vec3add(vec3add(vec3scl(this._axisConvention.right, x), vec3scl(this._axisConvention.up, y)), vec3scl(this._axisConvention.forward, z));
    }

    private computeLookBasis(forwardHint: readonly number[], upHint: readonly number[]): Basis3 {
        const forward = vec3normalize(forwardHint, vec3scl(this._axisConvention.forward, -1));
        let up = vec3normalize(upHint, this._axisConvention.up);
        if (Math.abs(vec3dot(forward, up)) > 0.999) up = Math.abs(forward[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        const right = vec3normalize(vec3cross(forward, up), this._axisConvention.right);
        const correctedUp = vec3normalize(vec3cross(right, forward), up);
        return { right, up: correctedUp, forward };
    }

    private computeOrbitBasis(): Basis3 {
        const offset = this.sphericalToOffset(this._theta, this._phi, Math.max(EPSILON, this._radius));
        const forward = vec3normalize(vec3scl(offset, -1), vec3scl(this._axisConvention.forward, -1));
        return this.computeLookBasis(forward, this.getOrbitUp(forward));
    }

    private computeTrackballBasis(): Basis3 {
        const forward = vec3normalize(vec3scl(this._trackballEye, -1), vec3scl(this._axisConvention.forward, -1));
        const basis = this.computeLookBasis(forward, this._trackballUp);
        this._trackballUp = basis.up;
        return basis;
    }

    private computeFlyBasis(): Basis3 {
        const q = this.camera.transform.worldRotation;
        const forward = quatrotvec(0, 0, -1, q[0], q[1], q[2], q[3]);
        const up = quatrotvec(0, 1, 0, q[0], q[1], q[2], q[3]);
        return this.computeLookBasis(forward, up);
    }

    private applyFlyRotation(yaw: number, pitch: number, roll: number): void {
        let basis = this.computeFlyBasis();
        let { right, up, forward } = basis;
        const globalYaw = this.yawMode === "global";
        if (Math.abs(yaw) > EPSILON) {
            const yawAxis = globalYaw ? this._axisConvention.up : up;
            forward = vec3rotate(forward, yawAxis, yaw);
            basis = this.computeLookBasis(forward, yawAxis);
            right = basis.right;
            up = basis.up;
        }
        if (Math.abs(pitch) > EPSILON) {
            forward = vec3rotate(forward, right, pitch);
            up = vec3rotate(up, right, pitch);
            basis = this.computeLookBasis(forward, globalYaw ? this._axisConvention.up : up);
            right = basis.right;
            up = basis.up;
        }
        if (Math.abs(roll) > EPSILON) {
            right = vec3rotate(right, forward, roll);
            up = vec3rotate(up, forward, roll);
        }
        basis = this.computeLookBasis(forward, up);
        this.applyFlyPose(vec3clone(this.camera.position), basis.forward, basis.up);
    }

    private applyFlyPose(position: Vec3, forward: Vec3, up: Vec3): void {
        this.camera.setWorldPosition(position[0], position[1], position[2]);
        this.camera.lookAtWithUp(vec3add(position, forward), up);
        this.target = vec3add(position, vec3scl(forward, Math.max(EPSILON, this._radius)));
    }

    private getFlyAxis(positive: FlyControlsKeyAction, negative: FlyControlsKeyAction): number {
        return (this.isFlyActionPressed(positive) ? 1 : 0) - (this.isFlyActionPressed(negative) ? 1 : 0);
    }

    private getFlySpeedMultiplier(): number {
        let multiplier = 1;
        if (this.isFlyActionPressed("fast")) multiplier *= this.fastMultiplier;
        if (this.isFlyActionPressed("slow")) multiplier *= this.slowMultiplier;
        return multiplier;
    }

    private isFlyActionPressed(action: FlyControlsKeyAction): boolean {
        for (const code of this.keyMap[action]) if (this._flyPressedKeys.has(code)) return true;
        return false;
    }

    private getOrbitUp(forward: readonly number[]): Vec3 {
        const worldUp = this._axisConvention.up;
        let upProj = vec3sub(worldUp, vec3scl(forward, vec3dot(worldUp, forward)));
        let mag = vec3mag(upProj);
        if (mag > EPSILON) return vec3scl(upProj, 1 / mag);
        const forwardAxis = this._axisConvention.forward;
        upProj = vec3sub(forwardAxis, vec3scl(forward, vec3dot(forwardAxis, forward)));
        mag = vec3mag(upProj);
        if (mag > EPSILON) return vec3scl(upProj, 1 / mag);
        return vec3clone(this._axisConvention.right);
    }

    private getTrackballVector(clientX: number, clientY: number): Vec3 {
        const rect = this.getViewportRect();
        const x = (((clientX - rect.left) / rect.width) * 2) - 1;
        const y = 1 - (((clientY - rect.top) / rect.height) * 2);
        const len2 = (x * x) + (y * y);
        if (len2 <= 1) return [x, y, Math.sqrt(1 - len2)];
        const inv = 1 / Math.sqrt(len2);
        return [x * inv, y * inv, 0];
    }

    private rotationFromTrackballDrag(start: readonly number[], end: readonly number[]): [number, number, number, number] | null {
        const dot = clamp(vec3dot(start, end), -1, 1);
        let angle = Math.acos(dot);
        if (angle <= EPSILON) return null;
        angle *= this.rotateSpeed;
        let axis = vec3cross(start, end);
        const axisLength = vec3mag(axis);
        if (axisLength <= EPSILON) return null;
        axis = vec3scl(axis, 1 / axisLength);
        const basis = this.computeTrackballBasis();
        const worldAxis = vec3normalize(vec3add(vec3add(vec3scl(basis.right, axis[0]), vec3scl(basis.up, axis[1])), vec3scl(vec3scl(basis.forward, -1), axis[2])), basis.right);
        const half = angle * 0.5;
        const sinHalf = Math.sin(half);
        return [worldAxis[0] * sinHalf, worldAxis[1] * sinHalf, worldAxis[2] * sinHalf, Math.cos(half)];
    }

    private resolveBounds(source: BoundsLike | Scene): Bounds3 {
        return normalizeBounds(source as BoundsLike);
    }

    private getInspectionViewDirection(view: InspectionView): Vec3 {
        switch (view) {
            case "front": return vec3clone(this._axisConvention.forward);
            case "back": return vec3scl(this._axisConvention.forward, -1);
            case "right": return vec3clone(this._axisConvention.right);
            case "left": return vec3scl(this._axisConvention.right, -1);
            case "top": return vec3clone(this._axisConvention.up);
            case "bottom": return vec3scl(this._axisConvention.up, -1);
        }
    }

    private getInspectionViewUp(view: InspectionView): Vec3 {
        if (view === "top") return vec3scl(this._axisConvention.forward, -1);
        if (view === "bottom") return vec3clone(this._axisConvention.forward);
        return vec3clone(this._axisConvention.up);
    }

    private getCurrentViewOrientation(): { direction: Vec3; up: Vec3; } {
        const position = vec3clone(this.camera.position);
        const direction = vec3normalize(vec3sub(position, this.target), this._axisConvention.forward);
        return { direction, up: vec3normalize(this.camera.up, this.getOrbitUp(vec3scl(direction, -1))) };
    }

    private solveFit(bounds: Bounds3, options: FitToBoundsOptions): FitSolveResult {
        const padding = Math.max(1, options.padding ?? 1.1);
        const aspect = this.getAspect(options.aspect);
        const orientation = options.view
            ? { direction: this.getInspectionViewDirection(options.view), up: options.up ? vec3normalize(options.up, this._axisConvention.up) : this.getInspectionViewUp(options.view) }
            : { direction: options.eyeDirection ? vec3normalize(options.eyeDirection, this._axisConvention.forward) : this.getCurrentViewOrientation().direction, up: options.up ? vec3normalize(options.up, this._axisConvention.up) : this.getCurrentViewOrientation().up };
        const working = options.boundsMode === "sphere"
            ? boundsFromSphere(bounds.sphereCenter, bounds.sphereRadius * padding, bounds.partial)
            : expandBounds(bounds, padding);
        const basis = this.computeLookBasis(vec3scl(orientation.direction, -1), orientation.up);
        const target = options.boundsMode === "sphere" ? vec3clone(bounds.sphereCenter) : getBoundsCenter(working);
        if (this.camera.type === "orthographic") return this.solveFitOrthographic(working, bounds, basis, target, aspect, options.minNear);
        return this.solveFitPerspective(working, bounds, basis, target, aspect, options.minNear);
    }

    private solveFitPerspective(working: Bounds3, sourceBounds: Bounds3, basis: Basis3, target: Vec3, aspect: number, minNear: number | undefined): FitSolveResult {
        const corners = getBoundsCorners(working);
        const camera = this.camera as PerspectiveCamera;
        const tanHalfV = Math.tan((camera.fov * Math.PI / 180) * 0.5);
        const tanHalfH = tanHalfV * Math.max(aspect, EPSILON);
        let distance = sourceBounds.sphereRadius;
        const zs: number[] = [];
        for (const corner of corners) {
            const delta = vec3sub(corner, target);
            const x = vec3dot(delta, basis.right);
            const y = vec3dot(delta, basis.up);
            const z = vec3dot(delta, basis.forward);
            zs.push(z);
            distance = Math.max(distance, (Math.abs(x) / Math.max(tanHalfH, EPSILON)) - z, (Math.abs(y) / Math.max(tanHalfV, EPSILON)) - z);
        }
        distance = Math.max(distance, sourceBounds.sphereRadius, minNear ?? 0.01);
        const minDepth = Math.min(...zs.map((z) => distance + z));
        const maxDepth = Math.max(...zs.map((z) => distance + z));
        const nearFloor = minNear ?? 0.01;
        const depthPadding = Math.max(sourceBounds.sphereRadius * 0.05, 0.01);
        const stableRadius = Math.max(working.sphereRadius, sourceBounds.sphereRadius, 0.01);
        const stablePadding = Math.max(stableRadius * 0.1, depthPadding);
        const stableNear = distance - stableRadius - stablePadding;
        const stableFar = distance + stableRadius + stablePadding;
        const near = Math.max(nearFloor, Math.min(minDepth - depthPadding, stableNear));
        const far = Math.max(near + 0.01, Math.max(maxDepth + depthPadding, stableFar));
        return {
            position: vec3add(target, vec3scl(vec3scl(basis.forward, -1), distance)),
            target, up: basis.up,
            projection: { type: "perspective", near, far }
        };
    }

    private solveFitOrthographic(working: Bounds3, sourceBounds: Bounds3, basis: Basis3, target: Vec3, aspect: number, minNear: number | undefined): FitSolveResult {
        const corners = getBoundsCorners(working);
        let halfWidth = 0;
        let halfHeight = 0;
        let minZ = Infinity;
        let maxZ = -Infinity;
        for (const corner of corners) {
            const delta = vec3sub(corner, target);
            const x = vec3dot(delta, basis.right);
            const y = vec3dot(delta, basis.up);
            const z = vec3dot(delta, basis.forward);
            halfWidth = Math.max(halfWidth, Math.abs(x));
            halfHeight = Math.max(halfHeight, Math.abs(y));
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
        }
        if (aspect >= 1) halfWidth = Math.max(halfWidth, halfHeight * aspect);
        else halfHeight = Math.max(halfHeight, halfWidth / Math.max(aspect, EPSILON));
        const halfDepth = Math.max(Math.abs(minZ), Math.abs(maxZ), sourceBounds.sphereRadius);
        const distance = Math.max(halfDepth * 2 + Math.max(halfWidth, halfHeight), sourceBounds.sphereRadius * 2, 0.1);
        const nearFloor = minNear ?? 0.01;
        const depthPadding = Math.max(sourceBounds.sphereRadius * 0.05, 0.01);
        const stableRadius = Math.max(working.sphereRadius, sourceBounds.sphereRadius, 0.01);
        const stablePadding = Math.max(stableRadius * 0.1, depthPadding);
        const near = Math.max(nearFloor, Math.min(distance + minZ - depthPadding, distance - stableRadius - stablePadding));
        const far = Math.max(near + 0.01, Math.max(distance + maxZ + depthPadding, distance + stableRadius + stablePadding));
        return {
            position: vec3add(target, vec3scl(vec3scl(basis.forward, -1), distance)),
            target, up: basis.up,
            projection: { type: "orthographic", left: -Math.max(halfWidth, 0.01), right: Math.max(halfWidth, 0.01), bottom: -Math.max(halfHeight, 0.01), top: Math.max(halfHeight, 0.01), near, far }
        };
    }
}

export class OrbitControls extends NavigationControls {
    constructor(camera: Camera, domElement: HTMLCanvasElement, desc: OrbitControlsDescriptor = {}) {
        super(camera, domElement, { ...desc, mode: "orbit" });
    }
}

export class TrackballControls extends NavigationControls {
    constructor(camera: Camera, domElement: HTMLCanvasElement, desc: TrackballControlsDescriptor = {}) {
        super(camera, domElement, { ...desc, mode: "trackball" });
    }
}

export class FlyControls extends NavigationControls {
    constructor(camera: Camera, domElement: HTMLCanvasElement, desc: FlyControlsDescriptor = {}) {
        super(camera, domElement, { ...desc, mode: "fly" });
    }
}
