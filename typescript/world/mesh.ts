/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Geometry, computeGeometryBounds, computeGeometryVertexNormals } from "../graphics/geometry";
import { Material } from "../graphics/material";
import { SkinInstance } from "../graphics/animation";
import { Transform } from "../core/transform";
import { Bounds3, boundsFromBoxAndSphere, transformBounds } from "./bounds";
import { createBuffer } from "../utils";

type MeshBoundsSource = {
    boundsMin: readonly [number, number, number];
    boundsMax: readonly [number, number, number];
    boundsCenter: readonly [number, number, number];
    boundsRadius: number;
};

type MeshMorphRuntime = MeshBoundsSource & {
    revision: number;
    targetCount: number;
    weights: Float32Array;
    sourceRevision: number;
    positions: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
    device: GPUDevice | null;
    positionBuffer: GPUBuffer | null;
    normalBuffer: GPUBuffer | null;
    colorBuffer: GPUBuffer | null;
    dirty: boolean;
    gpuDirty: boolean;
    positionDirty: boolean;
    normalDirty: boolean;
    colorDirty: boolean;
    hasPositionTargets: boolean;
    hasNormalTargets: boolean;
    hasColorTargets: boolean;
    recomputeNormals: boolean;
};

type MeshVertexBuffers = {
    positionBuffer: GPUBuffer;
    normalBuffer: GPUBuffer;
    colorBuffer: GPUBuffer;
};

const meshMorphRuntimes = new WeakMap<Mesh, MeshMorphRuntime>();

const resolveWeights = (weights: ArrayLike<number> | null | undefined, targetCount: number): Float32Array => {
    const out = new Float32Array(targetCount);
    if (!weights) return out;
    const count = Math.min(targetCount, weights.length | 0);
    for (let i = 0; i < count; i++) out[i] = Number(weights[i] ?? 0) || 0;
    return out;
};

const updateMeshMorphCPUState = (runtime: MeshMorphRuntime, geometry: Geometry): boolean => {
    const sourceRevision = geometry.morphBaseRevision;
    const sourceChanged = runtime.sourceRevision !== sourceRevision;
    if (!runtime.dirty && !sourceChanged) return false;
    runtime.positions.set(geometry.getMorphBaseChannel("positions"));
    runtime.colors.set(geometry.getMorphBaseChannel("colors"));
    runtime.positionDirty = sourceChanged || runtime.hasPositionTargets;
    runtime.normalDirty = sourceChanged || (runtime.recomputeNormals ? runtime.hasPositionTargets : runtime.hasNormalTargets);
    runtime.colorDirty = sourceChanged || runtime.hasColorTargets;
    for (let i = 0; i < runtime.targetCount; i++) {
        const weight = runtime.weights[i] ?? 0;
        if (weight === 0) continue;
        const target = geometry.morphTargets[i];
        const pos = target?.positions;
        if (pos) for (let j = 0; j < pos.length; j++) runtime.positions[j] += pos[j] * weight;
        const colors = target?.colors;
        if (colors) for (let j = 0; j < colors.length; j++) runtime.colors[j] += colors[j] * weight;
    }
    if (runtime.recomputeNormals) runtime.normals.set(computeGeometryVertexNormals(runtime.positions, geometry.getMorphIndices()));
    else if (runtime.hasNormalTargets) {
        runtime.normals.set(geometry.getMorphBaseChannel("normals"));
        for (let i = 0; i < runtime.targetCount; i++) {
            const weight = runtime.weights[i] ?? 0;
            if (weight === 0) continue;
            const target = geometry.morphTargets[i];
            const normals = target?.normals;
            if (!normals) continue;
            for (let j = 0; j < normals.length; j++) runtime.normals[j] += normals[j] * weight;
        }
    } else runtime.normals.set(geometry.getMorphBaseChannel("normals"));
    if (runtime.hasColorTargets) for (let i = 0; i < runtime.colors.length; i++) {
        const value = runtime.colors[i] ?? 0;
        runtime.colors[i] = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    }
    const bounds = computeGeometryBounds(runtime.positions);
    runtime.boundsMin = bounds.boxMin;
    runtime.boundsMax = bounds.boxMax;
    runtime.boundsCenter = bounds.sphereCenter;
    runtime.boundsRadius = bounds.sphereRadius;
    runtime.dirty = false;
    runtime.sourceRevision = sourceRevision;
    if (sourceChanged) runtime.revision++;
    runtime.gpuDirty = runtime.positionDirty || runtime.normalDirty || runtime.colorDirty;
    return true;
};

const destroyMeshMorphBuffers = (runtime: MeshMorphRuntime): void => {
    runtime.positionBuffer?.destroy();
    runtime.normalBuffer?.destroy();
    runtime.colorBuffer?.destroy();
    runtime.positionBuffer = null;
    runtime.normalBuffer = null;
    runtime.colorBuffer = null;
    runtime.device = null;
};

export const initializeMeshMorphRuntime = (mesh: Mesh, weights: ArrayLike<number> | null | undefined): void => {
    const targetCount = mesh.geometry.morphTargets.length | 0;
    if (targetCount <= 0) return;
    const runtime: MeshMorphRuntime = {
        revision: 1,
        targetCount,
        weights: resolveWeights(weights, targetCount),
        sourceRevision: mesh.geometry.morphBaseRevision,
        positions: new Float32Array(mesh.geometry.getMorphBaseChannel("positions")),
        normals: new Float32Array(mesh.geometry.getMorphBaseChannel("normals")),
        colors: new Float32Array(mesh.geometry.getMorphBaseChannel("colors")),
        device: null,
        positionBuffer: null,
        normalBuffer: null,
        colorBuffer: null,
        dirty: true,
        gpuDirty: true,
        positionDirty: true,
        normalDirty: true,
        colorDirty: true,
        hasPositionTargets: mesh.geometry.morphTargets.some((target) => !!target.positions),
        hasNormalTargets: mesh.geometry.morphTargets.some((target) => !!target.normals),
        hasColorTargets: mesh.geometry.morphTargets.some((target) => !!target.colors),
        recomputeNormals: !mesh.geometry.authoredNormals && mesh.geometry.morphTargets.some((target) => !!target.positions),
        boundsMin: mesh.geometry.boundsMin,
        boundsMax: mesh.geometry.boundsMax,
        boundsCenter: mesh.geometry.boundsCenter,
        boundsRadius: mesh.geometry.boundsRadius
    };
    meshMorphRuntimes.set(mesh, runtime);
};

export const copyMeshMorphRuntime = (source: Mesh, target: Mesh): void => {
    const runtime = meshMorphRuntimes.get(source);
    if (!runtime) return;
    initializeMeshMorphRuntime(target, runtime.weights);
};

export const destroyMeshMorphRuntime = (mesh: Mesh): void => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) return;
    destroyMeshMorphBuffers(runtime);
    meshMorphRuntimes.delete(mesh);
};

export const hasMeshMorphRuntime = (mesh: Mesh): boolean => {
    return meshMorphRuntimes.has(mesh);
};

export const setMeshMorphWeights = (mesh: Mesh, weights: ArrayLike<number>): void => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) return;
    const next = resolveWeights(weights, runtime.targetCount);
    let changed = false;
    for (let i = 0; i < runtime.targetCount; i++) if (runtime.weights[i] !== next[i]) { changed = true; break; }
    if (!changed) return;
    runtime.weights.set(next);
    runtime.dirty = true;
    runtime.revision++;
};

export const setMeshMorphWeight = (mesh: Mesh, index: number, weight: number): void => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) return;
    const slot = index | 0;
    if (slot < 0 || slot >= runtime.targetCount) return;
    const next = Number(weight) || 0;
    if (runtime.weights[slot] === next) return;
    runtime.weights[slot] = next;
    runtime.dirty = true;
    runtime.revision++;
};

export const getMeshMorphRevision = (mesh: Mesh): number => meshMorphRuntimes.get(mesh)?.revision ?? 0;

export const getMeshMorphWeights = (mesh: Mesh): Float32Array | null => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) return null;
    return new Float32Array(runtime.weights);
};

export const getMeshLocalBoundsSource = (mesh: Mesh): MeshBoundsSource => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) return mesh.geometry;
    updateMeshMorphCPUState(runtime, mesh.geometry);
    return runtime;
};

export const getMeshVertexSource = (mesh: Mesh): object => {
    return meshMorphRuntimes.has(mesh) ? mesh : mesh.geometry;
};

export const getMeshVertexBuffers = (mesh: Mesh, device: GPUDevice, queue: GPUQueue): MeshVertexBuffers => {
    const runtime = meshMorphRuntimes.get(mesh);
    if (!runtime) {
        mesh.geometry.upload(device);
        return { positionBuffer: mesh.geometry.positionBuffer, normalBuffer: mesh.geometry.normalBuffer, colorBuffer: mesh.geometry.colorBuffer };
    }
    const updated = updateMeshMorphCPUState(runtime, mesh.geometry);
    if (runtime.device !== device || !runtime.positionBuffer || !runtime.normalBuffer || !runtime.colorBuffer) {
        destroyMeshMorphBuffers(runtime);
        runtime.positionBuffer = createBuffer(device, runtime.positions, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
        runtime.normalBuffer = createBuffer(device, runtime.normals, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
        runtime.colorBuffer = createBuffer(device, runtime.colors, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
        runtime.device = device;
        runtime.positionDirty = false;
        runtime.normalDirty = false;
        runtime.colorDirty = false;
        runtime.gpuDirty = false;
    } else if (updated || runtime.gpuDirty) {
        if (runtime.positionDirty) queue.writeBuffer(runtime.positionBuffer, 0, runtime.positions.buffer, runtime.positions.byteOffset, runtime.positions.byteLength);
        if (runtime.normalDirty) queue.writeBuffer(runtime.normalBuffer, 0, runtime.normals.buffer, runtime.normals.byteOffset, runtime.normals.byteLength);
        if (runtime.colorDirty) queue.writeBuffer(runtime.colorBuffer, 0, runtime.colors.buffer, runtime.colors.byteOffset, runtime.colors.byteLength);
        runtime.positionDirty = false;
        runtime.normalDirty = false;
        runtime.colorDirty = false;
        runtime.gpuDirty = false;
    }
    return { positionBuffer: runtime.positionBuffer, normalBuffer: runtime.normalBuffer, colorBuffer: runtime.colorBuffer };
};

export class Mesh {
    readonly geometry: Geometry;
    readonly transform: Transform;
    private _material: Material;
    private _visible: boolean = true;
    private _castShadow: boolean = true;
    private _receiveShadow: boolean = true;
    private _destroyed: boolean = false;
    name: string = "";
    userData: Record<string, unknown> = {};
    skin: SkinInstance | null = null;

    constructor(geometry: Geometry, material: Material) {
        this.geometry = geometry;
        this._material = material;
        this.transform = new Transform();
    }

    get material(): Material {
        return this._material;
    }

    get destroyed(): boolean {
        return this._destroyed;
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = value;
    }

    get castShadow(): boolean {
        return this._castShadow;
    }

    set castShadow(value: boolean) {
        this._castShadow = value;
    }

    get receiveShadow(): boolean {
        return this._receiveShadow;
    }

    set receiveShadow(value: boolean) {
        this._receiveShadow = value;
    }

    private assertAlive(action: string): void {
        if (this._destroyed) throw new Error(`Mesh: cannot ${action}; mesh has already been destroyed.`);
    }

    setMaterial(material: Material): this {
        this.assertAlive("set material");
        if (material === this._material) return this;
        const previous = this._material;
        this._material = material;
        previous.release();
        return this;
    }

    setParent(parent: Mesh | null): this {
        this.assertAlive("set parent");
        this.transform.setParent(parent?.transform ?? null);
        return this;
    }

    addChild(child: Mesh): this {
        this.assertAlive("add child");
        this.transform.addChild(child.transform);
        return this;
    }

    removeChild(child: Mesh): this {
        this.assertAlive("remove child");
        this.transform.removeChild(child.transform);
        return this;
    }

    get worldMatrix(): number[] {
        this.assertAlive("access world matrix");
        return this.transform.worldMatrix;
    }

    getLocalBounds(): Bounds3 {
        const bounds = this.getLocalBoundsSource();
        return boundsFromBoxAndSphere(bounds.boundsMin, bounds.boundsMax, bounds.boundsCenter, bounds.boundsRadius);
    }

    getWorldBounds(): Bounds3 {
        return transformBounds(this.getLocalBounds(), this.transform.worldMatrix);
    }

    getBounds(): Bounds3 {
        return this.getWorldBounds();
    }

    destroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        detachMeshFromSceneOwners(this);
        destroyMeshMorphRuntime(this);
        this.skin?.dispose();
        this.skin = null;
        this.transform.dispose();
        this.geometry.release();
        this._material.release();
    }

    clone(): Mesh {
        this.assertAlive("clone");
        this.geometry.retain();
        this.material.retain();
        const mesh = new Mesh(this.geometry, this.material);
        mesh.transform.copyFrom(this.transform);
        mesh.name = this.name;
        mesh.visible = this.visible;
        mesh.castShadow = this.castShadow;
        mesh.receiveShadow = this.receiveShadow;
        copyMeshMorphRuntime(this, mesh);
        return mesh;
    }

    cloneWithMaterial(material: Material): Mesh {
        this.assertAlive("clone with material");
        this.geometry.retain();
        const mesh = new Mesh(this.geometry, material);
        mesh.transform.copyFrom(this.transform);
        mesh.name = this.name;
        mesh.visible = this.visible;
        mesh.castShadow = this.castShadow;
        mesh.receiveShadow = this.receiveShadow;
        copyMeshMorphRuntime(this, mesh);
        return mesh;
    }

    private getLocalBoundsSource(): MeshBoundsSource {
        return getMeshLocalBoundsSource(this);
    }
}

type MeshSceneOwner = {
    remove(mesh: object): void;
};

const meshSceneOwners = new WeakMap<object, Set<MeshSceneOwner>>();

export const registerMeshSceneOwner = (mesh: object, owner: MeshSceneOwner): void => {
    let owners = meshSceneOwners.get(mesh);
    if (!owners) {
        owners = new Set<MeshSceneOwner>();
        meshSceneOwners.set(mesh, owners);
    }
    owners.add(owner);
};

export const unregisterMeshSceneOwner = (mesh: object, owner: MeshSceneOwner): void => {
    const owners = meshSceneOwners.get(mesh);
    if (!owners) return;
    owners.delete(owner);
    if (owners.size === 0) meshSceneOwners.delete(mesh);
};

export const detachMeshFromSceneOwners = (mesh: object): void => {
    const owners = meshSceneOwners.get(mesh);
    if (!owners) return;
    for (const owner of [...owners]) owner.remove(mesh);
};
