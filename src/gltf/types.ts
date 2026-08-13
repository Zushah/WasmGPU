/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export type GltfID = number;

export type GltfExtras = unknown;

export type GltfExtensions = Record<string, unknown>;

export type GltfAsset = {
    version: string;
    generator?: string;
    copyright?: string;
    minVersion?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfBuffer = {
    uri?: string;
    byteLength: number;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfBufferView = {
    buffer: GltfID;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
    target?: number;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfAccessorComponentType = 5120 | 5121 | 5122 | 5123 | 5124 | 5125 | 5126;

export type GltfAccessorType = "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4";

export type GltfAccessorSparse = {
    count: number;
    indices: {
        bufferView: GltfID;
        byteOffset?: number;
        componentType: 5121 | 5123 | 5125;
        extras?: GltfExtras;
        extensions?: GltfExtensions;
    };
    values: {
        bufferView: GltfID;
        byteOffset?: number;
        extras?: GltfExtras;
        extensions?: GltfExtensions;
    };
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfAccessor = {
    bufferView?: GltfID;
    byteOffset?: number;
    componentType: GltfAccessorComponentType;
    normalized?: boolean;
    count: number;
    type: GltfAccessorType;
    max?: number[];
    min?: number[];
    sparse?: GltfAccessorSparse;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfPrimitiveAttributes = { [semantic: string]: GltfID | undefined };

export type GltfPrimitive = {
    attributes: GltfPrimitiveAttributes;
    indices?: GltfID;
    material?: GltfID;
    mode?: number;
    targets?: Array<GltfPrimitiveAttributes>;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfMesh = {
    primitives: GltfPrimitive[];
    weights?: number[];
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfNode = {
    camera?: GltfID;
    children?: GltfID[];
    skin?: GltfID;
    matrix?: number[];
    mesh?: GltfID;
    rotation?: [number, number, number, number];
    scale?: [number, number, number];
    translation?: [number, number, number];
    weights?: number[];
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfScene = {
    nodes?: GltfID[];
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfSampler = {
    magFilter?: number;
    minFilter?: number;
    wrapS?: number;
    wrapT?: number;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfImage = {
    uri?: string;
    mimeType?: string;
    bufferView?: GltfID;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfTexture = {
    sampler?: GltfID;
    source?: GltfID;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfTextureInfo = {
    index: GltfID;
    texCoord?: number;
    extensions?: GltfExtensions;
    extras?: GltfExtras;
};

export type GltfMaterialPBRMetallicRoughness = {
    baseColorFactor?: [number, number, number, number];
    baseColorTexture?: GltfTextureInfo;
    metallicFactor?: number;
    roughnessFactor?: number;
    metallicRoughnessTexture?: GltfTextureInfo;
    extensions?: GltfExtensions;
    extras?: GltfExtras;
};

export type GltfNormalTextureInfo = {
    index: GltfID;
    texCoord?: number;
    scale?: number;
    extensions?: GltfExtensions;
    extras?: GltfExtras;
};

export type GltfOcclusionTextureInfo = {
    index: GltfID;
    texCoord?: number;
    strength?: number;
    extensions?: GltfExtensions;
    extras?: GltfExtras;
};

export type GltfMaterial = {
    name?: string;
    pbrMetallicRoughness?: GltfMaterialPBRMetallicRoughness;
    normalTexture?: GltfNormalTextureInfo;
    occlusionTexture?: GltfOcclusionTextureInfo;
    emissiveTexture?: GltfTextureInfo;
    emissiveFactor?: [number, number, number];
    alphaMode?: "OPAQUE" | "MASK" | "BLEND";
    alphaCutoff?: number;
    doubleSided?: boolean;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfSkin = {
    inverseBindMatrices?: GltfID;
    skeleton?: GltfID;
    joints: GltfID[];
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfAnimationSampler = {
    input: GltfID;
    interpolation?: "LINEAR" | "STEP" | "CUBICSPLINE";
    output: GltfID;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfAnimationChannelTarget = {
    node?: GltfID;
    path: "translation" | "rotation" | "scale" | "weights" | "pointer";
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfAnimationChannel = {
    sampler: GltfID;
    target: GltfAnimationChannelTarget;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfAnimation = {
    samplers: GltfAnimationSampler[];
    channels: GltfAnimationChannel[];
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfCameraPerspective = {
    aspectRatio?: number;
    yfov: number;
    znear: number;
    zfar?: number;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfCameraOrthographic = {
    xmag: number;
    ymag: number;
    znear: number;
    zfar: number;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type GltfCamera = {
    type: "perspective" | "orthographic";
    perspective?: GltfCameraPerspective;
    orthographic?: GltfCameraOrthographic;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

export type KHRLightsPunctualLight = {
    type: "directional" | "point" | "spot";
    color?: [number, number, number];
    intensity?: number;
    range?: number;
    spot?: {
        innerConeAngle?: number;
        outerConeAngle?: number;
    };
    name?: string;
};

export type KHRLightsPunctualRoot = {
    lights: KHRLightsPunctualLight[];
};

export type KHRLightsPunctualNode = {
    light: GltfID;
};

export type GltfRoot = {
    asset: GltfAsset;
    scene?: GltfID;
    scenes?: GltfScene[];
    nodes?: GltfNode[];
    meshes?: GltfMesh[];
    buffers?: GltfBuffer[];
    bufferViews?: GltfBufferView[];
    accessors?: GltfAccessor[];
    materials?: GltfMaterial[];
    textures?: GltfTexture[];
    images?: GltfImage[];
    samplers?: GltfSampler[];
    skins?: GltfSkin[];
    animations?: GltfAnimation[];
    cameras?: GltfCamera[];
    extensionsUsed?: string[];
    extensionsRequired?: string[];
    extensions?: GltfExtensions;
    extras?: GltfExtras;
};

export type GltfDocument = {
    json: GltfRoot;
    buffers: ArrayBuffer[];
    images?: ArrayBuffer[];
    baseUrl: string;
    resourceBaseUrl?: string;
};
