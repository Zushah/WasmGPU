/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Transform, TransformStore } from "../core/transform";
import { mat4, vec3, WasmPtr } from "../wasm";

export type CameraType = "perspective" | "orthographic";

export abstract class Camera {
    readonly transform: Transform;
    readonly type: CameraType;
    protected _projectionMatrix: number[] | null = null;
    protected _viewMatrix: number[] | null = null;
    protected _viewProjectionMatrix: number[] | null = null;
    protected _projectionDirty: boolean = true;
    private static _quatScratch: number[] = [0, 0, 0, 1];
    private static _posScratch: number[] = [0, 0, 0];
    private _viewMatrixArray: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    constructor(type: CameraType) {
        this.type = type;
        this.transform = new Transform();
    }

    get destroyed(): boolean {
        return this.transform.disposed;
    }

    abstract getProjectionMatrix(): number[];

    writeViewMatrixToArray(out: number[] | Float32Array, offset: number = 0): number[] | Float32Array {
        const q = this.transform.getWorldRotation(Camera._quatScratch);
        const x = q[0]!, y = q[1]!, z = q[2]!, w = q[3]!;
        const pos = this.transform.getWorldPosition(Camera._posScratch);
        const tx = pos[0]!, ty = pos[1]!, tz = pos[2]!;
        const xx = x * x, yy = y * y, zz = z * z;
        const xy = x * y, xz = x * z, yz = y * z;
        const wx = w * x, wy = w * y, wz = w * z;
        const m0 = 1.0 - 2.0 * (yy + zz);
        const m1 = 2.0 * (xy + wz);
        const m2 = 2.0 * (xz - wy);
        const m4 = 2.0 * (xy - wz);
        const m5 = 1.0 - 2.0 * (xx + zz);
        const m6 = 2.0 * (yz + wx);
        const m8 = 2.0 * (xz + wy);
        const m9 = 2.0 * (yz - wx);
        const m10 = 1.0 - 2.0 * (xx + yy);
        out[offset + 0] = m0;
        out[offset + 1] = m4;
        out[offset + 2] = m8;
        out[offset + 3] = 0;
        out[offset + 4] = m1;
        out[offset + 5] = m5;
        out[offset + 6] = m9;
        out[offset + 7] = 0;
        out[offset + 8] = m2;
        out[offset + 9] = m6;
        out[offset + 10] = m10;
        out[offset + 11] = 0;
        out[offset + 12] = -(m0 * tx + m1 * ty + m2 * tz);
        out[offset + 13] = -(m4 * tx + m5 * ty + m6 * tz);
        out[offset + 14] = -(m8 * tx + m9 * ty + m10 * tz);
        out[offset + 15] = 1.0;
        return out;
    }

    writeViewMatrixTo(outPtr: WasmPtr): void {
        const f32 = TransformStore.global().f32();
        this.writeViewMatrixToArray(f32, outPtr >>> 2);
    }

    get viewMatrix(): number[] {
        this.writeViewMatrixToArray(this._viewMatrixArray);
        this._viewMatrix = this._viewMatrixArray;
        return this._viewMatrix;
    }

    get viewProjectionMatrix(): number[] {
        const proj = this.getProjectionMatrix();
        const view = this.viewMatrix;
        this._viewProjectionMatrix = mat4.mul(proj, view);
        return this._viewProjectionMatrix;
    }

    get position(): number[] {
        return this.transform.worldPosition;
    }

    setWorldPosition(x: number, y: number, z: number): this {
        const parent = this.transform.parent;
        if (!parent) { this.transform.setPosition(x, y, z); return this; }
        const m = parent.worldMatrix;
        const a = m[0]!, b = m[4]!, c = m[8]!;
        const d = m[1]!, e = m[5]!, f = m[9]!;
        const g = m[2]!, h = m[6]!, i = m[10]!;
        const det = a * ((e * i) - (f * h)) - b * ((d * i) - (f * g)) + c * ((d * h) - (e * g));
        if (!Number.isFinite(det) || det === 0) return this;
        const dx = x - m[12]!;
        const dy = y - m[13]!;
        const dz = z - m[14]!;
        const invDet = 1 / det;
        const lx = (((e * i) - (f * h)) * dx + ((c * h) - (b * i)) * dy + ((b * f) - (c * e)) * dz) * invDet;
        const ly = (((f * g) - (d * i)) * dx + ((a * i) - (c * g)) * dy + ((c * d) - (a * f)) * dz) * invDet;
        const lz = (((d * h) - (e * g)) * dx + ((b * g) - (a * h)) * dy + ((a * e) - (b * d)) * dz) * invDet;
        if (Number.isFinite(lx) && Number.isFinite(ly) && Number.isFinite(lz)) this.transform.setPosition(lx, ly, lz);
        return this;
    }

    get up(): [number, number, number] {
        const q = this.transform.getWorldRotation(Camera._quatScratch);
        const x = q[0], y = q[1], z = q[2], w = q[3];
        const m4 = 2.0 * (x * y - w * z);
        const m5 = 1.0 - 2.0 * (x * x + z * z);
        const m6 = 2.0 * (y * z + w * x);
        return [m4, m5, m6];
    }

    lookAt(x: number, y: number, z: number): this;
    lookAt(target: number[]): this;
    lookAt(xOrTarget: number | number[], y?: number, z?: number): this {
        const target = typeof xOrTarget === "number" ? [xOrTarget, y!, z!] : xOrTarget;
        return this.lookAtWithUp(target, [0, 1, 0]);
    }

    lookAtWithUp(target: readonly number[], up: readonly number[]): this {
        const eye = this.transform.worldPosition;
        const forward = vec3.normalize(vec3.sub(target as number[], eye));
        let upVec = [up[0], up[1], up[2]];
        if (Math.abs(vec3.dot(forward, upVec)) > 0.999) {
            if (Math.abs(forward[1]) < 0.9) upVec = [0, 1, 0];
            else upVec = [1, 0, 0];
        }
        const right = vec3.normalize(vec3.cross(forward, upVec));
        const correctedUp = vec3.cross(right, forward);
        const lookMatrix = [
            right[0], right[1], right[2], 0,
            correctedUp[0], correctedUp[1], correctedUp[2], 0,
            -forward[0], -forward[1], -forward[2], 0,
            0, 0, 0, 1
        ];
        const quat = Camera.matrixToQuaternion(lookMatrix);
        const parent = this.transform.parent;
        if (!parent) this.transform.setRotation(quat[0], quat[1], quat[2], quat[3]);
        else {
            const p = parent.getWorldRotation(Camera._quatScratch);
            const px = -p[0]!, py = -p[1]!, pz = -p[2]!, pw = p[3]!;
            const qx = quat[0]!, qy = quat[1]!, qz = quat[2]!, qw = quat[3]!;
            this.transform.setRotation((pw * qx) + (px * qw) + (py * qz) - (pz * qy), (pw * qy) - (px * qz) + (py * qw) + (pz * qx), (pw * qz) + (px * qy) - (py * qx) + (pz * qw), (pw * qw) - (px * qx) - (py * qy) - (pz * qz));
        }
        return this;
    }

    protected static matrixToQuaternion(m: number[]): number[] {
        const trace = m[0] + m[5] + m[10];
        let qw: number, qx: number, qy: number, qz: number;
        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1.0);
            qw = 0.25 / s;
            qx = (m[6] - m[9]) * s;
            qy = (m[8] - m[2]) * s;
            qz = (m[1] - m[4]) * s;
        } else if (m[0] > m[5] && m[0] > m[10]) {
            const s = 2.0 * Math.sqrt(1.0 + m[0] - m[5] - m[10]);
            qw = (m[6] - m[9]) / s;
            qx = 0.25 * s;
            qy = (m[4] + m[1]) / s;
            qz = (m[8] + m[2]) / s;
        } else if (m[5] > m[10]) {
            const s = 2.0 * Math.sqrt(1.0 + m[5] - m[0] - m[10]);
            qw = (m[8] - m[2]) / s;
            qx = (m[4] + m[1]) / s;
            qy = 0.25 * s;
            qz = (m[9] + m[6]) / s;
        } else {
            const s = 2.0 * Math.sqrt(1.0 + m[10] - m[0] - m[5]);
            qw = (m[1] - m[4]) / s;
            qx = (m[8] + m[2]) / s;
            qy = (m[9] + m[6]) / s;
            qz = 0.25 * s;
        }
        return [qx, qy, qz, qw];
    }

    protected markProjectionDirty(): void {
        this._projectionDirty = true;
    }

    destroy(): void {
        this.transform.dispose();
    }
}

export type PerspectiveCameraDescriptor = {
    fov?: number;
    aspect?: number;
    autoAspect?: boolean;
    near?: number;
    far?: number;
};

export class PerspectiveCamera extends Camera {
    private _fov: number;
    private _aspect: number;
    private _autoAspect: boolean;
    private _near: number;
    private _far: number;

    constructor(descriptor: PerspectiveCameraDescriptor = {}) {
        super("perspective");
        this._fov = descriptor.fov ?? 60;
        this._aspect = descriptor.aspect ?? 16 / 9;
        this._autoAspect = descriptor.autoAspect ?? true;
        this._near = descriptor.near ?? 0.1;
        this._far = descriptor.far ?? 1000;
    }

    get fov(): number {
        return this._fov;
    }

    set fov(value: number) {
        if (value === this._fov) return;
        this._fov = value;
        this.markProjectionDirty();
    }

    get aspect(): number {
        return this._aspect;
    }

    set aspect(value: number) {
        if (value === this._aspect) return;
        this._aspect = value;
        this.markProjectionDirty();
    }

    get autoAspect(): boolean {
        return this._autoAspect;
    }

    set autoAspect(value: boolean) {
        if (value === this._autoAspect) return;
        this._autoAspect = value;
    }

    get near(): number {
        return this._near;
    }

    set near(value: number) {
        if (value === this._near) return;
        this._near = value;
        this.markProjectionDirty();
    }

    get far(): number {
        return this._far;
    }

    set far(value: number) {
        if (value === this._far) return;
        this._far = value;
        this.markProjectionDirty();
    }

    updateAspect(width: number, height: number): this {
        this._aspect = width / height;
        this.markProjectionDirty();
        return this;
    }

    getProjectionMatrix(): number[] {
        if (this._projectionDirty || !this._projectionMatrix) {
            const fovRad = (this._fov * Math.PI) / 180;
            this._projectionMatrix = mat4.perspective(fovRad, this._aspect, this._near, this._far);
            this._projectionDirty = false;
        }
        return this._projectionMatrix;
    }
}

export type OrthographicCameraDescriptor = {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    near?: number;
    far?: number;
};

export class OrthographicCamera extends Camera {
    private _left: number;
    private _right: number;
    private _top: number;
    private _bottom: number;
    private _near: number;
    private _far: number;

    constructor(descriptor: OrthographicCameraDescriptor = {}) {
        super("orthographic");
        this._left = descriptor.left ?? -10;
        this._right = descriptor.right ?? 10;
        this._top = descriptor.top ?? 10;
        this._bottom = descriptor.bottom ?? -10;
        this._near = descriptor.near ?? 0.1;
        this._far = descriptor.far ?? 1000;
    }

    get left(): number {
        return this._left;
    }

    set left(value: number) {
        if (value === this._left) return;
        this._left = value;
        this.markProjectionDirty();
    }

    get right(): number {
        return this._right;
    }

    set right(value: number) {
        if (value === this._right) return;
        this._right = value;
        this.markProjectionDirty();
    }

    get top(): number {
        return this._top;
    }

    set top(value: number) {
        if (value === this._top) return;
        this._top = value;
        this.markProjectionDirty();
    }

    get bottom(): number {
        return this._bottom;
    }

    set bottom(value: number) {
        if (value === this._bottom) return;
        this._bottom = value;
        this.markProjectionDirty();
    }

    get near(): number {
        return this._near;
    }

    set near(value: number) {
        if (value === this._near) return;
        this._near = value;
        this.markProjectionDirty();
    }

    get far(): number {
        return this._far;
    }

    set far(value: number) {
        if (value === this._far) return;
        this._far = value;
        this.markProjectionDirty();
    }

    updateFromCanvas(width: number, height: number, zoom: number = 1): this {
        const halfWidth = (width / 2) / zoom;
        const halfHeight = (height / 2) / zoom;
        this._left = -halfWidth;
        this._right = halfWidth;
        this._top = halfHeight;
        this._bottom = -halfHeight;
        this.markProjectionDirty();
        return this;
    }

    getProjectionMatrix(): number[] {
        if (this._projectionDirty || !this._projectionMatrix) {
            this._projectionMatrix = this.computeOrthographicMatrix();
            this._projectionDirty = false;
        }
        return this._projectionMatrix;
    }

    private computeOrthographicMatrix(): number[] {
        const lr = 1 / (this._left - this._right);
        const bt = 1 / (this._bottom - this._top);
        const nf = 1 / (this._near - this._far);
        return [
            -2 * lr, 0, 0, 0,
            0, -2 * bt, 0, 0,
            0, 0, nf, 0,
            (this._left + this._right) * lr, (this._top + this._bottom) * bt, this._near * nf, 1
        ];
    }
}
