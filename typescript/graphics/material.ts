/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, clamp01, createBuffer, isGPUBuffer, resolveGPUBuffer } from "../utils";
import { Texture2D } from "./texture";
import { Colormap, type BuiltinColormapName } from "./colormap";
import unlitWGSL from "../../wgsl/graphics/unlit.wgsl";
import unlitInstancedWGSL from "../../wgsl/graphics/unlit-instanced.wgsl";
import unlitSkinnedWGSL from "../../wgsl/graphics/unlit-skinned.wgsl";
import unlitSkinned8WGSL from "../../wgsl/graphics/unlit-skinned8.wgsl";
import standardWGSL from "../../wgsl/graphics/standard.wgsl";
import standardDefaultsWGSL from "../../wgsl/graphics/standard-defaults.wgsl";
import standardInstancedWGSL from "../../wgsl/graphics/standard-instanced.wgsl";
import standardSkinnedWGSL from "../../wgsl/graphics/standard-skinned.wgsl";
import standardSkinned8WGSL from "../../wgsl/graphics/standard-skinned8.wgsl";
import standardTransmissionWGSL from "../../wgsl/graphics/standard-transmission.wgsl";
import standardTransmissionInstancedWGSL from "../../wgsl/graphics/standard-transmission-instanced.wgsl";
import standardTransmissionSkinnedWGSL from "../../wgsl/graphics/standard-transmission-skinned.wgsl";
import standardTransmissionSkinned8WGSL from "../../wgsl/graphics/standard-transmission-skinned8.wgsl";
import dataWGSL from "../../wgsl/graphics/data.wgsl";
import customDefaultVertexWGSL from "../../wgsl/graphics/custom-default-vertex.wgsl";
import shadowReceiverWGSL from "../../wgsl/effects/shadow-receiver.wgsl";
import { SCALE_UNIFORM_FLOAT_COUNT, cloneScaleTransform, normalizeScaleTransform, packScaleTransform } from "../scaling";
import type { ScaleSourceDescriptor, ScaleTransform, ScaleTransformDescriptor } from "../scaling";
import { normalizeBindGroupLayout, normalizeBindingResource, validateResourcesForLayout } from "../wgsl/interop";
import type { BufferResource, BindGroupLayoutDescriptor, BindGroupResources, BindingResource } from "../wgsl/interop";

export type Color = [number, number, number];
export type Color4 = [number, number, number, number];

export type TextureCoordinateSet = 0 | 1;

export type TextureTransformDescriptor = {
    offset?: [number, number];
    rotation?: number;
    scale?: [number, number];
    texCoord?: TextureCoordinateSet;
};

export type TextureTransform = Readonly<{
    offset: [number, number];
    rotation: number;
    scale: [number, number];
    texCoord: TextureCoordinateSet;
}>;

const normalizeTextureTransform = (descriptor?: TextureTransformDescriptor | null): TextureTransform => {
    const texCoord = descriptor?.texCoord === 1 ? 1 : 0;
    return {
        offset: [descriptor?.offset?.[0] ?? 0, descriptor?.offset?.[1] ?? 0],
        rotation: descriptor?.rotation ?? 0,
        scale: [descriptor?.scale?.[0] ?? 1, descriptor?.scale?.[1] ?? 1],
        texCoord
    };
};

const cloneTextureTransform = (transform: TextureTransform): TextureTransform => {
    return {
        offset: [transform.offset[0], transform.offset[1]],
        rotation: transform.rotation,
        scale: [transform.scale[0], transform.scale[1]],
        texCoord: transform.texCoord
    };
};

const DEFAULT_TEXTURE_TRANSFORM = normalizeTextureTransform(null);

const packTextureTransform = (f: Float32Array, offset: number, transform: TextureTransform): void => {
    const cos = Math.cos(transform.rotation);
    const sin = Math.sin(transform.rotation);
    f[offset + 0] = transform.offset[0];
    f[offset + 1] = transform.offset[1];
    f[offset + 2] = cos;
    f[offset + 3] = sin;
    f[offset + 4] = transform.scale[0];
    f[offset + 5] = transform.scale[1];
    f[offset + 6] = transform.texCoord;
    f[offset + 7] = 0;
};

export enum BlendMode {
    Opaque = "opaque",
    Transparent = "transparent",
    Additive = "additive"
}

export enum CullMode {
    None = "none",
    Back = "back",
    Front = "front"
}

export type MaterialDescriptor = {
    label?: string;
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
};

export abstract class Material {
    readonly label?: string;
    readonly blendMode: BlendMode;
    readonly cullMode: CullMode;
    readonly depthWrite: boolean;
    readonly depthTest: boolean;
    pipeline: GPURenderPipeline | null = null;
    bindGroup: GPUBindGroup | null = null;
    bindGroupKey: string | null = null;
    uniformBuffer: GPUBuffer | null = null;
    protected _uniformDataCache: Float32Array | null = null;
    protected _dirty: boolean = true;
    private _refCount: number = 1;
    private _destroyed: boolean = false;

    constructor(descriptor: MaterialDescriptor = {}) {
        this.label = descriptor.label;
        this.blendMode = descriptor.blendMode ?? BlendMode.Opaque;
        this.cullMode = descriptor.cullMode ?? CullMode.Back;
        this.depthWrite = descriptor.depthWrite ?? true;
        this.depthTest = descriptor.depthTest ?? true;
    }

    get dirty(): boolean {
        return this._dirty;
    }

    protected assertAlive(action: string): void {
        if (this._destroyed) throw new Error(`Material: cannot ${action}; resource has already been released.`);
    }

    retain(): this {
        this.assertAlive("retain");
        this._refCount++;
        return this;
    }

    release(): void {
        if (this._destroyed) throw new Error("Material: release() called after the resource was already released.");
        if (this._refCount <= 0) throw new Error("Material: reference count underflow.");
        this._refCount--;
        if (this._refCount > 0) return;
        this._destroyed = true;
        this.disposeResources();
    }

    markClean(): void {
        this.assertAlive("markClean");
        this._dirty = false;
    }

    protected getUniformDataCache(floatCount: number): Float32Array {
        this.assertAlive("build uniform data");
        if (!this._uniformDataCache || this._uniformDataCache.length !== floatCount) this._uniformDataCache = new Float32Array(floatCount);
        return this._uniformDataCache;
    }

    abstract getUniformData(): Float32Array;
    abstract getShaderCode(opts?: { instanced?: boolean; skinned?: boolean; skinned8?: boolean; shadows?: boolean; shadowGroup?: number }): string;
    abstract getUniformBufferSize(): number;
    abstract createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout;

    destroy(): void {
        this.release();
    }

    protected disposeResources(): void {
        this.uniformBuffer?.destroy();
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.bindGroupKey = null;
        this.pipeline = null;
        this._uniformDataCache = null;
        this._dirty = true;
    }
}

export type UnlitMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
    baseColorTexture?: Texture2D | null;
    baseColorTextureTransform?: TextureTransformDescriptor | null;
    alphaCutoff?: number;
};

export class UnlitMaterial extends Material {
    private _color: Color;
    private _opacity: number;
    private _baseColorTexture: Texture2D | null;
    private _baseColorTextureTransform: TextureTransform;
    private _alphaCutoff: number;
    private static _cachedBindGroupLayout: GPUBindGroupLayout | null = null;
    private static _cachedLayoutDevice: GPUDevice | null = null;

    constructor(descriptor: UnlitMaterialDescriptor = {}) {
        super({
            ...descriptor,
            blendMode: descriptor.blendMode ?? ((descriptor.opacity ?? 1) < 1 ? BlendMode.Transparent : BlendMode.Opaque)
        });
        this._color = descriptor.color ?? [1, 1, 1];
        this._opacity = descriptor.opacity ?? 1;
        this._baseColorTexture = descriptor.baseColorTexture ?? null;
        this._baseColorTextureTransform = normalizeTextureTransform(descriptor.baseColorTextureTransform);
        this._alphaCutoff = descriptor.alphaCutoff ?? 0;
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color = value;
        this._dirty = true;
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(value: number) {
        this._opacity = value;
        this._dirty = true;
    }

    get baseColorTexture(): Texture2D | null {
        return this._baseColorTexture;
    }

    set baseColorTexture(value: Texture2D | null) {
        this._baseColorTexture = value;
        this._dirty = true;
    }

    get baseColorTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._baseColorTextureTransform);
    }

    set baseColorTextureTransform(value: TextureTransformDescriptor | null) {
        this._baseColorTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
    }

    get alphaCutoff(): number {
        return this._alphaCutoff;
    }

    set alphaCutoff(value: number) {
        this._alphaCutoff = value;
        this._dirty = true;
    }

    getUniformBufferSize(): number {
        return 64;
    }

    getUniformData(): Float32Array {
        const f = this.getUniformDataCache(16);
        f[0] = this._color[0];
        f[1] = this._color[1];
        f[2] = this._color[2];
        f[3] = this._opacity;
        f[4] = this._alphaCutoff;
        f[5] = 0;
        f[6] = 0;
        f[7] = 0;
        packTextureTransform(f, 8, this._baseColorTextureTransform);
        return f;
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (UnlitMaterial._cachedBindGroupLayout && UnlitMaterial._cachedLayoutDevice === device) return UnlitMaterial._cachedBindGroupLayout;
        const layout = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
            ]
        });
        UnlitMaterial._cachedBindGroupLayout = layout;
        UnlitMaterial._cachedLayoutDevice = device;
        return layout;
    }

    getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string {
        if (opts.instanced) return unlitInstancedWGSL;
        if (opts.skinned8) return unlitSkinned8WGSL;
        if (opts.skinned) return unlitSkinnedWGSL;
        return unlitWGSL;
    }
}

export type StandardMaterialClearcoatExtensionDescriptor = {
    factor?: number;
    texture?: Texture2D | null;
    textureTransform?: TextureTransformDescriptor | null;
    roughness?: number;
    roughnessTexture?: Texture2D | null;
    roughnessTextureTransform?: TextureTransformDescriptor | null;
    normalTexture?: Texture2D | null;
    normalTextureTransform?: TextureTransformDescriptor | null;
    normalScale?: number;
};

export type StandardMaterialTransmissionExtensionDescriptor = {
    factor?: number;
    texture?: Texture2D | null;
    textureTransform?: TextureTransformDescriptor | null;
};

export type StandardMaterialVolumeExtensionDescriptor = {
    thicknessFactor?: number;
    thicknessTexture?: Texture2D | null;
    thicknessTextureTransform?: TextureTransformDescriptor | null;
    attenuationDistance?: number;
    attenuationColor?: Color;
};

export type StandardMaterialDiffuseTransmissionExtensionDescriptor = {
    factor?: number;
    texture?: Texture2D | null;
    textureTransform?: TextureTransformDescriptor | null;
    color?: Color;
    colorTexture?: Texture2D | null;
    colorTextureTransform?: TextureTransformDescriptor | null;
};

export type StandardMaterialDispersionExtensionDescriptor = {
    dispersion?: number;
};

export type StandardMaterialSpecularExtensionDescriptor = {
    factor?: number;
    texture?: Texture2D | null;
    textureTransform?: TextureTransformDescriptor | null;
    color?: Color;
    colorTexture?: Texture2D | null;
    colorTextureTransform?: TextureTransformDescriptor | null;
};

export type StandardMaterialSheenExtensionDescriptor = {
    color?: Color;
    colorTexture?: Texture2D | null;
    colorTextureTransform?: TextureTransformDescriptor | null;
    roughness?: number;
    roughnessTexture?: Texture2D | null;
    roughnessTextureTransform?: TextureTransformDescriptor | null;
};

export type StandardMaterialIridescenceExtensionDescriptor = {
    factor?: number;
    texture?: Texture2D | null;
    textureTransform?: TextureTransformDescriptor | null;
    ior?: number;
    thicknessMinimum?: number;
    thicknessMaximum?: number;
    thicknessTexture?: Texture2D | null;
    thicknessTextureTransform?: TextureTransformDescriptor | null;
};

export type StandardMaterialAnisotropyExtensionDescriptor = {
    strength?: number;
    rotation?: number;
    texture?: Texture2D | null;
    textureTransform?: TextureTransformDescriptor | null;
};

export type StandardMaterialIorExtensionDescriptor = {
    ior?: number;
};

export type StandardMaterialEmissiveStrengthExtensionDescriptor = {
    strength?: number;
};

export type StandardMaterialExtensionsDescriptor = {
    clearcoat?: StandardMaterialClearcoatExtensionDescriptor | null;
    transmission?: StandardMaterialTransmissionExtensionDescriptor | null;
    volume?: StandardMaterialVolumeExtensionDescriptor | null;
    specular?: StandardMaterialSpecularExtensionDescriptor | null;
    sheen?: StandardMaterialSheenExtensionDescriptor | null;
    iridescence?: StandardMaterialIridescenceExtensionDescriptor | null;
    anisotropy?: StandardMaterialAnisotropyExtensionDescriptor | null;
    diffuseTransmission?: StandardMaterialDiffuseTransmissionExtensionDescriptor | null;
    dispersion?: StandardMaterialDispersionExtensionDescriptor | null;
    ior?: StandardMaterialIorExtensionDescriptor | null;
    emissiveStrength?: StandardMaterialEmissiveStrengthExtensionDescriptor | null;
};

export type StandardMaterialClearcoatExtension = Readonly<{
    factor: number;
    texture: Texture2D | null;
    textureTransform: TextureTransform;
    roughness: number;
    roughnessTexture: Texture2D | null;
    roughnessTextureTransform: TextureTransform;
    normalTexture: Texture2D | null;
    normalTextureTransform: TextureTransform;
    normalScale: number;
}>;

export type StandardMaterialTransmissionExtension = Readonly<{
    factor: number;
    texture: Texture2D | null;
    textureTransform: TextureTransform;
}>;

export type StandardMaterialVolumeExtension = Readonly<{
    thicknessFactor: number;
    thicknessTexture: Texture2D | null;
    thicknessTextureTransform: TextureTransform;
    attenuationDistance: number;
    attenuationColor: Color;
}>;

export type StandardMaterialDiffuseTransmissionExtension = Readonly<{
    factor: number;
    texture: Texture2D | null;
    textureTransform: TextureTransform;
    color: Color;
    colorTexture: Texture2D | null;
    colorTextureTransform: TextureTransform;
}>;

export type StandardMaterialDispersionExtension = Readonly<{
    dispersion: number;
}>;

export type StandardMaterialSpecularExtension = Readonly<{
    factor: number;
    texture: Texture2D | null;
    textureTransform: TextureTransform;
    color: Color;
    colorTexture: Texture2D | null;
    colorTextureTransform: TextureTransform;
}>;

export type StandardMaterialSheenExtension = Readonly<{
    color: Color;
    colorTexture: Texture2D | null;
    colorTextureTransform: TextureTransform;
    roughness: number;
    roughnessTexture: Texture2D | null;
    roughnessTextureTransform: TextureTransform;
}>;

export type StandardMaterialIridescenceExtension = Readonly<{
    factor: number;
    texture: Texture2D | null;
    textureTransform: TextureTransform;
    ior: number;
    thicknessMinimum: number;
    thicknessMaximum: number;
    thicknessTexture: Texture2D | null;
    thicknessTextureTransform: TextureTransform;
}>;

export type StandardMaterialAnisotropyExtension = Readonly<{
    strength: number;
    rotation: number;
    texture: Texture2D | null;
    textureTransform: TextureTransform;
}>;

export type StandardMaterialIorExtension = Readonly<{
    ior: number;
}>;

export type StandardMaterialEmissiveStrengthExtension = Readonly<{
    strength: number;
}>;

export type StandardMaterialExtensions = Readonly<{
    clearcoat: StandardMaterialClearcoatExtension | null;
    transmission: StandardMaterialTransmissionExtension | null;
    volume: StandardMaterialVolumeExtension | null;
    specular: StandardMaterialSpecularExtension | null;
    sheen: StandardMaterialSheenExtension | null;
    iridescence: StandardMaterialIridescenceExtension | null;
    anisotropy: StandardMaterialAnisotropyExtension | null;
    diffuseTransmission: StandardMaterialDiffuseTransmissionExtension | null;
    dispersion: StandardMaterialDispersionExtension | null;
    ior: StandardMaterialIorExtension | null;
    emissiveStrength: StandardMaterialEmissiveStrengthExtension | null;
}>;

export type StandardMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
    metallic?: number;
    roughness?: number;
    emissive?: Color;
    emissiveIntensity?: number;
    baseColorTexture?: Texture2D | null;
    metallicRoughnessTexture?: Texture2D | null;
    normalTexture?: Texture2D | null;
    occlusionTexture?: Texture2D | null;
    emissiveTexture?: Texture2D | null;
    baseColorTextureTransform?: TextureTransformDescriptor | null;
    metallicRoughnessTextureTransform?: TextureTransformDescriptor | null;
    normalTextureTransform?: TextureTransformDescriptor | null;
    occlusionTextureTransform?: TextureTransformDescriptor | null;
    emissiveTextureTransform?: TextureTransformDescriptor | null;
    normalScale?: number;
    occlusionStrength?: number;
    alphaCutoff?: number;
    extensions?: StandardMaterialExtensionsDescriptor;
};

export const enum StandardMaterialFeatureFlag {
    BaseColorTexture = 1 << 0,
    MetallicRoughnessTexture = 1 << 1,
    NormalTexture = 1 << 2,
    OcclusionTexture = 1 << 3,
    EmissiveTexture = 1 << 4,
    ClearcoatTexture = 1 << 6,
    ClearcoatRoughnessTexture = 1 << 7,
    ClearcoatNormalTexture = 1 << 8,
    Transmission = 1 << 9,
    TransmissionTexture = 1 << 10,
    ThicknessTexture = 1 << 12,
    SpecularTexture = 1 << 14,
    SpecularColorTexture = 1 << 15,
    SheenColorTexture = 1 << 17,
    SheenRoughnessTexture = 1 << 18,
    IridescenceTexture = 1 << 20,
    IridescenceThicknessTexture = 1 << 21,
    AnisotropyTexture = 1 << 23,
    DiffuseTransmission = 1 << 26,
    DiffuseTransmissionTexture = 1 << 27,
    DiffuseTransmissionColorTexture = 1 << 28
}

const cloneColor = (value: Color | undefined, fallback: Color): Color => {
    return [value?.[0] ?? fallback[0], value?.[1] ?? fallback[1], value?.[2] ?? fallback[2]];
};

const normalizeStandardMaterialExtensions = (descriptor?: StandardMaterialExtensionsDescriptor): StandardMaterialExtensions => {
    return {
        clearcoat: descriptor?.clearcoat ? {
            factor: descriptor.clearcoat.factor ?? 0,
            texture: descriptor.clearcoat.texture ?? null,
            textureTransform: normalizeTextureTransform(descriptor.clearcoat.textureTransform),
            roughness: descriptor.clearcoat.roughness ?? 0,
            roughnessTexture: descriptor.clearcoat.roughnessTexture ?? null,
            roughnessTextureTransform: normalizeTextureTransform(descriptor.clearcoat.roughnessTextureTransform),
            normalTexture: descriptor.clearcoat.normalTexture ?? null,
            normalTextureTransform: normalizeTextureTransform(descriptor.clearcoat.normalTextureTransform),
            normalScale: descriptor.clearcoat.normalScale ?? 1
        } : null,
        transmission: descriptor?.transmission ? {
            factor: descriptor.transmission.factor ?? 0,
            texture: descriptor.transmission.texture ?? null,
            textureTransform: normalizeTextureTransform(descriptor.transmission.textureTransform)
        } : null,
        volume: descriptor?.volume ? {
            thicknessFactor: descriptor.volume.thicknessFactor ?? 0,
            thicknessTexture: descriptor.volume.thicknessTexture ?? null,
            thicknessTextureTransform: normalizeTextureTransform(descriptor.volume.thicknessTextureTransform),
            attenuationDistance: descriptor.volume.attenuationDistance ?? Infinity,
            attenuationColor: cloneColor(descriptor.volume.attenuationColor, [1, 1, 1])
        } : null,
        specular: descriptor?.specular ? {
            factor: descriptor.specular.factor ?? 1,
            texture: descriptor.specular.texture ?? null,
            textureTransform: normalizeTextureTransform(descriptor.specular.textureTransform),
            color: cloneColor(descriptor.specular.color, [1, 1, 1]),
            colorTexture: descriptor.specular.colorTexture ?? null,
            colorTextureTransform: normalizeTextureTransform(descriptor.specular.colorTextureTransform)
        } : null,
        sheen: descriptor?.sheen ? {
            color: cloneColor(descriptor.sheen.color, [0, 0, 0]),
            colorTexture: descriptor.sheen.colorTexture ?? null,
            colorTextureTransform: normalizeTextureTransform(descriptor.sheen.colorTextureTransform),
            roughness: descriptor.sheen.roughness ?? 0,
            roughnessTexture: descriptor.sheen.roughnessTexture ?? null,
            roughnessTextureTransform: normalizeTextureTransform(descriptor.sheen.roughnessTextureTransform)
        } : null,
        iridescence: descriptor?.iridescence ? {
            factor: descriptor.iridescence.factor ?? 0,
            texture: descriptor.iridescence.texture ?? null,
            textureTransform: normalizeTextureTransform(descriptor.iridescence.textureTransform),
            ior: descriptor.iridescence.ior ?? 1.3,
            thicknessMinimum: descriptor.iridescence.thicknessMinimum ?? 100,
            thicknessMaximum: descriptor.iridescence.thicknessMaximum ?? 400,
            thicknessTexture: descriptor.iridescence.thicknessTexture ?? null,
            thicknessTextureTransform: normalizeTextureTransform(descriptor.iridescence.thicknessTextureTransform)
        } : null,
        anisotropy: descriptor?.anisotropy ? {
            strength: descriptor.anisotropy.strength ?? 0,
            rotation: descriptor.anisotropy.rotation ?? 0,
            texture: descriptor.anisotropy.texture ?? null,
            textureTransform: normalizeTextureTransform(descriptor.anisotropy.textureTransform)
        } : null,
        diffuseTransmission: descriptor?.diffuseTransmission ? {
            factor: descriptor.diffuseTransmission.factor ?? 0,
            texture: descriptor.diffuseTransmission.texture ?? null,
            textureTransform: normalizeTextureTransform(descriptor.diffuseTransmission.textureTransform),
            color: cloneColor(descriptor.diffuseTransmission.color, [1, 1, 1]),
            colorTexture: descriptor.diffuseTransmission.colorTexture ?? null,
            colorTextureTransform: normalizeTextureTransform(descriptor.diffuseTransmission.colorTextureTransform)
        } : null,
        dispersion: descriptor?.dispersion ? {
            dispersion: descriptor.dispersion.dispersion ?? 0
        } : null,
        ior: descriptor?.ior ? {
            ior: descriptor.ior.ior ?? 1.5
        } : null,
        emissiveStrength: descriptor?.emissiveStrength ? {
            strength: descriptor.emissiveStrength.strength ?? 1
        } : null
    };
};

const cloneStandardMaterialExtensions = (extensions: StandardMaterialExtensions): StandardMaterialExtensions => normalizeStandardMaterialExtensions(extensions);

export const WEBGPU_BASELINE_MAX_SAMPLED_TEXTURES_PER_SHADER_STAGE = 16, WEBGPU_BASELINE_MAX_SAMPLERS_PER_SHADER_STAGE = 16;

export type StandardMaterialTextureSlot = "baseColor" | "metallicRoughness" | "normal" | "occlusion" | "emissive" | "clearcoat" | "clearcoatRoughness" | "clearcoatNormal" | "specular" | "specularColor" | "sheenColor" | "sheenRoughness" | "iridescence" | "iridescenceThickness" | "anisotropy" | "transmission" | "volumeThickness" | "diffuseTransmission" | "diffuseTransmissionColor" | "transmissionSource";

export type StandardMaterialLayoutBinding = Readonly<{
    slot: StandardMaterialTextureSlot;
    samplerBinding: number;
    textureBinding: number;
    colorSpace: "srgb" | "linear";
}>;

export type StandardMaterialLayoutPlan = Readonly<{
    featureKey: string;
    bindings: readonly StandardMaterialLayoutBinding[];
    sampledTextureCount: number;
    samplerCount: number;
    usesTransmission: boolean;
}>;

type StandardMaterialTextureSlotDefinition = {
    slot: StandardMaterialTextureSlot;
    feature: StandardMaterialFeatureFlag | null;
    shaderName: string;
    colorSpace: "srgb" | "linear";
};

const STANDARD_MATERIAL_TEXTURE_SLOTS: readonly StandardMaterialTextureSlotDefinition[] = [
    { slot: "baseColor", feature: StandardMaterialFeatureFlag.BaseColorTexture, shaderName: "base_color", colorSpace: "srgb" },
    { slot: "metallicRoughness", feature: StandardMaterialFeatureFlag.MetallicRoughnessTexture, shaderName: "metallic_roughness", colorSpace: "linear" },
    { slot: "normal", feature: StandardMaterialFeatureFlag.NormalTexture, shaderName: "normal", colorSpace: "linear" },
    { slot: "occlusion", feature: StandardMaterialFeatureFlag.OcclusionTexture, shaderName: "occlusion", colorSpace: "linear" },
    { slot: "emissive", feature: StandardMaterialFeatureFlag.EmissiveTexture, shaderName: "emissive", colorSpace: "srgb" },
    { slot: "clearcoat", feature: StandardMaterialFeatureFlag.ClearcoatTexture, shaderName: "clearcoat", colorSpace: "linear" },
    { slot: "clearcoatRoughness", feature: StandardMaterialFeatureFlag.ClearcoatRoughnessTexture, shaderName: "clearcoat_roughness", colorSpace: "linear" },
    { slot: "clearcoatNormal", feature: StandardMaterialFeatureFlag.ClearcoatNormalTexture, shaderName: "clearcoat_normal", colorSpace: "linear" },
    { slot: "specular", feature: StandardMaterialFeatureFlag.SpecularTexture, shaderName: "specular", colorSpace: "linear" },
    { slot: "specularColor", feature: StandardMaterialFeatureFlag.SpecularColorTexture, shaderName: "specular_color", colorSpace: "srgb" },
    { slot: "sheenColor", feature: StandardMaterialFeatureFlag.SheenColorTexture, shaderName: "sheen_color", colorSpace: "srgb" },
    { slot: "sheenRoughness", feature: StandardMaterialFeatureFlag.SheenRoughnessTexture, shaderName: "sheen_roughness", colorSpace: "linear" },
    { slot: "iridescence", feature: StandardMaterialFeatureFlag.IridescenceTexture, shaderName: "iridescence", colorSpace: "linear" },
    { slot: "iridescenceThickness", feature: StandardMaterialFeatureFlag.IridescenceThicknessTexture, shaderName: "iridescence_thickness", colorSpace: "linear" },
    { slot: "anisotropy", feature: StandardMaterialFeatureFlag.AnisotropyTexture, shaderName: "anisotropy", colorSpace: "linear" },
    { slot: "transmission", feature: StandardMaterialFeatureFlag.TransmissionTexture, shaderName: "transmission", colorSpace: "linear" },
    { slot: "volumeThickness", feature: StandardMaterialFeatureFlag.ThicknessTexture, shaderName: "volume_thickness", colorSpace: "linear" },
    { slot: "diffuseTransmission", feature: StandardMaterialFeatureFlag.DiffuseTransmissionTexture, shaderName: "diffuse_transmission", colorSpace: "linear" },
    { slot: "diffuseTransmissionColor", feature: StandardMaterialFeatureFlag.DiffuseTransmissionColorTexture, shaderName: "diffuse_transmission_color", colorSpace: "srgb" },
    { slot: "transmissionSource", feature: null, shaderName: "transmission_source", colorSpace: "linear" },
];

const STANDARD_MATERIAL_TEXTURE_SLOT_BY_SHADER_NAME = new Map(STANDARD_MATERIAL_TEXTURE_SLOTS.map((definition) => [definition.shaderName, definition]));

const STANDARD_MATERIAL_TEXTURE_SLOT_BY_NAME = new Map(STANDARD_MATERIAL_TEXTURE_SLOTS.map((definition) => [definition.slot, definition]));

export const getStandardMaterialTextureColorSpace = (slot: StandardMaterialTextureSlot): "srgb" | "linear" => {
    const definition = STANDARD_MATERIAL_TEXTURE_SLOT_BY_NAME.get(slot);
    if (!definition) throw new Error(`StandardMaterial: unknown texture slot '${slot}'.`);
    return definition.colorSpace;
};

export const planStandardMaterialLayout = (featureMask: number): StandardMaterialLayoutPlan => {
    const mask = featureMask >>> 0;
    const usesTransmission = (mask & (StandardMaterialFeatureFlag.Transmission | StandardMaterialFeatureFlag.DiffuseTransmission)) !== 0;
    const bindings: StandardMaterialLayoutBinding[] = [];
    for (let index = 0; index < STANDARD_MATERIAL_TEXTURE_SLOTS.length; index++) {
        const definition = STANDARD_MATERIAL_TEXTURE_SLOTS[index]!;
        const active = definition.feature === null ? usesTransmission : (mask & definition.feature) !== 0;
        if (!active) continue;
        const binding: StandardMaterialLayoutBinding = Object.freeze({ slot: definition.slot, samplerBinding: 1 + (index * 2), textureBinding: 2 + (index * 2), colorSpace: definition.colorSpace });
        bindings.push(binding);
    }
    const featureKey = `${usesTransmission ? "transmission" : "standard"}:${bindings.map((binding) => binding.slot).join(",")}`;
    return Object.freeze({ featureKey, bindings: Object.freeze(bindings), sampledTextureCount: bindings.length, samplerCount: bindings.length, usesTransmission });
};

const STANDARD_SHADER_SAMPLE_DEFAULTS = new Map<string, string>();
for (const match of standardDefaultsWGSL.matchAll(/const\s+(standard_default_([A-Za-z0-9_]+))\s*=/g)) STANDARD_SHADER_SAMPLE_DEFAULTS.set(match[2]!, match[1]!);

const standardShaderSourceCache = new Map<string, string>();
const STANDARD_DIRECT_VISIBILITY_HOOK = "fn standard_direct_visibility(light_index: u32, world_position: vec3<f32>, geometric_normal: vec3<f32>, light_direction: vec3<f32>, world_position_dx: vec3<f32>, world_position_dy: vec3<f32>) -> f32 { return 1.0; }";
const STANDARD_SHADOW_VISIBILITY_HOOK = "fn standard_direct_visibility(light_index: u32, world_position: vec3<f32>, geometric_normal: vec3<f32>, light_direction: vec3<f32>, world_position_dx: vec3<f32>, world_position_dy: vec3<f32>) -> f32 { return shadow_visibility(light_index, world_position, geometric_normal, light_direction, world_position_dx, world_position_dy); }";

const specializeStandardShader = (source: string, plan: StandardMaterialLayoutPlan, variant: string, shadows: boolean = false, shadowGroup: number = 2): string => {
    const cacheKey = `${plan.featureKey}|${variant}|${shadows ? `shadows:${shadowGroup}` : "no-shadows"}`;
    const cached = standardShaderSourceCache.get(cacheKey);
    if (cached) return cached;
    const activeSlots = new Set(plan.bindings.map((binding) => binding.slot));
    const samplePattern = /textureSample\(\s*([A-Za-z0-9_]+)_tex\s*,\s*\1_sampler\s*,\s*[A-Za-z0-9_]+\s*,?\s*\)/g;
    let specialized = source.replace(samplePattern, (sample, shaderName: string) => {
        const definition = STANDARD_MATERIAL_TEXTURE_SLOT_BY_SHADER_NAME.get(shaderName);
        if (!definition || activeSlots.has(definition.slot)) return sample;
        const fallback = STANDARD_SHADER_SAMPLE_DEFAULTS.get(shaderName);
        if (!fallback) throw new Error(`StandardMaterial: canonical ${variant} WGSL has no imported default for ${definition.slot}.`);
        return fallback;
    });
    for (const definition of STANDARD_MATERIAL_TEXTURE_SLOTS) {
        if (activeSlots.has(definition.slot) || definition.slot === "transmissionSource") continue;
        const unresolvedSample = new RegExp(`\\btextureSample\\s*\\(\\s*${definition.shaderName}_tex\\b`);
        if (unresolvedSample.test(specialized)) throw new Error(`StandardMaterial: canonical ${variant} WGSL contains an unsupported ${definition.slot} sampling path.`);
    }
    if (shadows) {
        const receiver = shadowGroup === 2 ? shadowReceiverWGSL : shadowReceiverWGSL.replaceAll("@group(2)", `@group(${shadowGroup})`);
        const hookCount = specialized.split(STANDARD_DIRECT_VISIBILITY_HOOK).length - 1;
        if (hookCount !== 1) throw new Error(`StandardMaterial: canonical ${variant} WGSL must contain exactly one direct-visibility hook; found ${hookCount}.`);
        specialized = receiver.concat(specialized.replace(STANDARD_DIRECT_VISIBILITY_HOOK, STANDARD_SHADOW_VISIBILITY_HOOK));
    }
    specialized = standardDefaultsWGSL.concat(specialized);
    standardShaderSourceCache.set(cacheKey, specialized);
    return specialized;
};

const getSpecializedStandardShader = (plan: StandardMaterialLayoutPlan, opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean; shadows?: boolean; shadowGroup?: number } = {}): string => {
    const transmission = plan.usesTransmission;
    const shadowGroup = opts.shadowGroup ?? (opts.skinned || opts.skinned8 ? 3 : 2);
    if (opts.instanced) return specializeStandardShader(transmission ? standardTransmissionInstancedWGSL : standardInstancedWGSL, plan, transmission ? "transmission-instanced" : "instanced", opts.shadows, shadowGroup);
    if (opts.skinned8) return specializeStandardShader(transmission ? standardTransmissionSkinned8WGSL : standardSkinned8WGSL, plan, transmission ? "transmission-skinned8" : "skinned8", opts.shadows, shadowGroup);
    if (opts.skinned) return specializeStandardShader(transmission ? standardTransmissionSkinnedWGSL : standardSkinnedWGSL, plan, transmission ? "transmission-skinned" : "skinned", opts.shadows, shadowGroup);
    return specializeStandardShader(transmission ? standardTransmissionWGSL : standardWGSL, plan, transmission ? "transmission" : "standard", opts.shadows, shadowGroup);
};

const standardMaterialBindGroupLayouts = new WeakMap<GPUDevice, Map<string, GPUBindGroupLayout>>();

export const getMaterialTextureForSlot = (material: StandardMaterial, slot: StandardMaterialTextureSlot): Texture2D | null => {
    const ext = material.extensions;
    switch (slot) {
        case "baseColor": return material.baseColorTexture;
        case "metallicRoughness": return material.metallicRoughnessTexture;
        case "normal": return material.normalTexture;
        case "occlusion": return material.occlusionTexture;
        case "emissive": return material.emissiveTexture;
        case "clearcoat": return ext.clearcoat?.texture ?? null;
        case "clearcoatRoughness": return ext.clearcoat?.roughnessTexture ?? null;
        case "clearcoatNormal": return ext.clearcoat?.normalTexture ?? null;
        case "specular": return ext.specular?.texture ?? null;
        case "specularColor": return ext.specular?.colorTexture ?? null;
        case "sheenColor": return ext.sheen?.colorTexture ?? null;
        case "sheenRoughness": return ext.sheen?.roughnessTexture ?? null;
        case "iridescence": return ext.iridescence?.texture ?? null;
        case "iridescenceThickness": return ext.iridescence?.thicknessTexture ?? null;
        case "anisotropy": return ext.anisotropy?.texture ?? null;
        case "transmission": return ext.transmission?.texture ?? null;
        case "volumeThickness": return ext.volume?.thicknessTexture ?? null;
        case "diffuseTransmission": return ext.diffuseTransmission?.texture ?? null;
        case "diffuseTransmissionColor": return ext.diffuseTransmission?.colorTexture ?? null;
        case "transmissionSource": return null;
    }
};

export class StandardMaterial extends Material {
    private _color: Color;
    private _opacity: number;
    private _metallic: number;
    private _roughness: number;
    private _emissive: Color;
    private _emissiveIntensity: number;
    private _baseColorTexture: Texture2D | null;
    private _metallicRoughnessTexture: Texture2D | null;
    private _normalTexture: Texture2D | null;
    private _occlusionTexture: Texture2D | null;
    private _emissiveTexture: Texture2D | null;
    private _baseColorTextureTransform: TextureTransform;
    private _metallicRoughnessTextureTransform: TextureTransform;
    private _normalTextureTransform: TextureTransform;
    private _occlusionTextureTransform: TextureTransform;
    private _emissiveTextureTransform: TextureTransform;
    private _normalScale: number;
    private _occlusionStrength: number;
    private _alphaCutoff: number;
    private _extensions: StandardMaterialExtensions;
    private _layoutPlan: StandardMaterialLayoutPlan | null = null;
    private static readonly UNIFORM_FLOAT_COUNT = 204;

    constructor(descriptor: StandardMaterialDescriptor = {}) {
        super({
            ...descriptor,
            blendMode: descriptor.blendMode ?? ((descriptor.opacity ?? 1) < 1 ? BlendMode.Transparent : BlendMode.Opaque)
        });
        this._color = descriptor.color ?? [1, 1, 1];
        this._opacity = descriptor.opacity ?? 1;
        this._metallic = descriptor.metallic ?? 0.0;
        this._roughness = descriptor.roughness ?? 1.0;
        this._emissive = descriptor.emissive ?? [0, 0, 0];
        this._emissiveIntensity = descriptor.emissiveIntensity ?? 0;
        this._baseColorTexture = descriptor.baseColorTexture ?? null;
        this._metallicRoughnessTexture = descriptor.metallicRoughnessTexture ?? null;
        this._normalTexture = descriptor.normalTexture ?? null;
        this._occlusionTexture = descriptor.occlusionTexture ?? null;
        this._emissiveTexture = descriptor.emissiveTexture ?? null;
        this._baseColorTextureTransform = normalizeTextureTransform(descriptor.baseColorTextureTransform);
        this._metallicRoughnessTextureTransform = normalizeTextureTransform(descriptor.metallicRoughnessTextureTransform);
        this._normalTextureTransform = normalizeTextureTransform(descriptor.normalTextureTransform);
        this._occlusionTextureTransform = normalizeTextureTransform(descriptor.occlusionTextureTransform);
        this._emissiveTextureTransform = normalizeTextureTransform(descriptor.emissiveTextureTransform);
        this._normalScale = descriptor.normalScale ?? 1;
        this._occlusionStrength = descriptor.occlusionStrength ?? 1;
        this._alphaCutoff = descriptor.alphaCutoff ?? 0;
        this._extensions = normalizeStandardMaterialExtensions(descriptor.extensions);
    }

    private invalidateBindings(): void {
        this._layoutPlan = null;
        this.bindGroupKey = null;
        this._dirty = true;
    }

    getLayoutPlan(): StandardMaterialLayoutPlan {
        if (!this._layoutPlan) this._layoutPlan = planStandardMaterialLayout(this.getFeatureMask());
        return this._layoutPlan;
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color = value;
        this._dirty = true;
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(value: number) {
        this._opacity = value;
        this._dirty = true;
    }

    get metallic(): number {
        return this._metallic;
    }

    set metallic(value: number) {
        this._metallic = Math.max(0, Math.min(1, value));
        this._dirty = true;
    }

    get roughness(): number {
        return this._roughness;
    }

    set roughness(value: number) {
        this._roughness = Math.max(0, Math.min(1, value));
        this._dirty = true;
    }

    get emissive(): Color {
        return this._emissive;
    }

    set emissive(value: Color) {
        this._emissive = value;
        this._dirty = true;
    }

    get emissiveIntensity(): number {
        return this._emissiveIntensity;
    }

    set emissiveIntensity(value: number) {
        this._emissiveIntensity = value;
        this._dirty = true;
    }

    get baseColorTexture(): Texture2D | null {
        return this._baseColorTexture;
    }

    set baseColorTexture(value: Texture2D | null) {
        this._baseColorTexture = value;
        this.invalidateBindings();
    }

    get metallicRoughnessTexture(): Texture2D | null {
        return this._metallicRoughnessTexture;
    }

    set metallicRoughnessTexture(value: Texture2D | null) {
        this._metallicRoughnessTexture = value;
        this.invalidateBindings();
    }

    get normalTexture(): Texture2D | null {
        return this._normalTexture;
    }

    set normalTexture(value: Texture2D | null) {
        this._normalTexture = value;
        this.invalidateBindings();
    }

    get occlusionTexture(): Texture2D | null {
        return this._occlusionTexture;
    }

    set occlusionTexture(value: Texture2D | null) {
        this._occlusionTexture = value;
        this.invalidateBindings();
    }

    get emissiveTexture(): Texture2D | null {
        return this._emissiveTexture;
    }

    set emissiveTexture(value: Texture2D | null) {
        this._emissiveTexture = value;
        this.invalidateBindings();
    }

    get baseColorTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._baseColorTextureTransform);
    }

    set baseColorTextureTransform(value: TextureTransformDescriptor | null) {
        this._baseColorTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
    }

    get metallicRoughnessTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._metallicRoughnessTextureTransform);
    }

    set metallicRoughnessTextureTransform(value: TextureTransformDescriptor | null) {
        this._metallicRoughnessTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
    }

    get normalTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._normalTextureTransform);
    }

    set normalTextureTransform(value: TextureTransformDescriptor | null) {
        this._normalTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
    }

    get occlusionTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._occlusionTextureTransform);
    }

    set occlusionTextureTransform(value: TextureTransformDescriptor | null) {
        this._occlusionTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
    }

    get emissiveTextureTransform(): TextureTransform {
        return cloneTextureTransform(this._emissiveTextureTransform);
    }

    set emissiveTextureTransform(value: TextureTransformDescriptor | null) {
        this._emissiveTextureTransform = normalizeTextureTransform(value);
        this._dirty = true;
    }

    get normalScale(): number {
        return this._normalScale;
    }

    set normalScale(value: number) {
        this._normalScale = value;
        this._dirty = true;
    }

    get occlusionStrength(): number {
        return this._occlusionStrength;
    }

    set occlusionStrength(value: number) {
        this._occlusionStrength = value;
        this._dirty = true;
    }

    get alphaCutoff(): number {
        return this._alphaCutoff;
    }

    set alphaCutoff(value: number) {
        this._alphaCutoff = value;
        this._dirty = true;
    }

    get extensions(): StandardMaterialExtensions {
        return cloneStandardMaterialExtensions(this._extensions);
    }

    setExtensions(descriptor?: StandardMaterialExtensionsDescriptor): this {
        const previousPlan = this.getLayoutPlan();
        const previousTextures = previousPlan.bindings.map((binding) => getMaterialTextureForSlot(this, binding.slot));
        this._extensions = normalizeStandardMaterialExtensions(descriptor);
        const nextPlan = planStandardMaterialLayout(this.getFeatureMask());
        const sameLayout = previousPlan.featureKey === nextPlan.featureKey;
        const sameResources = sameLayout && nextPlan.bindings.every((binding, index) => getMaterialTextureForSlot(this, binding.slot) === previousTextures[index]);
        this._layoutPlan = nextPlan;
        if (!sameResources) this.bindGroupKey = null;
        this._dirty = true;
        return this;
    }

    getFeatureMask(): number {
        let mask = 0;
        if (this._baseColorTexture) mask |= StandardMaterialFeatureFlag.BaseColorTexture;
        if (this._metallicRoughnessTexture) mask |= StandardMaterialFeatureFlag.MetallicRoughnessTexture;
        if (this._normalTexture) mask |= StandardMaterialFeatureFlag.NormalTexture;
        if (this._occlusionTexture) mask |= StandardMaterialFeatureFlag.OcclusionTexture;
        if (this._emissiveTexture) mask |= StandardMaterialFeatureFlag.EmissiveTexture;
        const clearcoat = this._extensions.clearcoat;
        if (clearcoat) {
            if (clearcoat.texture) mask |= StandardMaterialFeatureFlag.ClearcoatTexture;
            if (clearcoat.roughnessTexture) mask |= StandardMaterialFeatureFlag.ClearcoatRoughnessTexture;
            if (clearcoat.normalTexture) mask |= StandardMaterialFeatureFlag.ClearcoatNormalTexture;
        }
        const transmission = this._extensions.transmission;
        if (transmission) {
            mask |= StandardMaterialFeatureFlag.Transmission;
            if (transmission.texture) mask |= StandardMaterialFeatureFlag.TransmissionTexture;
        }
        const volume = this._extensions.volume;
        if (volume) {
            if (volume.thicknessTexture) mask |= StandardMaterialFeatureFlag.ThicknessTexture;
        }
        const specular = this._extensions.specular;
        if (specular) {
            if (specular.texture) mask |= StandardMaterialFeatureFlag.SpecularTexture;
            if (specular.colorTexture) mask |= StandardMaterialFeatureFlag.SpecularColorTexture;
        }
        const sheen = this._extensions.sheen;
        if (sheen) {
            if (sheen.colorTexture) mask |= StandardMaterialFeatureFlag.SheenColorTexture;
            if (sheen.roughnessTexture) mask |= StandardMaterialFeatureFlag.SheenRoughnessTexture;
        }
        const iridescence = this._extensions.iridescence;
        if (iridescence) {
            if (iridescence.texture) mask |= StandardMaterialFeatureFlag.IridescenceTexture;
            if (iridescence.thicknessTexture) mask |= StandardMaterialFeatureFlag.IridescenceThicknessTexture;
        }
        const anisotropy = this._extensions.anisotropy;
        if (anisotropy) {
            if (anisotropy.texture) mask |= StandardMaterialFeatureFlag.AnisotropyTexture;
        }
        const diffuseTransmission = this._extensions.diffuseTransmission;
        if (diffuseTransmission) {
            mask |= StandardMaterialFeatureFlag.DiffuseTransmission;
            if (diffuseTransmission.texture) mask |= StandardMaterialFeatureFlag.DiffuseTransmissionTexture;
            if (diffuseTransmission.colorTexture) mask |= StandardMaterialFeatureFlag.DiffuseTransmissionColorTexture;
        }
        return mask >>> 0;
    }

    getUniformBufferSize(): number {
        return StandardMaterial.UNIFORM_FLOAT_COUNT * 4;
    }

    getUniformData(): Float32Array {
        const f = this.getUniformDataCache(StandardMaterial.UNIFORM_FLOAT_COUNT);
        f[0] = this._color[0];
        f[1] = this._color[1];
        f[2] = this._color[2];
        f[3] = this._opacity;
        f[4] = this._emissive[0];
        f[5] = this._emissive[1];
        f[6] = this._emissive[2];
        f[7] = this._emissiveIntensity;
        f[8] = this._metallic;
        f[9] = this._roughness;
        f[10] = this._normalTexture ? this._normalScale : 0;
        f[11] = this._occlusionStrength;
        f[12] = this._alphaCutoff;
        f[13] = 0;
        f[14] = 0;
        f[15] = 0;
        packTextureTransform(f, 16, this._baseColorTextureTransform);
        packTextureTransform(f, 24, this._metallicRoughnessTextureTransform);
        packTextureTransform(f, 32, this._normalTextureTransform);
        packTextureTransform(f, 40, this._occlusionTextureTransform);
        packTextureTransform(f, 48, this._emissiveTextureTransform);
        const clearcoat = this._extensions.clearcoat;
        const specular = this._extensions.specular;
        const sheen = this._extensions.sheen;
        const iridescence = this._extensions.iridescence;
        const anisotropy = this._extensions.anisotropy;
        const transmission = this._extensions.transmission;
        const volume = this._extensions.volume;
        const diffuseTransmission = this._extensions.diffuseTransmission;
        const dispersion = this._extensions.dispersion;
        const ior = this._extensions.ior;
        const emissiveStrength = this._extensions.emissiveStrength;
        f[56] = clearcoat?.factor ?? 0;
        f[57] = clearcoat?.roughness ?? 0;
        f[58] = clearcoat?.normalTexture ? (clearcoat.normalScale ?? 1) : 0;
        f[59] = 0;
        f[60] = specular?.factor ?? 1;
        f[61] = specular?.color[0] ?? 1;
        f[62] = specular?.color[1] ?? 1;
        f[63] = specular?.color[2] ?? 1;
        f[64] = ior?.ior ?? 1.5;
        f[65] = emissiveStrength?.strength ?? 1;
        f[66] = 0;
        f[67] = 0;
        packTextureTransform(f, 68, clearcoat?.textureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 76, clearcoat?.roughnessTextureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 84, clearcoat?.normalTextureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 92, specular?.textureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 100, specular?.colorTextureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        f[108] = sheen?.color[0] ?? 0;
        f[109] = sheen?.color[1] ?? 0;
        f[110] = sheen?.color[2] ?? 0;
        f[111] = sheen?.roughness ?? 0;
        f[112] = iridescence?.factor ?? 0;
        f[113] = iridescence?.ior ?? 1.3;
        f[114] = iridescence?.thicknessMinimum ?? 100;
        f[115] = iridescence?.thicknessMaximum ?? 400;
        f[116] = anisotropy?.strength ?? 0;
        f[117] = Math.cos(anisotropy?.rotation ?? 0);
        f[118] = Math.sin(anisotropy?.rotation ?? 0);
        f[119] = 0;
        packTextureTransform(f, 120, sheen?.colorTextureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 128, sheen?.roughnessTextureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 136, iridescence?.textureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 144, iridescence?.thicknessTextureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 152, anisotropy?.textureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        f[160] = transmission?.factor ?? 0;
        f[161] = diffuseTransmission?.factor ?? 0;
        f[162] = volume?.thicknessFactor ?? 0;
        f[163] = dispersion?.dispersion ?? 0;
        f[164] = diffuseTransmission?.color[0] ?? 1;
        f[165] = diffuseTransmission?.color[1] ?? 1;
        f[166] = diffuseTransmission?.color[2] ?? 1;
        f[167] = Number.isFinite(volume?.attenuationDistance ?? Infinity) ? (volume?.attenuationDistance ?? 0) : 0;
        f[168] = volume?.attenuationColor[0] ?? 1;
        f[169] = volume?.attenuationColor[1] ?? 1;
        f[170] = volume?.attenuationColor[2] ?? 1;
        f[171] = 0;
        packTextureTransform(f, 172, transmission?.textureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 180, volume?.thicknessTextureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 188, diffuseTransmission?.textureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        packTextureTransform(f, 196, diffuseTransmission?.colorTextureTransform ?? DEFAULT_TEXTURE_TRANSFORM);
        return f;
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        const plan = this.getLayoutPlan();
        const maxTextures = device.limits?.maxSampledTexturesPerShaderStage ?? WEBGPU_BASELINE_MAX_SAMPLED_TEXTURES_PER_SHADER_STAGE;
        const maxSamplers = device.limits?.maxSamplersPerShaderStage ?? WEBGPU_BASELINE_MAX_SAMPLERS_PER_SHADER_STAGE;
        const materialIdentity = this.label ? ` '${this.label}'` : "";
        if (plan.sampledTextureCount > maxTextures || plan.samplerCount > maxSamplers) throw new Error(`StandardMaterial${materialIdentity}: required ${plan.sampledTextureCount} sampled textures (limit: ${maxTextures}) and ${plan.samplerCount} samplers (limit: ${maxSamplers}) for features [${plan.bindings.map((b) => b.slot).join(", ")}], which exceeds device limits.`);
        let deviceLayouts = standardMaterialBindGroupLayouts.get(device);
        if (!deviceLayouts) { deviceLayouts = new Map(); standardMaterialBindGroupLayouts.set(device, deviceLayouts); }
        const cached = deviceLayouts.get(plan.featureKey);
        if (cached) return cached;
        const entries: GPUBindGroupLayoutEntry[] = [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }];
        for (const b of plan.bindings) {
            entries.push({ binding: b.samplerBinding, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } });
            entries.push({ binding: b.textureBinding, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } });
        }
        const layout = device.createBindGroupLayout({ label: `StandardMaterial ${plan.featureKey}`, entries });
        deviceLayouts.set(plan.featureKey, layout);
        return layout;
    }

    usesTransmissionLayout(): boolean {
        return this.getLayoutPlan().usesTransmission;
    }

    getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean; shadows?: boolean; shadowGroup?: number } = {}): string {
        return getSpecializedStandardShader(this.getLayoutPlan(), opts);
    }
}

export type DataMaterialDescriptor = MaterialDescriptor & {
    data?: Float32Array;
    dataBuffer?: GPUBuffer | { buffer: GPUBuffer } | null;
    keepCPUData?: boolean;
    scaleTransform: ScaleTransformDescriptor;
    opacity?: number;
    shading?: number;
    colormap?: BuiltinColormapName | Colormap;
};

export type DataMaterialVisualChangeKind = "scale" | "colormap" | "visual";

export class DataMaterial extends Material {
    private _CPUData: Float32Array | null = null;
    private _keepCPUData: boolean = false;
    private _dataDirty: boolean = false;
    private _ownsDataBuffer: boolean = false;
    dataBuffer: GPUBuffer | null = null;
    private _elementCount: number = 0;
    private _scaleTransform: ScaleTransform;
    private _opacity: number = 1;
    private _shading: number = 0;
    private _colormap: BuiltinColormapName | Colormap = "viridis";
    private _scaleRevision: number = 0;
    private readonly _visualChangeListeners: Set<(kind: DataMaterialVisualChangeKind) => void> = new Set();
    private static _cachedBindGroupLayout: GPUBindGroupLayout | null = null;
    private static _cachedLayoutDevice: GPUDevice | null = null;

    constructor(desc: DataMaterialDescriptor) {
        assert(!!desc && !!desc.scaleTransform, "DataMaterial: scaleTransform is required.");
        super({
            ...desc,
            blendMode: desc.blendMode ?? ((desc.opacity ?? 1) < 1 ? BlendMode.Transparent : BlendMode.Opaque)
        });
        this._scaleTransform = normalizeScaleTransform(desc.scaleTransform);
        if (desc.keepCPUData !== undefined) this._keepCPUData = !!desc.keepCPUData;
        if (desc.opacity !== undefined) this._opacity = desc.opacity;
        if (desc.shading !== undefined) this._shading = desc.shading;
        if (desc.colormap !== undefined) this._colormap = desc.colormap;
        if (desc.data) this.setData(desc.data, { keepCPUData: this._keepCPUData });
        if (desc.dataBuffer !== undefined && desc.dataBuffer !== null) {
            this.setDataBuffer(resolveGPUBuffer(desc.dataBuffer));
        }
    }

    get scaleTransform(): ScaleTransform {
        return cloneScaleTransform(this._scaleTransform);
    }

    setScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): void {
        this._scaleTransform = normalizeScaleTransform(transform);
        this._elementCount = this.recomputeElementCount();
        this._dirty = true;
        this.emitVisualChange("scale");
    }

    get opacity(): number {
        return this._opacity;
    }

    set opacity(v: number) {
        if (v === this._opacity) return;
        this._opacity = v;
        this._dirty = true;
    }

    get shading(): number {
        return this._shading;
    }

    set shading(v: number) {
        if (v === this._shading) return;
        this._shading = v;
        this._dirty = true;
    }

    get colormap(): BuiltinColormapName | Colormap {
        return this._colormap;
    }

    set colormap(v: BuiltinColormapName | Colormap) {
        this._colormap = v;
        this.bindGroupKey = null;
        this.emitVisualChange("colormap");
    }

    onVisualChange(listener: (kind: DataMaterialVisualChangeKind) => void): () => void {
        this._visualChangeListeners.add(listener);
        return () => {
            this._visualChangeListeners.delete(listener);
        };
    }

    getColormapKey(): string {
        const c = this._colormap;
        return (c instanceof Colormap) ? `cm:${c.id}` : `cm:${c}`;
    }

    getColormapForBinding(): Colormap {
        const c = this._colormap;
        if (c instanceof Colormap) return c;
        return Colormap.builtin(c);
    }

    private computeElementCountFromFloatLength(floatLength: number): number {
        const stride = Math.max(1, Math.floor(this._scaleTransform.stride));
        const offset = Math.max(0, Math.floor(this._scaleTransform.offset));
        if (floatLength <= offset) return 0;
        return Math.max(0, Math.floor((floatLength - offset) / stride));
    }

    private recomputeElementCount(): number {
        if (this._CPUData) return this.computeElementCountFromFloatLength(this._CPUData.length);
        if (this.dataBuffer) return this.computeElementCountFromFloatLength(Math.floor(this.dataBuffer.size / 4));
        return 0;
    }

    setData(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void {
        assert(data.length > 0, "DataMaterial: data must be non-empty.");
        this._CPUData = data;
        this._dataDirty = true;
        this._keepCPUData = opts.keepCPUData ?? this._keepCPUData;
        this._elementCount = this.computeElementCountFromFloatLength(data.length);
        this._scaleRevision++;
        this._dirty = true;
        this.bindGroupKey = null;
    }

    setDataBuffer(buffer: GPUBuffer): void {
        this._CPUData = null;
        this.dataBuffer = buffer;
        this._ownsDataBuffer = false;
        this._dataDirty = false;
        this._elementCount = this.computeElementCountFromFloatLength(Math.floor(buffer.size / 4));
        this._scaleRevision++;
        this._dirty = true;
        this.bindGroupKey = null;
    }

    dropCPUData(): void {
        this._CPUData = null;
    }

    getScaleSourceDescriptor(revision: number = this._scaleRevision): ScaleSourceDescriptor | null {
        if (!this.dataBuffer || this._elementCount <= 0) return null;
        return {
            buffer: this.dataBuffer,
            count: this._elementCount,
            componentCount: this._scaleTransform.componentCount,
            componentIndex: this._scaleTransform.componentIndex,
            valueMode: this._scaleTransform.valueMode,
            stride: this._scaleTransform.stride,
            offset: this._scaleTransform.offset,
            revision
        };
    }

    upload(device: GPUDevice, queue: GPUQueue): void {
        this.assertAlive("upload");
        if (!this._dataDirty) return;
        if (this.dataBuffer && !this._CPUData) {
            this._dataDirty = false;
            return;
        }
        const data = this._CPUData;
        if (!data) {
            this._dataDirty = false;
            return;
        }
        const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
        if (!this.dataBuffer || !this._ownsDataBuffer) {
            this.dataBuffer = createBuffer(device, data, usage);
            this._ownsDataBuffer = true;
        } else {
            try {
                queue.writeBuffer(this.dataBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
            } catch {
                this.dataBuffer.destroy();
                this.dataBuffer = createBuffer(device, data, usage);
            }
        }
        this._elementCount = this.computeElementCountFromFloatLength(data.length);
        if (!this._keepCPUData) this._CPUData = null;
        this._dataDirty = false;
        this.bindGroupKey = null;
    }

    getUniformBufferSize(): number {
        return (SCALE_UNIFORM_FLOAT_COUNT + 4) * 4;
    }

    getUniformData(): Float32Array {
        const f = this.getUniformDataCache(SCALE_UNIFORM_FLOAT_COUNT + 4);
        f.fill(0);
        packScaleTransform(this._scaleTransform, f, 0);
        f[SCALE_UNIFORM_FLOAT_COUNT + 0] = clamp01(this._opacity);
        f[SCALE_UNIFORM_FLOAT_COUNT + 1] = clamp01(this._shading);
        f[SCALE_UNIFORM_FLOAT_COUNT + 2] = 0;
        f[SCALE_UNIFORM_FLOAT_COUNT + 3] = 0;
        return f;
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (DataMaterial._cachedBindGroupLayout && DataMaterial._cachedLayoutDevice === device) return DataMaterial._cachedBindGroupLayout;
        const layout = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float", viewDimension: "1d" } }
            ]
        });
        DataMaterial._cachedBindGroupLayout = layout;
        DataMaterial._cachedLayoutDevice = device;
        return layout;
    }

    getShaderCode(_opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string {
        return dataWGSL;
    }

    private emitVisualChange(kind: DataMaterialVisualChangeKind): void {
        for (const listener of this._visualChangeListeners) {
            try {
                listener(kind);
            } catch { /* ignore */ }
        }
    }

    protected disposeResources(): void {
        super.disposeResources();
        if (this._ownsDataBuffer) this.dataBuffer?.destroy();
        this.dataBuffer = null;
        this._CPUData = null;
        this._dataDirty = false;
        this._elementCount = 0;
        this._visualChangeListeners.clear();
    }
}

export type CustomMaterialDescriptor = MaterialDescriptor & {
    vertexShader?: string;
    fragmentShader: string;
    bindGroupLayout?: BindGroupLayoutDescriptor;
    resources?: BindGroupResources;
};

const snapshotCustomMaterialResource = (resource: BindingResource): BindingResource => {
    normalizeBindingResource(resource);
    if (isGPUBuffer(resource) || !("buffer" in resource)) return resource;
    if ("device" in resource && "queue" in resource) return resource;
    const binding = resource as { buffer: BufferResource; offset?: number; size?: number };
    return { buffer: binding.buffer, offset: binding.offset, size: binding.size };
};

export class CustomMaterial extends Material {
    private readonly _vertexShader: string;
    private readonly _fragmentShader: string;
    private readonly _bindGroupLayout: BindGroupLayoutDescriptor;
    private readonly _resources = new Map<number, BindingResource>();
    private _cachedBindGroupLayout: GPUBindGroupLayout | null = null;
    private _cachedLayoutDevice: GPUDevice | null = null;

    constructor(descriptor: CustomMaterialDescriptor) {
        super(descriptor);
        this._vertexShader = descriptor.vertexShader ?? this.defaultVertexShader();
        this._fragmentShader = descriptor.fragmentShader;
        this._bindGroupLayout = normalizeBindGroupLayout(descriptor.bindGroupLayout ?? { entries: [] }, "CustomMaterial bind group layout");
        const resources = descriptor.resources ?? {};
        validateResourcesForLayout(this._bindGroupLayout, resources, "CustomMaterial");
        if (Array.isArray(resources)) for (const entry of resources as ReadonlyArray<{ binding: number; resource: BindingResource }>) this._resources.set(entry.binding, snapshotCustomMaterialResource(entry.resource));
        else for (const key of Object.keys(resources)) this._resources.set(Number(key), snapshotCustomMaterialResource((resources as Record<number, BindingResource>)[Number(key)]));
    }

    getUniformBufferSize(): number {
        return 0;
    }

    getUniformData(): Float32Array {
        this.assertAlive("build uniform data");
        return new Float32Array(0);
    }

    getResource(binding: number): BindingResource | undefined {
        this.assertAlive("get a resource");
        const resource = this._resources.get(binding);
        return resource ? snapshotCustomMaterialResource(resource) : undefined;
    }

    setResource(binding: number, resource: BindingResource): void {
        this.assertAlive("set a resource");
        if (!this._bindGroupLayout.entries.some((entry) => entry.binding === binding)) throw new Error(`CustomMaterial: binding ${binding} is not declared by the immutable bind group layout`);
        this._resources.set(binding, snapshotCustomMaterialResource(resource));
        this.bindGroup = null;
        this.bindGroupKey = null;
    }

    getBindGroupEntries(): GPUBindGroupEntry[] {
        this.assertAlive("build bind group entries");
        return this._bindGroupLayout.entries.map((entry) => {
            const resource = this._resources.get(entry.binding);
            if (!resource) throw new Error(`CustomMaterial: missing resource for binding ${entry.binding}`);
            return { binding: entry.binding, resource: normalizeBindingResource(resource) };
        });
    }

    createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (this._cachedBindGroupLayout && this._cachedLayoutDevice === device) return this._cachedBindGroupLayout;
        const layout = device.createBindGroupLayout({ label: this._bindGroupLayout.label, entries: this._bindGroupLayout.entries });
        this._cachedBindGroupLayout = layout;
        this._cachedLayoutDevice = device;
        return layout;
    }

    private defaultVertexShader(): string {
        return customDefaultVertexWGSL;
    }

    getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string {
        return this._vertexShader + "\n" + this._fragmentShader;
    }

    protected disposeResources(): void {
        super.disposeResources();
        this._resources.clear();
        this._cachedBindGroupLayout = null;
        this._cachedLayoutDevice = null;
    }
}
