/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { wasm, mat4f, WasmPtr } from "../wasm";
import { Geometry, computeGeometryTangents, computeGeometryVertexNormals, type GeometryMorphTargetDescriptor } from "../graphics/geometry";
import { BlendMode, CullMode, Material, StandardMaterial, UnlitMaterial, type StandardMaterialExtensionsDescriptor, type TextureTransformDescriptor } from "../graphics/material";
import { Texture2D } from "../graphics/texture";
import { AnimationClip, Skin, type AnimationPointerChannel, type AnimationPointerSampler } from "../graphics/animation";
import { Camera, OrthographicCamera, PerspectiveCamera } from "../world/camera";
import { Scene } from "../world/scene";
import { Mesh, initializeMeshMorphRuntime, setMeshMorphWeight } from "../world/mesh";
import { SplatField, type SplatFieldColorSpace, type SplatFieldSHDegree } from "../world/splatfield";
import { DirectionalLight, PointLight, SpotLight, bindLightToTransform, unbindLightTransform, type Light } from "../world/light";
import { Transform } from "../core/transform";
import type { GltfDocument, GltfAnimation, GltfAnimationChannel, GltfAnimationSampler, GltfAsset, GltfCamera, GltfExtensions, GltfExtras, GltfMaterial, GltfMesh, GltfNode, GltfPrimitive, GltfPrimitiveAttributes, GltfRoot, GltfScene, GltfSkin, KHRLightsPunctualLight, KHRLightsPunctualNode, KHRLightsPunctualRoot } from "./types";
import { decodeDataUri, isDataUri, resolveUri } from "./uri";
import { readAccessor, readAccessorAsFloat32, readAccessorAsUint16, readIndicesAsUint32 } from "./accessors";
import { validateGltfCompatibility } from "./compatibility";

export type ImportedSkin = {
    name?: string;
    joints: Transform[];
    inverseBindMatrices?: Float32Array;
    skeleton?: Transform;
    runtime: Skin | null;
};

export type ImportedAnimationSampler = {
    interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
    input: Float32Array;
    output: Float32Array;
};

export type ImportedAnimationChannel = {
    sampler: number;
    targetNode: Transform | null;
    path: "translation" | "rotation" | "scale" | "weights" | "pointer";
    targetPointer?: string;
};

export type ImportedAnimation = {
    name?: string;
    samplers: ImportedAnimationSampler[];
    channels: ImportedAnimationChannel[];
    clip: AnimationClip | null;
};

export type GltfImportMetadataRecord = {
    index: number;
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
    xmp?: unknown | null;
};

export type GltfImportMeshPrimitiveMetadata = GltfImportMetadataRecord & {
    material?: number;
};

export type GltfImportMeshMetadata = GltfImportMetadataRecord & {
    primitives: GltfImportMeshPrimitiveMetadata[];
};

export type GltfImportMetadata = {
    asset: GltfImportMetadataRecord;
    scene: GltfImportMetadataRecord | null;
    nodes: GltfImportMetadataRecord[];
    meshes: GltfImportMeshMetadata[];
    materials: GltfImportMetadataRecord[];
    textures: GltfImportMetadataRecord[];
    images: GltfImportMetadataRecord[];
    cameras: GltfImportMetadataRecord[];
    skins: GltfImportMetadataRecord[];
    animations: GltfImportMetadataRecord[];
    extensions: GltfImportExtensionsMetadata;
    xmp: GltfImportXmpMetadata;
    variants: GltfImportVariantsMetadata;
};

export type GltfImportExtensionSupportState = "supported" | "partial" | "deferred" | "unsupported";

export type GltfImportExtensionsMetadata = {
    used: string[];
    required: string[];
    support: Record<string, GltfImportExtensionSupportState>;
};

export type GltfImportXmpMetadata = {
    packets: unknown[];
    packet: unknown | null;
};

export type GltfImportVariantItem = GltfImportMetadataRecord;

export type GltfImportVariantsMetadata = {
    readonly items: GltfImportVariantItem[];
    readonly names: string[];
    readonly activeName: string | null;
    readonly activeIndex: number | null;
    setActive(name: string | null): void;
    setActiveIndex(index: number | null): void;
    clear(): void;
};

const getNodeVisibility = (source: GltfNode | undefined): boolean => {
    const ext = source?.extensions?.["KHR_node_visibility"] as { visible?: unknown } | undefined;
    return typeof ext?.visible === "boolean" ? ext.visible : true;
};

export class GltfImportedNode {
    readonly index: number;
    name?: string;
    readonly transform: Transform;
    parentIndex: number | null;
    children: number[];
    meshes: Mesh[];
    splatFields: SplatField[];
    camera: Camera | null;
    light: Light | null;
    private _visible: boolean;
    private _effectiveVisible: boolean;
    private _parentNode: GltfImportedNode | null;
    private _childNodes: GltfImportedNode[];

    constructor(index: number, transform: Transform, source?: GltfNode) {
        this.index = index;
        this.name = source?.name;
        this.transform = transform;
        this.parentIndex = null;
        this.children = [...(source?.children ?? [])];
        this.meshes = [];
        this.splatFields = [];
        this.camera = null;
        this.light = null;
        this._visible = getNodeVisibility(source);
        this._effectiveVisible = this._visible;
        this._parentNode = null;
        this._childNodes = [];
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = !!value;
        this.updateEffectiveVisibility();
    }

    get effectiveVisible(): boolean {
        return this._effectiveVisible;
    }

    setParentNode(parent: GltfImportedNode): void {
        this._parentNode = parent;
        if (!parent._childNodes.includes(this)) parent._childNodes.push(this);
        this.updateEffectiveVisibility();
    }

    applyVisibility(): void {
        for (const mesh of this.meshes) mesh.visible = this._effectiveVisible;
        for (const splatField of this.splatFields) splatField.visible = this._effectiveVisible;
        if (this.light) this.light.enabled = this._effectiveVisible;
    }

    private updateEffectiveVisibility(): void {
        const next = this._visible && (this._parentNode?.effectiveVisible ?? true);
        this._effectiveVisible = next;
        this.applyVisibility();
        for (const child of this._childNodes) child.updateEffectiveVisibility();
    }
}

export type GltfImportResult = {
    scene: Scene;
    meshes: Mesh[];
    splatFields: SplatField[];
    nodes: GltfImportedNode[];
    lights: Light[];
    cameras: Camera[];
    skins: ImportedSkin[];
    animations: ImportedAnimation[];
    clips: AnimationClip[];
    metadata: GltfImportMetadata;
    destroy(): void;
};

export type ImportGltfOptions = {
    sceneIndex?: number;
    targetScene?: Scene;
    addToScene?: boolean;
    computeMissingNormals?: boolean;
    importCameras?: boolean;
    importLights?: boolean;
    onWarning?: (message: string) => void;
};

const warn = (opts: ImportGltfOptions | undefined, msg: string): void => {
    opts?.onWarning?.(msg);
};

const getTextureInfoTexCoord = (info: any | undefined): number => {
    const transform = info?.extensions?.KHR_texture_transform;
    const texCoord = transform && typeof transform.texCoord === "number" ? transform.texCoord : info?.texCoord;
    return (texCoord ?? 0) | 0;
};

const validateMaterialTextureCoordinates = (mat: GltfMaterial | undefined, attrs: GltfPrimitiveAttributes, opts: ImportGltfOptions | undefined, context: string): void => {
    if (!mat) return;
    const validateInfo = (info: any | undefined, usage: string): void => {
        if (!info) return;
        const texCoord = getTextureInfoTexCoord(info);
        if (texCoord < 0 || texCoord > 1) { warn(opts, `${context}: texture usage '${usage}' references TEXCOORD_${texCoord}, but WasmGPU supports TEXCOORD_0 and TEXCOORD_1; using TEXCOORD_0.`); return; }
        if (attrs[`TEXCOORD_${texCoord}`] === undefined) warn(opts, `${context}: texture usage '${usage}' references missing TEXCOORD_${texCoord}; sampling will use zero coordinates.`);
    };
    validateInfo(mat.pbrMetallicRoughness?.baseColorTexture as any, "baseColor");
    validateInfo(mat.pbrMetallicRoughness?.metallicRoughnessTexture as any, "metallicRoughness");
    validateInfo(mat.normalTexture as any, "normal");
    validateInfo(mat.occlusionTexture as any, "occlusion");
    validateInfo(mat.emissiveTexture as any, "emissive");
    const specGloss = (mat.extensions as any)?.KHR_materials_pbrSpecularGlossiness as any;
    validateInfo(specGloss?.diffuseTexture as any, "diffuse");
    validateInfo(specGloss?.specularGlossinessTexture as any, "specularGlossiness");
    const clearcoat = (mat.extensions as any)?.KHR_materials_clearcoat as any;
    validateInfo(clearcoat?.clearcoatTexture as any, "clearcoat");
    validateInfo(clearcoat?.clearcoatRoughnessTexture as any, "clearcoatRoughness");
    validateInfo(clearcoat?.clearcoatNormalTexture as any, "clearcoatNormal");
    const specular = (mat.extensions as any)?.KHR_materials_specular as any;
    validateInfo(specular?.specularTexture as any, "specular");
    validateInfo(specular?.specularColorTexture as any, "specularColor");
    const sheen = (mat.extensions as any)?.KHR_materials_sheen as any;
    validateInfo(sheen?.sheenColorTexture as any, "sheenColor");
    validateInfo(sheen?.sheenRoughnessTexture as any, "sheenRoughness");
    const iridescence = (mat.extensions as any)?.KHR_materials_iridescence as any;
    validateInfo(iridescence?.iridescenceTexture as any, "iridescence");
    validateInfo(iridescence?.iridescenceThicknessTexture as any, "iridescenceThickness");
    const anisotropy = (mat.extensions as any)?.KHR_materials_anisotropy as any;
    validateInfo(anisotropy?.anisotropyTexture as any, "anisotropy");
    const transmission = (mat.extensions as any)?.KHR_materials_transmission as any;
    validateInfo(transmission?.transmissionTexture as any, "transmission");
    const volume = (mat.extensions as any)?.KHR_materials_volume as any;
    validateInfo(volume?.thicknessTexture as any, "volumeThickness");
    const diffuseTransmission = (mat.extensions as any)?.KHR_materials_diffuse_transmission as any;
    validateInfo(diffuseTransmission?.diffuseTransmissionTexture as any, "diffuseTransmission");
    validateInfo(diffuseTransmission?.diffuseTransmissionColorTexture as any, "diffuseTransmissionColor");
};

const GL_NEAREST = 9728;
const GL_LINEAR = 9729;
const GL_NEAREST_MIPMAP_NEAREST = 9984;
const GL_LINEAR_MIPMAP_NEAREST = 9985;
const GL_NEAREST_MIPMAP_LINEAR = 9986;
const GL_LINEAR_MIPMAP_LINEAR = 9987;
const GL_CLAMP_TO_EDGE = 33071;
const GL_MIRRORED_REPEAT = 33648;
const GL_REPEAT = 10497;
const GL_POINTS = 0;
const KHR_GAUSSIAN_SPLATTING = "KHR_gaussian_splatting";

const gltfWrapToAddressMode = (wrap: number | undefined): GPUAddressMode => {
    switch (wrap) {
        case GL_CLAMP_TO_EDGE: return "clamp-to-edge";
        case GL_MIRRORED_REPEAT: return "mirror-repeat";
        case GL_REPEAT:
        default:
            return "repeat";
    }
};

const gltfMagToFilterMode = (mag: number | undefined): GPUFilterMode => {
    switch (mag) {
        case GL_NEAREST: return "nearest";
        case GL_LINEAR:
        default:
            return "linear";
    }
};

const gltfMinToFilterModes = (min: number | undefined): { minFilter: GPUFilterMode; mipmapFilter: GPUMipmapFilterMode; useMipmaps: boolean } => {
    switch (min) {
        case GL_NEAREST: return { minFilter: "nearest", mipmapFilter: "nearest", useMipmaps: false };
        case GL_LINEAR: return { minFilter: "linear", mipmapFilter: "nearest", useMipmaps: false };
        case GL_NEAREST_MIPMAP_NEAREST: return { minFilter: "nearest", mipmapFilter: "nearest", useMipmaps: true };
        case GL_LINEAR_MIPMAP_NEAREST: return { minFilter: "linear", mipmapFilter: "nearest", useMipmaps: true };
        case GL_NEAREST_MIPMAP_LINEAR: return { minFilter: "nearest", mipmapFilter: "linear", useMipmaps: true };
        case GL_LINEAR_MIPMAP_LINEAR:
        default:
            return { minFilter: "linear", mipmapFilter: "linear", useMipmaps: true };
    }
};

const inferMimeTypeFromUri = (uri: string | undefined): string | undefined => {
    if (!uri) return undefined;
    const u = uri.toLowerCase();
    if (u.endsWith(".png")) return "image/png";
    if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
    if (u.endsWith(".webp")) return "image/webp";
    if (u.endsWith(".gif")) return "image/gif";
    return undefined;
};

const getSceneIndex = (json: GltfRoot, opts?: ImportGltfOptions): number => {
    if (opts?.sceneIndex !== undefined) return opts.sceneIndex | 0;
    if (json.scene !== undefined) return json.scene | 0;
    return 0;
};

const getKHRLightsFromRoot = (json: GltfRoot): KHRLightsPunctualRoot | null => {
    const ext = (json.extensions as unknown as Record<string, unknown> | undefined)?.["KHR_lights_punctual"];
    if (!ext) return null;
    return ext as KHRLightsPunctualRoot;
};

const getNodeKHRLight = (node: GltfNode): KHRLightsPunctualNode | null => {
    const ext = (node.extensions as unknown as Record<string, unknown> | undefined)?.["KHR_lights_punctual"];
    if (!ext) return null;
    return ext as KHRLightsPunctualNode;
};

const isMaterialUnlit = (mat: GltfMaterial): boolean => {
    const exts = mat.extensions as Record<string, unknown> | undefined;
    return !!exts?.["KHR_materials_unlit"];
};

const applyNodeMatrixViaWasmDecompose = (t: { setPosition(x:number,y:number,z:number): any; setRotation(x:number,y:number,z:number,w:number): any; setScale(x:number,y:number,z:number): any }, m: ArrayLike<number>): void => {
    const matPtr = wasm.allocF32(16) as WasmPtr;
    if (!matPtr) throw new Error("applyNodeMatrixViaWasmDecompose: matrix scratch allocation failed.");
    let trsPtr = 0 as WasmPtr;
    try {
        trsPtr = wasm.allocF32(10) as WasmPtr;
        if (!trsPtr) throw new Error("applyNodeMatrixViaWasmDecompose: TRS scratch allocation failed.");
        const mat = wasm.f32view(matPtr, 16);
        for (let i = 0; i < 16; i++) mat[i] = (m[i] ?? (i % 5 === 0 ? 1 : 0)) as number;
        mat4f.decomposeTRS(trsPtr, matPtr);
        const out = wasm.f32view(trsPtr, 10);
        t.setPosition(out[0]!, out[1]!, out[2]!);
        t.setRotation(out[3]!, out[4]!, out[5]!, out[6]!);
        t.setScale(out[7]!, out[8]!, out[9]!);
    } finally {
        if (trsPtr) wasm.freeF32(trsPtr, 10);
        wasm.freeF32(matPtr, 16);
    }
};

type GltfMetadataSource = {
    name?: string;
    extras?: GltfExtras;
    extensions?: GltfExtensions;
};

const getXmpPacketIndex = (source: { extensions?: GltfExtensions } | undefined | null): number | null => {
    const ext = source?.extensions?.["KHR_xmp_json_ld"] as { packet?: number } | undefined;
    return typeof ext?.packet === "number" ? ext.packet : null;
};

const resolveXmpPacket = (packets: readonly unknown[], source: { extensions?: GltfExtensions } | undefined | null): unknown | null => {
    const packetIndex = getXmpPacketIndex(source);
    return packetIndex !== null && packetIndex >= 0 && packetIndex < packets.length ? packets[packetIndex] : null;
};

const buildMetadataRecord = (index: number, source: GltfMetadataSource | undefined | null, packets: readonly unknown[] = []): GltfImportMetadataRecord => {
    return {
        index,
        name: source?.name,
        extras: source?.extras,
        extensions: source?.extensions,
        xmp: resolveXmpPacket(packets, source)
    };
};

const buildMeshMetadata = (index: number, mesh: GltfMesh, packets: readonly unknown[]): GltfImportMeshMetadata => {
    return {
        ...buildMetadataRecord(index, mesh, packets),
        primitives: mesh.primitives.map((primitive, primitiveIndex) => ({
            ...buildMetadataRecord(primitiveIndex, primitive, packets),
            material: primitive.material
        }))
    };
};

type GltfVariantRegistration = {
    mesh: Mesh;
    baselineMaterial: Material;
    variants: Map<number, Material>;
    retainedMaterials: Material[];
};

type GltfVariantController = {
    public: GltfImportVariantsMetadata;
    register(mesh: Mesh, baselineMaterial: Material, variants?: Map<number, Material>): void;
    destroy(): void;
};

const GLTF_EXTENSION_SUPPORT_STATES: Record<string, GltfImportExtensionSupportState> = {
    KHR_lights_punctual: "supported",
    KHR_mesh_quantization: "supported",
    KHR_materials_unlit: "supported",
    KHR_materials_emissive_strength: "supported",
    KHR_materials_pbrSpecularGlossiness: "partial",
    KHR_materials_clearcoat: "supported",
    KHR_materials_transmission: "supported",
    KHR_materials_volume: "supported",
    KHR_materials_diffuse_transmission: "supported",
    KHR_materials_dispersion: "supported",
    KHR_materials_specular: "supported",
    KHR_materials_sheen: "supported",
    KHR_materials_iridescence: "supported",
    KHR_materials_anisotropy: "supported",
    KHR_materials_ior: "supported",
    KHR_materials_variants: "supported",
    KHR_gaussian_splatting: "partial",
    KHR_node_visibility: "supported",
    KHR_animation_pointer: "partial",
    KHR_xmp_json_ld: "supported",
    KHR_draco_mesh_compression: "deferred",
    KHR_texture_basisu: "deferred",
    KHR_texture_transform: "supported",
    EXT_mesh_gpu_instancing: "deferred",
    EXT_meshopt_compression: "deferred",
    EXT_texture_webp: "deferred"
};

const KHR_ANIMATION_POINTER = "KHR_animation_pointer";
const KHR_GAUSSIAN_SPLATTING_EXTENSION = "KHR_gaussian_splatting";
const KHR_DRACO_MESH_COMPRESSION = "KHR_draco_mesh_compression";
const KHR_TEXTURE_BASISU = "KHR_texture_basisu";
const EXT_MESH_GPU_INSTANCING = "EXT_mesh_gpu_instancing";
const EXT_MESHOPT_COMPRESSION = "EXT_meshopt_compression";
const EXT_TEXTURE_WEBP = "EXT_texture_webp";

const GLTF_EXTENSION_SUPPORT_RANK: Record<GltfImportExtensionSupportState, number> = {
    supported: 0,
    partial: 1,
    deferred: 2,
    unsupported: 3
};

type ExtensionAssessment = {
    state: GltfImportExtensionSupportState;
    reason?: string;
};

const getExtension = (source: { extensions?: GltfExtensions } | undefined, name: string): unknown => source?.extensions?.[name];

const pointerTokens = (pointer: unknown): string[] | null => {
    if (typeof pointer !== "string") return null;
    if (pointer === "") return [];
    if (!pointer.startsWith("/")) return null;
    return pointer.slice(1).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
};

const pointerIndex = (tokens: readonly string[], index: number): number | null => {
    const token = tokens[index];
    if (token === undefined || !/^(0|[1-9]\d*)$/.test(token)) return null;
    const value = Number(token);
    return Number.isSafeInteger(value) ? value : null;
};

const accessorComponentCount = (type: string | undefined): number | null => {
    switch (type) {
        case "SCALAR": return 1;
        case "VEC2": return 2;
        case "VEC3": return 3;
        case "VEC4": return 4;
        case "MAT2": return 4;
        case "MAT3": return 9;
        case "MAT4": return 16;
        default: return null;
    }
};

type PointerShape = {
    valueSize: number | null;
    requiresStep?: boolean;
};

type AnimationPointerRuntimeTargets = {
    morphTargetCounts: Map<number, number>;
    materials: Set<number>;
    cameras: Set<number>;
    lights: Set<number>;
};

const getAnimationPointerRuntimeTargets = (json: GltfRoot, opts: ImportGltfOptions): AnimationPointerRuntimeTargets => {
    const targets: AnimationPointerRuntimeTargets = { morphTargetCounts: new Map(), materials: new Set(), cameras: new Set(), lights: new Set() };
    const sceneIndex = getSceneIndex(json, opts);
    const visited = new Set<number>();
    const visit = (nodeIndex: number): void => {
        if (visited.has(nodeIndex)) return;
        visited.add(nodeIndex);
        const node = json.nodes?.[nodeIndex];
        if (!node) return;
        if (opts.importCameras && node.camera !== undefined) {
            const camera = json.cameras?.[node.camera];
            const hasRuntimeCamera = camera?.type === "perspective" && !!camera.perspective || camera?.type === "orthographic" && !!camera.orthographic;
            if (hasRuntimeCamera) targets.cameras.add(node.camera);
        }
        if (opts.importLights) {
            const nodeLight = getNodeKHRLight(node);
            const light = nodeLight ? getKHRLightsFromRoot(json)?.lights?.[nodeLight.light] : undefined;
            if (nodeLight && light && (light.type === "directional" || light.type === "point" || light.type === "spot")) targets.lights.add(nodeLight.light);
        }
        const mesh = node.mesh !== undefined ? json.meshes?.[node.mesh] : undefined;
        for (const primitive of mesh?.primitives ?? []) {
            const mode = primitive.mode ?? 4;
            const positionIndex = primitive.attributes?.POSITION;
            if (getExtension(primitive, KHR_GAUSSIAN_SPLATTING_EXTENSION) !== undefined || (mode !== 4 && mode !== 5 && mode !== 6) || positionIndex === undefined || !json.accessors?.[positionIndex]) continue;
            const morphTargetCount = primitive.targets?.length ?? 0;
            if (morphTargetCount > (targets.morphTargetCounts.get(nodeIndex) ?? 0)) targets.morphTargetCounts.set(nodeIndex, morphTargetCount);
            if (primitive.material !== undefined && json.materials?.[primitive.material]) targets.materials.add(primitive.material);
            const variants = getExtension(primitive, "KHR_materials_variants") as { mappings?: Array<{ material?: unknown }> } | undefined;
            for (const mapping of Array.isArray(variants?.mappings) ? variants.mappings : []) if (typeof mapping.material === "number" && Number.isFinite(mapping.material) && json.materials?.[mapping.material | 0]) targets.materials.add(mapping.material | 0);
        }
        for (const child of node.children ?? []) visit(child);
    };
    for (const root of json.scenes?.[sceneIndex]?.nodes ?? []) visit(root);
    return targets;
};

const getMaterialPointerShape = (json: GltfRoot, tokens: readonly string[], targets: AnimationPointerRuntimeTargets): PointerShape | null => {
    const materialIndex = pointerIndex(tokens, 1);
    const material = materialIndex !== null ? json.materials?.[materialIndex] : undefined;
    if (materialIndex === null || !material || !targets.materials.has(materialIndex)) return null;
    const unlit = isMaterialUnlit(material);
    const pbr = material.pbrMetallicRoughness;
    if (tokens[2] === "pbrMetallicRoughness") {
        if (!pbr) return null;
        if (tokens.length === 4 && tokens[3] === "baseColorFactor") return { valueSize: 4 };
        if (!unlit && tokens.length === 4 && (tokens[3] === "metallicFactor" || tokens[3] === "roughnessFactor")) return { valueSize: 1 };
        if (tokens.length === 7 && tokens[4] === "extensions" && tokens[5] === "KHR_texture_transform") {
            const info = (pbr as Record<string, unknown>)[tokens[3]!] as { extensions?: GltfExtensions } | undefined;
            if ((!unlit || tokens[3] === "baseColorTexture") && getExtension(info, "KHR_texture_transform") && (tokens[6] === "rotation" || tokens[6] === "offset" || tokens[6] === "scale")) return { valueSize: tokens[6] === "rotation" ? 1 : 2 };
        }
        return null;
    }
    if (tokens.length === 3 && tokens[2] === "alphaCutoff") return { valueSize: 1 };
    if (unlit) return null;
    if (tokens.length === 3 && tokens[2] === "emissiveFactor") return { valueSize: 3 };
    if (tokens.length === 4 && tokens[2] === "normalTexture" && tokens[3] === "scale" && material.normalTexture) return { valueSize: 1 };
    if (tokens.length === 4 && tokens[2] === "occlusionTexture" && tokens[3] === "strength" && material.occlusionTexture) return { valueSize: 1 };
    if (tokens.length === 6 && tokens[3] === "extensions" && tokens[4] === "KHR_texture_transform") {
        const info = (material as Record<string, unknown>)[tokens[2]!] as { extensions?: GltfExtensions } | undefined;
        if (getExtension(info, "KHR_texture_transform") && (tokens[5] === "rotation" || tokens[5] === "offset" || tokens[5] === "scale")) return { valueSize: tokens[5] === "rotation" ? 1 : 2 };
    }
    if (tokens[2] !== "extensions" || tokens.length < 5 || !material.extensions?.[tokens[3]!]) return null;
    const extensionProperties: Record<string, Record<string, number>> = {
        KHR_materials_anisotropy: { anisotropyStrength: 1, anisotropyRotation: 1 },
        KHR_materials_clearcoat: { clearcoatFactor: 1, clearcoatRoughnessFactor: 1 },
        KHR_materials_dispersion: { dispersion: 1 },
        KHR_materials_emissive_strength: { emissiveStrength: 1 },
        KHR_materials_ior: { ior: 1 },
        KHR_materials_iridescence: { iridescenceFactor: 1, iridescenceIor: 1, iridescenceThicknessMinimum: 1, iridescenceThicknessMaximum: 1 },
        KHR_materials_sheen: { sheenColorFactor: 3, sheenRoughnessFactor: 1 },
        KHR_materials_specular: { specularFactor: 1, specularColorFactor: 3 },
        KHR_materials_transmission: { transmissionFactor: 1 },
        KHR_materials_volume: { thicknessFactor: 1, attenuationDistance: 1, attenuationColor: 3 },
        KHR_materials_diffuse_transmission: { diffuseTransmissionFactor: 1, diffuseTransmissionColorFactor: 3 }
    };
    const property = extensionProperties[tokens[3]!]?.[tokens[4]!];
    if (tokens.length === 5 && property !== undefined) return { valueSize: property };
    if (tokens.length === 6 && tokens[5] === "scale" && tokens[3] === "KHR_materials_clearcoat" && tokens[4] === "clearcoatNormalTexture") return { valueSize: 1 };
    if (tokens.length === 8 && tokens[5] === "extensions" && tokens[6] === "KHR_texture_transform") {
        const extension = material.extensions[tokens[3]!] as Record<string, unknown>;
        const info = extension?.[tokens[4]!] as { extensions?: GltfExtensions } | undefined;
        if (getExtension(info, "KHR_texture_transform") && (tokens[7] === "rotation" || tokens[7] === "offset" || tokens[7] === "scale")) return { valueSize: tokens[7] === "rotation" ? 1 : 2 };
    }
    return null;
};

const getAnimationPointerShape = (json: GltfRoot, tokens: readonly string[], opts: ImportGltfOptions, targets: AnimationPointerRuntimeTargets): PointerShape | null => {
    if (tokens[0] === "nodes") {
        const nodeIndex = pointerIndex(tokens, 1);
        const node = nodeIndex !== null ? json.nodes?.[nodeIndex] : undefined;
        if (nodeIndex === null || !node) return null;
        if (tokens.length === 3 && tokens[2] === "translation") return { valueSize: 3 };
        if (tokens.length === 3 && (tokens[2] === "rotation" || tokens[2] === "scale")) return node.matrix ? null : { valueSize: tokens[2] === "rotation" ? 4 : 3 };
        const targetCount = targets.morphTargetCounts.get(nodeIndex) ?? 0;
        if (tokens.length === 3 && tokens[2] === "weights") return targetCount > 0 ? { valueSize: targetCount } : null;
        if (tokens.length === 4 && tokens[2] === "weights") {
            const weightIndex = pointerIndex(tokens, 3);
            return weightIndex !== null && weightIndex < targetCount ? { valueSize: 1 } : null;
        }
        if (tokens.length === 5 && tokens[2] === "extensions" && tokens[3] === "KHR_node_visibility" && tokens[4] === "visible") return getExtension(node, "KHR_node_visibility") ? { valueSize: 1, requiresStep: true } : null;
        return null;
    }
    if (tokens[0] === "materials") return getMaterialPointerShape(json, tokens, targets);
    if (tokens[0] === "cameras") {
        if (!opts.importCameras) return null;
        const cameraIndex = pointerIndex(tokens, 1);
        const camera = cameraIndex !== null ? json.cameras?.[cameraIndex] : undefined;
        if (cameraIndex === null || !camera || !targets.cameras.has(cameraIndex) || tokens.length !== 4) return null;
        const family = tokens[2];
        const property = tokens[3];
        if (family === "perspective" && camera.type === "perspective" && camera.perspective && ["yfov", "znear", "zfar", "aspectRatio"].includes(property)) {
            if ((property === "aspectRatio" || property === "zfar") && camera.perspective?.[property] === undefined) return null;
            return { valueSize: 1 };
        }
        if (family === "orthographic" && camera.type === "orthographic" && camera.orthographic && ["xmag", "ymag", "znear", "zfar"].includes(property)) return { valueSize: 1 };
        return null;
    }
    if (tokens[0] === "extensions" && tokens[1] === "KHR_lights_punctual" && tokens[2] === "lights") {
        if (!opts.importLights) return null;
        const lightIndex = pointerIndex(tokens, 3);
        const root = getExtension(json, "KHR_lights_punctual") as KHRLightsPunctualRoot | undefined;
        const light = lightIndex !== null ? root?.lights?.[lightIndex] : undefined;
        if (lightIndex === null || !light || !targets.lights.has(lightIndex)) return null;
        if (tokens.length === 5 && ["color", "intensity"].includes(tokens[4]!)) return { valueSize: tokens[4] === "color" ? 3 : 1 };
        if (tokens.length === 5 && tokens[4] === "range" && (light.type === "point" || light.type === "spot")) return { valueSize: 1 };
        if (tokens.length === 6 && tokens[4] === "spot" && light.type === "spot" && ["innerConeAngle", "outerConeAngle"].includes(tokens[5]!)) return { valueSize: 1 };
    }
    return null;
};

const assessAnimationPointers = (json: GltfRoot, opts: ImportGltfOptions): ExtensionAssessment => {
    let occurrenceCount = 0;
    let unsupportedReason: string | undefined;
    const targets = getAnimationPointerRuntimeTargets(json, opts);
    for (let animationIndex = 0; animationIndex < (json.animations?.length ?? 0); animationIndex++) {
        const animation = json.animations![animationIndex]!;
        for (let channelIndex = 0; channelIndex < animation.channels.length; channelIndex++) {
            const channel = animation.channels[channelIndex]!;
            if (channel.target.path !== "pointer") continue;
            occurrenceCount++;
            const pointer = (channel.target.extensions?.[KHR_ANIMATION_POINTER] as { pointer?: unknown } | undefined)?.pointer;
            const tokens = pointerTokens(pointer);
            const targetShape = tokens ? getAnimationPointerShape(json, tokens, opts, targets) : null;
            const sampler = animation.samplers[channel.sampler];
            const input = sampler ? json.accessors?.[sampler.input] : undefined;
            const output = sampler ? json.accessors?.[sampler.output] : undefined;
            const interpolation = sampler?.interpolation ?? "LINEAR";
            const componentCount = accessorComponentCount(output?.type);
            const expectedOutputCount = input ? input.count * (interpolation === "CUBICSPLINE" ? 3 : 1) : -1;
            const outputCount = output?.count ?? -1;
            const validInterpolation = interpolation === "LINEAR" || interpolation === "STEP" || interpolation === "CUBICSPLINE";
            const validInput = input?.type === "SCALAR" && input.componentType === 5126;
            const actualValueSize = validInput && validInterpolation && componentCount !== null && input && expectedOutputCount > 0 && outputCount >= 0 && outputCount % expectedOutputCount === 0 ? componentCount * (outputCount / expectedOutputCount) : null;
            const valueSize = actualValueSize;
            const shapeMatches = channel.target.node === undefined && !!targetShape && (targetShape.valueSize === null || targetShape.valueSize === valueSize) && (!targetShape.requiresStep || interpolation === "STEP");
            if (!shapeMatches) unsupportedReason ??= `animation ${animationIndex} channel ${channelIndex} has an unsupported pointer target or sampler shape`;
        }
    }
    if (occurrenceCount === 0) return { state: "partial", reason: "no implemented pointer occurrence was found" };
    return unsupportedReason ? { state: "partial", reason: unsupportedReason } : { state: "supported" };
};

const assessGaussianSplatting = (json: GltfRoot): ExtensionAssessment => {
    let occurrenceCount = 0;
    let unsupportedReason: string | undefined;
    const requiredAttributes: Array<{ semantic: string; type: string; supportedEncoding: (componentType: number, normalized: boolean) => boolean }> = [
        { semantic: "POSITION", type: "VEC3", supportedEncoding: isFloatNonNormalizedEncoding },
        { semantic: "KHR_gaussian_splatting:ROTATION", type: "VEC4", supportedEncoding: (componentType, normalized) => isFloatEncoding(componentType) || isNormalizedSignedByteOrShort(componentType, normalized) },
        { semantic: "KHR_gaussian_splatting:SCALE", type: "VEC3", supportedEncoding: (componentType) => isFloatEncoding(componentType) || isUnsignedByteOrShort(componentType) },
        { semantic: "KHR_gaussian_splatting:OPACITY", type: "SCALAR", supportedEncoding: (componentType, normalized) => isFloatEncoding(componentType) || isNormalizedUnsignedByteOrShort(componentType, normalized) },
        { semantic: "KHR_gaussian_splatting:SH_DEGREE_0_COEF_0", type: "VEC3", supportedEncoding: isFloatNonNormalizedEncoding }
    ];
    for (let meshIndex = 0; meshIndex < (json.meshes?.length ?? 0); meshIndex++) {
        const mesh = json.meshes![meshIndex]!;
        for (let primitiveIndex = 0; primitiveIndex < mesh.primitives.length; primitiveIndex++) {
            const primitive = mesh.primitives[primitiveIndex]!;
            const extension = getExtension(primitive, KHR_GAUSSIAN_SPLATTING_EXTENSION) as Record<string, unknown> | undefined;
            if (extension === undefined) continue;
            occurrenceCount++;
            const mode = primitive.mode ?? 4;
            let reason: string | undefined;
            if (!extension || Array.isArray(extension)) reason = "extension object is required.";
            else if (extension.kernel !== "ellipse") reason = `kernel '${String(extension.kernel)}' is not supported; expected 'ellipse'`;
            else if (extension.colorSpace !== "lin_rec709_display" && extension.colorSpace !== "srgb_rec709_display") reason = `colorSpace '${String(extension.colorSpace)}' is not supported`;
            else if (extension.projection !== undefined && extension.projection !== "perspective") reason = `projection '${String(extension.projection)}' is not supported; expected 'perspective'`;
            else if (extension.sortingMethod !== undefined && extension.sortingMethod !== "cameraDistance") reason = `sortingMethod '${String(extension.sortingMethod)}' is not supported; expected 'cameraDistance'`;
            else if (mode !== 0) reason = `primitive mode must be POINTS (0), got ${mode}.`;
            else {
                const attributes = primitive.attributes as GltfPrimitiveAttributes | undefined;
                let sourceCount: number | null = null;
                for (const { semantic, type, supportedEncoding } of requiredAttributes) {
                    const accessorIndex = attributes?.[semantic];
                    const accessor = typeof accessorIndex === "number" ? json.accessors?.[accessorIndex] : undefined;
                    if (accessorIndex === undefined) { reason = `missing required attribute '${semantic}'.`; break; }
                    if (!accessor) { reason = `attribute '${semantic}' references missing accessor ${accessorIndex}.`; break; }
                    if (accessor.type !== type) { reason = `attribute '${semantic}' must use accessor type ${type}, got ${accessor.type}.`; break; }
                    if (!supportedEncoding(accessor.componentType, accessor.normalized === true)) { reason = `attribute '${semantic}' has unsupported accessor encoding componentType=${accessor.componentType} normalized=${accessor.normalized === true}.`; break; }
                    if (sourceCount === null) sourceCount = accessor.count;
                    else if (accessor.count !== sourceCount) { reason = `attribute '${semantic}' count ${accessor.count} does not match POSITION count ${sourceCount}.`; break; }
                }
                if (!reason && attributes && sourceCount !== null) {
                    try {
                        const sh0Accessor = attributes["KHR_gaussian_splatting:SH_DEGREE_0_COEF_0"]!;
                        const shAttributes = resolveGaussianSplatSHAttributes(attributes, sh0Accessor, `mesh ${meshIndex} primitive ${primitiveIndex}`);
                        for (const [semantic, accessorIndex] of shAttributes.accessors) {
                            const accessor = json.accessors?.[accessorIndex];
                            if (!accessor) { reason = `attribute '${semantic}' references missing accessor ${accessorIndex}.`; break; }
                            if (accessor.type !== "VEC3") { reason = `attribute '${semantic}' must use accessor type VEC3, got ${accessor.type}.`; break; }
                            if (!isFloatNonNormalizedEncoding(accessor.componentType, accessor.normalized === true)) { reason = `attribute '${semantic}' has unsupported accessor encoding componentType=${accessor.componentType} normalized=${accessor.normalized === true}.`; break; }
                            if (accessor.count !== sourceCount) { reason = `attribute '${semantic}' count ${accessor.count} does not match POSITION count ${sourceCount}.`; break; }
                        }
                    } catch (error) { reason = error instanceof Error ? error.message : String(error); }
                }
            }
            if (reason) unsupportedReason ??= `mesh ${meshIndex} primitive ${primitiveIndex}: ${reason}`;
        }
    }
    if (occurrenceCount === 0) return { state: "partial", reason: "no implemented Gaussian splat occurrence was found" };
    return unsupportedReason ? { state: "partial", reason: unsupportedReason } : { state: "supported" };
};

const getMaterialTextureCombinationLosses = (material: GltfMaterial, materialIndex: number): Array<{ name: string; reason: string }> => {
    const losses: Array<{ name: string; reason: string }> = [];
    const extensions = material.extensions as Record<string, any> | undefined;
    const transmissionFactor = Number(extensions?.KHR_materials_transmission?.transmissionFactor ?? 0);
    const diffuseTransmissionFactor = Number(extensions?.KHR_materials_diffuse_transmission?.diffuseTransmissionFactor ?? 0);
    if (!(transmissionFactor > 0 || diffuseTransmissionFactor > 0)) return losses;
    if (extensions?.KHR_materials_sheen?.sheenColorTexture || extensions?.KHR_materials_sheen?.sheenRoughnessTexture) losses.push({ name: "KHR_materials_sheen", reason: `material ${materialIndex} uses sheen textures in the current transmission layout, where those bindings are unavailable` });
    if (extensions?.KHR_materials_iridescence?.iridescenceTexture || extensions?.KHR_materials_iridescence?.iridescenceThicknessTexture) losses.push({ name: "KHR_materials_iridescence", reason: `material ${materialIndex} uses iridescence textures in the current transmission layout, where those bindings are unavailable` });
    if (extensions?.KHR_materials_anisotropy?.anisotropyTexture) losses.push({ name: "KHR_materials_anisotropy", reason: `material ${materialIndex} uses an anisotropy texture in the current transmission layout, where that binding is unavailable` });
    return losses;
};

const assessMaterialTextureCombinations = (json: GltfRoot): Map<string, ExtensionAssessment> => {
    const assessments = new Map<string, ExtensionAssessment>();
    for (let materialIndex = 0; materialIndex < (json.materials?.length ?? 0); materialIndex++) for (const { name, reason } of getMaterialTextureCombinationLosses(json.materials![materialIndex]!, materialIndex)) if (!assessments.has(name)) assessments.set(name, { state: "partial", reason });
    return assessments;
};

const assessAssetExtensions = (json: GltfRoot, opts: ImportGltfOptions): Map<string, ExtensionAssessment> => {
    const assessments = new Map<string, ExtensionAssessment>();
    if ((json.extensionsUsed ?? []).includes(KHR_ANIMATION_POINTER) || (json.extensionsRequired ?? []).includes(KHR_ANIMATION_POINTER)) assessments.set(KHR_ANIMATION_POINTER, assessAnimationPointers(json, opts));
    if ((json.extensionsUsed ?? []).includes(KHR_GAUSSIAN_SPLATTING_EXTENSION) || (json.extensionsRequired ?? []).includes(KHR_GAUSSIAN_SPLATTING_EXTENSION)) assessments.set(KHR_GAUSSIAN_SPLATTING_EXTENSION, assessGaussianSplatting(json));
    for (const [name, assessment] of assessMaterialTextureCombinations(json)) assessments.set(name, assessment);
    return assessments;
};

const buildExtensionsMetadata = (json: GltfRoot, opts: ImportGltfOptions): { metadata: GltfImportExtensionsMetadata; assessments: Map<string, ExtensionAssessment> } => {
    const used = [...(json.extensionsUsed ?? [])];
    const required = [...(json.extensionsRequired ?? [])];
    const names = new Set<string>([...used, ...required]);
    const support: Record<string, GltfImportExtensionSupportState> = {};
    for (const name of names) support[name] = GLTF_EXTENSION_SUPPORT_STATES[name] ?? "unsupported";
    const assessments = assessAssetExtensions(json, opts);
    for (const [name, assessment] of assessments) support[name] = assessment.state;
    return { metadata: { used, required, support }, assessments };
};

const markExtensionSupport = (extensions: GltfImportExtensionsMetadata, name: string, state: GltfImportExtensionSupportState): void => { const current = extensions.support[name]; if (!current || GLTF_EXTENSION_SUPPORT_RANK[state] > GLTF_EXTENSION_SUPPORT_RANK[current]) extensions.support[name] = state; };

const isExtensionRequired = (json: GltfRoot, name: string): boolean => (json.extensionsRequired ?? []).includes(name);

const reportAnimationPointerLoss = (json: GltfRoot, extensions: GltfImportExtensionsMetadata, opts: ImportGltfOptions, message: string): void => {
    markExtensionSupport(extensions, KHR_ANIMATION_POINTER, "partial");
    if (isExtensionRequired(json, KHR_ANIMATION_POINTER)) throw new Error(`Required glTF extension '${KHR_ANIMATION_POINTER}' cannot be imported without semantic loss: ${message}`);
    warn(opts, `${KHR_ANIMATION_POINTER}: ${message}`);
};

const enforceRequiredExtensions = (json: GltfRoot, extensions: GltfImportExtensionsMetadata, assessments: Map<string, ExtensionAssessment>): void => {
    for (const name of json.extensionsRequired ?? []) {
        const state = extensions.support[name] ?? "unsupported";
        if (state === "supported") continue;
        const reason = assessments.get(name)?.reason;
        if (state === "deferred") throw new Error(`Required glTF extension '${name}' is deferred: WasmGPU does not implement its defining behavior${reason ? ` (${reason})` : ""}.`);
        throw new Error(`Required glTF extension '${name}' is ${state} for this asset and cannot be imported without semantic loss${reason ? `: ${reason}` : "."}`);
    }
};

const buildXmpMetadata = (json: GltfRoot): GltfImportXmpMetadata => {
    const rootExt = (json.extensions as Record<string, unknown> | undefined)?.["KHR_xmp_json_ld"] as { packets?: unknown[] } | undefined;
    const packets = Array.isArray(rootExt?.packets) ? [...rootExt.packets] : [];
    const packet = resolveXmpPacket(packets, json.asset);
    return { packets, packet };
};

const createVariantsController = (initialItems: GltfImportVariantItem[] = []): GltfVariantController => {
    const items = [...initialItems];
    const registrations: GltfVariantRegistration[] = [];
    let activeIndex: number | null = null;
    const ensureKnownItem = (index: number): void => {
        if (items.some((item) => item.index === index)) return;
        items.push({ index, name: `variant_${index}` });
        items.sort((a, b) => a.index - b.index);
    };
    const findItemByName = (name: string): GltfImportVariantItem | undefined => items.find((item) => item.name === name);
    const getActiveName = (): string | null => activeIndex === null ? null : items.find((item) => item.index === activeIndex)?.name ?? `variant_${activeIndex}`;
    const applyVariant = (index: number | null): void => {
        activeIndex = index;
        for (const registration of registrations) {
            if (registration.mesh.destroyed) continue;
            const nextMaterial = index !== null ? registration.variants.get(index) ?? registration.baselineMaterial : registration.baselineMaterial;
            if (registration.mesh.material === nextMaterial) continue;
            nextMaterial.retain();
            registration.mesh.setMaterial(nextMaterial);
        }
    };
    return {
        public: {
            get items(): GltfImportVariantItem[] { return items.map((item) => ({ ...item })); },
            get names(): string[] { return items.map((item) => item.name ?? `variant_${item.index}`); },
            get activeName(): string | null { return getActiveName(); },
            get activeIndex(): number | null { return activeIndex; },
            setActive(name: string | null): void {
                if (name === null) {
                    applyVariant(null);
                    return;
                }
                const item = findItemByName(name);
                if (!item) throw new Error(`glTF variants: unknown variant '${name}'.`);
                applyVariant(item.index);
            },
            setActiveIndex(index: number | null): void {
                if (index === null) {
                    applyVariant(null);
                    return;
                }
                if (!items.some((item) => item.index === index)) throw new Error(`glTF variants: unknown variant index ${index}.`);
                applyVariant(index);
            },
            clear(): void { applyVariant(null); }
        },
        register(mesh: Mesh, baselineMaterial: Material, variants: Map<number, Material> = new Map()): void {
            if (variants.size === 0) return;
            const retainedMaterials = Array.from(new Set([baselineMaterial, ...variants.values()]));
            for (const material of retainedMaterials) material.retain();
            registrations.push({ mesh, baselineMaterial, variants, retainedMaterials });
            for (const index of variants.keys()) ensureKnownItem(index);
            if (activeIndex !== null) applyVariant(activeIndex);
        },
        destroy(): void {
            for (const registration of registrations) for (const material of registration.retainedMaterials) material.release();
            registrations.length = 0;
        }
    };
};

const getDeclaredVariants = (json: GltfRoot, packets: readonly unknown[]): GltfImportVariantItem[] => {
    const rootExt = (json.extensions as Record<string, unknown> | undefined)?.["KHR_materials_variants"] as { variants?: Array<{ name?: string; extras?: GltfExtras; extensions?: GltfExtensions }> } | undefined;
    const variants = Array.isArray(rootExt?.variants) ? rootExt.variants : [];
    return variants.map((variant, index) => ({
        ...buildMetadataRecord(index, variant, packets),
        name: variant?.name ?? `variant_${index}`
    }));
};

const buildImportMetadata = (json: GltfRoot, sceneIndex: number, extensions: GltfImportExtensionsMetadata, xmp: GltfImportXmpMetadata, variants: GltfImportVariantsMetadata): GltfImportMetadata => {
    const scene = json.scenes?.[sceneIndex];
    const packets = xmp.packets;
    return {
        asset: buildMetadataRecord(0, json.asset, packets),
        scene: scene ? buildMetadataRecord(sceneIndex, scene, packets) : null,
        nodes: (json.nodes ?? []).map((node, index) => buildMetadataRecord(index, node, packets)),
        meshes: (json.meshes ?? []).map((mesh, index) => buildMeshMetadata(index, mesh, packets)),
        materials: (json.materials ?? []).map((material, index) => buildMetadataRecord(index, material, packets)),
        textures: (json.textures ?? []).map((texture, index) => buildMetadataRecord(index, texture, packets)),
        images: (json.images ?? []).map((image, index) => buildMetadataRecord(index, image, packets)),
        cameras: (json.cameras ?? []).map((camera, index) => buildMetadataRecord(index, camera, packets)),
        skins: (json.skins ?? []).map((skin, index) => buildMetadataRecord(index, skin, packets)),
        animations: (json.animations ?? []).map((animation, index) => buildMetadataRecord(index, animation, packets)),
        extensions, xmp, variants
    };
};

const resolveMorphWeights = (weights: ReadonlyArray<number> | undefined, targetCount: number, opts: ImportGltfOptions | undefined, context: string): Float32Array => {
    const out = new Float32Array(targetCount);
    if (!weights || targetCount <= 0) return out;
    const srcCount = weights.length | 0;
    const copyCount = Math.min(srcCount, targetCount);
    for (let i = 0; i < copyCount; i++) out[i] = Number(weights[i] ?? 0) || 0;
    if (srcCount < targetCount) warn(opts, `${context}: morph weights length ${srcCount} is smaller than target count ${targetCount}; padding with zeros.`);
    else if (srcCount > targetCount) warn(opts, `${context}: morph weights length ${srcCount} exceeds target count ${targetCount}; truncating extra values.`);
    return out;
};

const normalizeWeightsTo4 = (weights: Float32Array): Float32Array => {
    const out = new Float32Array(weights);
    for (let i = 0; i < out.length; i += 4) {
        const w0 = out[i + 0] ?? 0;
        const w1 = out[i + 1] ?? 0;
        const w2 = out[i + 2] ?? 0;
        const w3 = out[i + 3] ?? 0;
        const sum = w0 + w1 + w2 + w3;
        if (sum > 0) {
            const inv = 1 / sum;
            out[i + 0] = w0 * inv;
            out[i + 1] = w1 * inv;
            out[i + 2] = w2 * inv;
            out[i + 3] = w3 * inv;
        } else {
            out[i + 0] = 1;
            out[i + 1] = 0;
            out[i + 2] = 0;
            out[i + 3] = 0;
        }
    }
    return out;
};

const normalizeWeightsTo8 = (weights0: Float32Array, weights1: Float32Array): { weights0: Float32Array; weights1: Float32Array } => {
    const out0 = new Float32Array(weights0);
    const out1 = new Float32Array(weights1);
    for (let i = 0; i < out0.length; i += 4) {
        const w0 = out0[i + 0] ?? 0;
        const w1 = out0[i + 1] ?? 0;
        const w2 = out0[i + 2] ?? 0;
        const w3 = out0[i + 3] ?? 0;
        const w4 = out1[i + 0] ?? 0;
        const w5 = out1[i + 1] ?? 0;
        const w6 = out1[i + 2] ?? 0;
        const w7 = out1[i + 3] ?? 0;
        const sum = w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7;
        if (sum > 0) {
            const inv = 1 / sum;
            out0[i + 0] = w0 * inv;
            out0[i + 1] = w1 * inv;
            out0[i + 2] = w2 * inv;
            out0[i + 3] = w3 * inv;
            out1[i + 0] = w4 * inv;
            out1[i + 1] = w5 * inv;
            out1[i + 2] = w6 * inv;
            out1[i + 3] = w7 * inv;
        } else {
            out0[i + 0] = 1;
            out0[i + 1] = 0;
            out0[i + 2] = 0;
            out0[i + 3] = 0;
            out1[i + 0] = 0;
            out1[i + 1] = 0;
            out1[i + 2] = 0;
            out1[i + 3] = 0;
        }
    }
    return { weights0: out0, weights1: out1 };
};

const triangulateStrip = (indices: Uint32Array): Uint32Array => {
    const tris: number[] = [];
    for (let i = 0; i + 2 < indices.length; i++) {
        const a = indices[i]!;
        const b = indices[i + 1]!;
        const c = indices[i + 2]!;
        if (a === b || b === c || a === c) continue;
        if ((i & 1) === 0) tris.push(a, b, c);
        else tris.push(b, a, c);
    }
    return new Uint32Array(tris);
};

const triangulateFan = (indices: Uint32Array): Uint32Array => {
    const tris: number[] = [];
    if (indices.length < 3) return new Uint32Array(0);
    const a0 = indices[0]!;
    for (let i = 1; i + 1 < indices.length; i++) {
        const b = indices[i]!;
        const c = indices[i + 1]!;
        if (a0 === b || b === c || a0 === c) continue;
        tris.push(a0, b, c);
    }
    return new Uint32Array(tris);
};

const getMaterialTangentTexCoords = (mat: GltfMaterial | undefined): number[] => {
    if (!mat || isMaterialUnlit(mat)) return [];
    const texCoords: number[] = [];
    const addTexCoord = (texCoord: number): void => {
        const resolvedTexCoord = texCoord === 1 ? 1 : 0;
        if (!texCoords.includes(resolvedTexCoord)) texCoords.push(resolvedTexCoord);
    };
    const addInfo = (info: any | undefined): void => {
        if (!info) return;
        addTexCoord(getTextureInfoTexCoord(info));
    };
    addInfo(mat.normalTexture as any);
    const clearcoat = (mat.extensions as any)?.KHR_materials_clearcoat as any;
    addInfo(clearcoat?.clearcoatNormalTexture);
    const anisotropy = (mat.extensions as any)?.KHR_materials_anisotropy as any;
    if (anisotropy?.anisotropyTexture) addInfo(anisotropy.anisotropyTexture);
    else if (anisotropy && texCoords.length === 0) addTexCoord(0);
    return texCoords;
};

const getOrCreateMaterial = (doc: GltfDocument, json: GltfRoot, materialIndex: number | undefined, materialCache: Map<number, Material>, textureCache: Map<number, Texture2D>, opts?: ImportGltfOptions): Material => {
    if (materialIndex === undefined) return new StandardMaterial({});
    const existing = materialCache.get(materialIndex);
    if (existing) return existing.retain();
    const mat = json.materials?.[materialIndex];
    if (!mat) {
        const created = new StandardMaterial({});
        materialCache.set(materialIndex, created);
        return created;
    }
    for (const { name, reason } of getMaterialTextureCombinationLosses(mat, materialIndex)) warn(opts, `${name}: ${reason}; the texture contribution is ignored by the current transmission layout.`);
    const getOrCreateTextureByIndex = (textureIndex: number | undefined, usage: string): Texture2D | null => {
        if (textureIndex === undefined) return null;
        const cached = textureCache.get(textureIndex);
        if (cached) return cached;
        const texDef = json.textures?.[textureIndex];
        if (!texDef) {
            warn(opts, `glTF texture index ${textureIndex} missing (usage=${usage}).`);
            return null;
        }
        const textureExtensions = texDef.extensions as Record<string, unknown> | undefined;
        const alternativeSourceExtensions = [KHR_TEXTURE_BASISU, EXT_TEXTURE_WEBP].filter((name) => textureExtensions?.[name] !== undefined);
        const imageIndex = texDef.source;
        const img = imageIndex !== undefined ? json.images?.[imageIndex] : undefined;
        const hasCoreImageSource = !!img && (typeof img.uri === "string" && img.uri.length > 0 || img.bufferView !== undefined);
        for (const extensionName of alternativeSourceExtensions) {
            if (hasCoreImageSource) warn(opts, `glTF texture ${textureIndex}: ignoring optional ${extensionName} alternative source and using the core texture.source (usage=${usage}).`);
            else warn(opts, `glTF texture ${textureIndex}: optional ${extensionName} has no usable core texture.source; its deferred alternative source is unavailable (usage=${usage}).`);
        }
        if (imageIndex === undefined || !img) {
            warn(opts, `glTF texture ${textureIndex} has no valid source image (usage=${usage}).`);
            return null;
        }
        const sampler = texDef.sampler !== undefined ? json.samplers?.[texDef.sampler] : undefined;
        const addressModeU = gltfWrapToAddressMode(sampler?.wrapS);
        const addressModeV = gltfWrapToAddressMode(sampler?.wrapT);
        const magFilter = gltfMagToFilterMode(sampler?.magFilter);
        const { minFilter, mipmapFilter, useMipmaps } = gltfMinToFilterModes(sampler?.minFilter);
        let source: { kind: "bytes"; bytes: ArrayBuffer; mimeType?: string } | { kind: "url"; url: string; mimeType?: string } | null = null;
        const loadedBytes = doc.images?.[imageIndex];
        const mimeType = img.mimeType ?? inferMimeTypeFromUri(img.uri);
        if (loadedBytes && loadedBytes.byteLength > 0) {
            source = { kind: "bytes", bytes: loadedBytes, mimeType };
        } else if (img.bufferView !== undefined) {
            const bv = json.bufferViews?.[img.bufferView];
            const buf = bv ? doc.buffers[bv.buffer] : undefined;
            if (bv && buf) {
                const start = (bv.byteOffset ?? 0) | 0;
                source = { kind: "bytes", bytes: buf.slice(start, start + bv.byteLength), mimeType };
            } else {
                warn(opts, `glTF image bufferView ${img.bufferView} missing (texture=${textureIndex}, usage=${usage}).`);
            }
        } else if (img.uri) {
            if (isDataUri(img.uri)) {
                const decoded = decodeDataUri(img.uri);
                source = { kind: "bytes", bytes: decoded.data, mimeType: mimeType ?? decoded.mimeType ?? undefined };
            } else {
                const url = resolveUri(doc.resourceBaseUrl ?? doc.baseUrl, img.uri);
                source = { kind: "url", url, mimeType };
            }
        }
        if (!source) {
            warn(opts, `Could not resolve image source for texture=${textureIndex} (usage=${usage}).`);
            return null;
        }
        const created = Texture2D.createFrom({
            source,
            mipmaps: useMipmaps,
            sampler: {
                addressModeU,
                addressModeV,
                magFilter,
                minFilter,
                mipmapFilter
            }
        });
        textureCache.set(textureIndex, created);
        return created;
    };
    const getTex = (info: any | undefined, usage: string): Texture2D | null => {
        if (!info) return null;
        return getOrCreateTextureByIndex(info.index, usage);
    };
    const getTextureTransform = (info: any | undefined): TextureTransformDescriptor | null => {
        if (!info) return null;
        const ext = info.extensions as any;
        const transform = ext?.KHR_texture_transform as any;
        const texCoord = getTextureInfoTexCoord(info);
        const resolvedTexCoord = texCoord === 1 ? 1 : 0;
        if (!transform) return resolvedTexCoord === 1 ? { texCoord: 1 } : null;
        return {
            offset: [Number(transform.offset?.[0] ?? 0), Number(transform.offset?.[1] ?? 0)],
            rotation: Number(transform.rotation ?? 0),
            scale: [Number(transform.scale?.[0] ?? 1), Number(transform.scale?.[1] ?? 1)],
            texCoord: resolvedTexCoord
        };
    };
    const alphaMode = mat.alphaMode ?? "OPAQUE";
    const alphaCutoff = alphaMode === "MASK" ? (mat.alphaCutoff ?? 0.5) : 0;
    const blendMode = alphaMode === "BLEND" ? BlendMode.Transparent : BlendMode.Opaque;
    const cullMode = mat.doubleSided ? CullMode.None : CullMode.Back;
    const pbr = mat.pbrMetallicRoughness;
    const specGloss = (mat.extensions as any)?.KHR_materials_pbrSpecularGlossiness;
    if (!pbr && specGloss) {
        warn(opts, `Material '${mat.name ?? materialIndex}' uses KHR_materials_pbrSpecularGlossiness; approximating using diffuse as baseColor. Specular/glossiness are not fully supported yet.`);
        if (specGloss.specularGlossinessTexture) warn(opts, `Material '${mat.name ?? materialIndex}' has specularGlossinessTexture; currently ignored (highlights/roughness may look off).`);
    }
    const baseColorFactor = (pbr?.baseColorFactor ?? specGloss?.diffuseFactor ?? [1, 1, 1, 1]) as number[];
    const baseColorTextureInfo = (pbr?.baseColorTexture ?? specGloss?.diffuseTexture) as any;
    const baseColorTexture = getTex(baseColorTextureInfo, "baseColor");
    const baseColorTextureTransform = getTextureTransform(baseColorTextureInfo);
    let metallicFactor = 1;
    let roughnessFactor = 1;
    if (pbr) {
        metallicFactor = pbr.metallicFactor ?? 1;
        roughnessFactor = pbr.roughnessFactor ?? 1;
    } else if (specGloss) {
        metallicFactor = 0;
        const gloss = specGloss.glossinessFactor ?? 1;
        roughnessFactor = 1 - gloss;
        if (roughnessFactor < 0) roughnessFactor = 0;
        if (roughnessFactor > 1) roughnessFactor = 1;
    }
    const metallicRoughnessTextureInfo = pbr?.metallicRoughnessTexture as any;
    const normalTextureInfo = mat.normalTexture as any;
    const occlusionTextureInfo = mat.occlusionTexture as any;
    const emissiveTextureInfo = mat.emissiveTexture as any;
    const metallicRoughnessTexture = pbr ? getTex(metallicRoughnessTextureInfo, "metallicRoughness") : null;
    const metallicRoughnessTextureTransform = pbr ? getTextureTransform(metallicRoughnessTextureInfo) : null;
    const normalTexture = getTex(normalTextureInfo, "normal");
    const normalTextureTransform = getTextureTransform(normalTextureInfo);
    const occlusionTexture = getTex(occlusionTextureInfo, "occlusion");
    const occlusionTextureTransform = getTextureTransform(occlusionTextureInfo);
    const emissiveTexture = getTex(emissiveTextureInfo, "emissive");
    const emissiveTextureTransform = getTextureTransform(emissiveTextureInfo);
    const normalScale = mat.normalTexture?.scale ?? 1;
    const occlusionStrength = mat.occlusionTexture?.strength ?? 1;
    const emissiveFactor = mat.emissiveFactor ?? [0, 0, 0];
    const materialExtensions = (mat.extensions as any) ?? {};
    const emissiveStrengthExt = materialExtensions.KHR_materials_emissive_strength as { emissiveStrength?: number } | undefined;
    const emissiveStrength = emissiveStrengthExt?.emissiveStrength ?? 1;
    const clearcoatExt = materialExtensions.KHR_materials_clearcoat as any;
    const specularExt = materialExtensions.KHR_materials_specular as any;
    const sheenExt = materialExtensions.KHR_materials_sheen as any;
    const iridescenceExt = materialExtensions.KHR_materials_iridescence as any;
    const anisotropyExt = materialExtensions.KHR_materials_anisotropy as any;
    const transmissionExt = materialExtensions.KHR_materials_transmission as any;
    const volumeExt = materialExtensions.KHR_materials_volume as any;
    const diffuseTransmissionExt = materialExtensions.KHR_materials_diffuse_transmission as any;
    const dispersionExt = materialExtensions.KHR_materials_dispersion as any;
    const iorExt = materialExtensions.KHR_materials_ior as { ior?: number } | undefined;
    const emissiveIntensity = 1;
    const standardMaterialExtensions: StandardMaterialExtensionsDescriptor = {};
    if (clearcoatExt) {
        standardMaterialExtensions.clearcoat = {
            factor: clearcoatExt.clearcoatFactor ?? 0,
            texture: getTex(clearcoatExt.clearcoatTexture, "clearcoat"),
            textureTransform: getTextureTransform(clearcoatExt.clearcoatTexture),
            roughness: clearcoatExt.clearcoatRoughnessFactor ?? 0,
            roughnessTexture: getTex(clearcoatExt.clearcoatRoughnessTexture, "clearcoatRoughness"),
            roughnessTextureTransform: getTextureTransform(clearcoatExt.clearcoatRoughnessTexture),
            normalTexture: getTex(clearcoatExt.clearcoatNormalTexture, "clearcoatNormal"),
            normalTextureTransform: getTextureTransform(clearcoatExt.clearcoatNormalTexture),
            normalScale: clearcoatExt.clearcoatNormalTexture?.scale ?? 1
        };
    }
    if (specularExt) {
        const specularColorFactor = Array.isArray(specularExt.specularColorFactor) ? specularExt.specularColorFactor : [1, 1, 1];
        standardMaterialExtensions.specular = {
            factor: specularExt.specularFactor ?? 1,
            texture: getTex(specularExt.specularTexture, "specular"),
            textureTransform: getTextureTransform(specularExt.specularTexture),
            color: [specularColorFactor[0] ?? 1, specularColorFactor[1] ?? 1, specularColorFactor[2] ?? 1],
            colorTexture: getTex(specularExt.specularColorTexture, "specularColor"),
            colorTextureTransform: getTextureTransform(specularExt.specularColorTexture)
        };
    }
    if (sheenExt) {
        const sheenColorFactor = Array.isArray(sheenExt.sheenColorFactor) ? sheenExt.sheenColorFactor : [0, 0, 0];
        standardMaterialExtensions.sheen = {
            color: [sheenColorFactor[0] ?? 0, sheenColorFactor[1] ?? 0, sheenColorFactor[2] ?? 0],
            colorTexture: getTex(sheenExt.sheenColorTexture, "sheenColor"),
            colorTextureTransform: getTextureTransform(sheenExt.sheenColorTexture),
            roughness: sheenExt.sheenRoughnessFactor ?? 0,
            roughnessTexture: getTex(sheenExt.sheenRoughnessTexture, "sheenRoughness"),
            roughnessTextureTransform: getTextureTransform(sheenExt.sheenRoughnessTexture)
        };
    }
    if (iridescenceExt) {
        standardMaterialExtensions.iridescence = {
            factor: iridescenceExt.iridescenceFactor ?? 0,
            texture: getTex(iridescenceExt.iridescenceTexture, "iridescence"),
            textureTransform: getTextureTransform(iridescenceExt.iridescenceTexture),
            ior: iridescenceExt.iridescenceIor ?? 1.3,
            thicknessMinimum: iridescenceExt.iridescenceThicknessMinimum ?? 100,
            thicknessMaximum: iridescenceExt.iridescenceThicknessMaximum ?? 400,
            thicknessTexture: getTex(iridescenceExt.iridescenceThicknessTexture, "iridescenceThickness"),
            thicknessTextureTransform: getTextureTransform(iridescenceExt.iridescenceThicknessTexture)
        };
    }
    if (anisotropyExt) {
        standardMaterialExtensions.anisotropy = {
            strength: anisotropyExt.anisotropyStrength ?? 0,
            rotation: anisotropyExt.anisotropyRotation ?? 0,
            texture: getTex(anisotropyExt.anisotropyTexture, "anisotropy"),
            textureTransform: getTextureTransform(anisotropyExt.anisotropyTexture)
        };
    }
    if (transmissionExt) {
        standardMaterialExtensions.transmission = {
            factor: transmissionExt.transmissionFactor ?? 0,
            texture: getTex(transmissionExt.transmissionTexture, "transmission"),
            textureTransform: getTextureTransform(transmissionExt.transmissionTexture)
        };
    }
    if (volumeExt) {
        const attenuationColor = Array.isArray(volumeExt.attenuationColor) ? volumeExt.attenuationColor : [1, 1, 1];
        standardMaterialExtensions.volume = {
            thicknessFactor: volumeExt.thicknessFactor ?? 0,
            thicknessTexture: getTex(volumeExt.thicknessTexture, "volumeThickness"),
            thicknessTextureTransform: getTextureTransform(volumeExt.thicknessTexture),
            attenuationDistance: volumeExt.attenuationDistance ?? Infinity,
            attenuationColor: [attenuationColor[0] ?? 1, attenuationColor[1] ?? 1, attenuationColor[2] ?? 1]
        };
    }
    if (diffuseTransmissionExt) {
        const diffuseTransmissionColorFactor = Array.isArray(diffuseTransmissionExt.diffuseTransmissionColorFactor) ? diffuseTransmissionExt.diffuseTransmissionColorFactor : [1, 1, 1];
        standardMaterialExtensions.diffuseTransmission = {
            factor: diffuseTransmissionExt.diffuseTransmissionFactor ?? 0,
            texture: getTex(diffuseTransmissionExt.diffuseTransmissionTexture, "diffuseTransmission"),
            textureTransform: getTextureTransform(diffuseTransmissionExt.diffuseTransmissionTexture),
            color: [diffuseTransmissionColorFactor[0] ?? 1, diffuseTransmissionColorFactor[1] ?? 1, diffuseTransmissionColorFactor[2] ?? 1],
            colorTexture: getTex(diffuseTransmissionExt.diffuseTransmissionColorTexture, "diffuseTransmissionColor"),
            colorTextureTransform: getTextureTransform(diffuseTransmissionExt.diffuseTransmissionColorTexture)
        };
    }
    if (dispersionExt) standardMaterialExtensions.dispersion = { dispersion: dispersionExt.dispersion ?? 0 };
    if (iorExt) standardMaterialExtensions.ior = { ior: iorExt.ior ?? 1.5 };
    if (emissiveStrengthExt) standardMaterialExtensions.emissiveStrength = { strength: emissiveStrength };
    const isUnlit = isMaterialUnlit(mat);
    const depthWrite = blendMode === BlendMode.Opaque;
    let created: Material;
    if (isUnlit) {
        created = new UnlitMaterial({
            color: [baseColorFactor[0] ?? 1, baseColorFactor[1] ?? 1, baseColorFactor[2] ?? 1],
            opacity: baseColorFactor[3] ?? 1,
            baseColorTexture,
            baseColorTextureTransform,
            alphaCutoff,
            blendMode,
            cullMode,
            depthWrite
        });
    } else {
        created = new StandardMaterial({
            color: [baseColorFactor[0] ?? 1, baseColorFactor[1] ?? 1, baseColorFactor[2] ?? 1],
            opacity: baseColorFactor[3] ?? 1,
            metallic: metallicFactor,
            roughness: roughnessFactor,
            emissive: [emissiveFactor[0] ?? 0, emissiveFactor[1] ?? 0, emissiveFactor[2] ?? 0],
            emissiveIntensity,
            baseColorTexture,
            metallicRoughnessTexture,
            normalTexture,
            occlusionTexture,
            emissiveTexture,
            baseColorTextureTransform,
            metallicRoughnessTextureTransform,
            normalTextureTransform,
            occlusionTextureTransform,
            emissiveTextureTransform,
            normalScale,
            occlusionStrength,
            alphaCutoff,
            extensions: Object.keys(standardMaterialExtensions).length > 0 ? standardMaterialExtensions : undefined,
            blendMode,
            cullMode,
            depthWrite
        });
    }
    materialCache.set(materialIndex, created);
    return created;
};

type PrimitiveVariantMaterials = {
    variants: Map<number, Material>;
    ownedMaterials: Material[];
};

const getPrimitiveVariantMaterials = (doc: GltfDocument, json: GltfRoot, prim: GltfPrimitive, materialCache: Map<number, Material>, textureCache: Map<number, Texture2D>, opts: ImportGltfOptions | undefined, context: string): PrimitiveVariantMaterials => {
    const ext = (prim.extensions as Record<string, unknown> | undefined)?.["KHR_materials_variants"] as { mappings?: Array<{ material?: number; variants?: number[] }> } | undefined;
    const mappings = Array.isArray(ext?.mappings) ? ext.mappings : [];
    const variantMaterialIndices = new Map<number, number>();
    for (const mapping of mappings) {
        if (typeof mapping.material !== "number" || !Number.isFinite(mapping.material) || !Array.isArray(mapping.variants)) continue;
        const materialIndex = mapping.material | 0;
        for (const variantIndex of mapping.variants) {
            if (typeof variantIndex !== "number" || !Number.isFinite(variantIndex)) continue;
            variantMaterialIndices.set(variantIndex | 0, materialIndex);
        }
    }
    const variants = new Map<number, Material>();
    const materialByIndex = new Map<number, Material>();
    for (const [variantIndex, materialIndex] of variantMaterialIndices) {
        let material = materialByIndex.get(materialIndex);
        if (!material) {
            validateMaterialTextureCoordinates(json.materials?.[materialIndex], prim.attributes, opts, `${context} variant material ${materialIndex}`);
            material = getOrCreateMaterial(doc, json, materialIndex, materialCache, textureCache, opts);
            materialByIndex.set(materialIndex, material);
        }
        variants.set(variantIndex, material);
    }
    return { variants, ownedMaterials: [...materialByIndex.values()] };
};

type KHRGaussianSplattingPrimitiveExtension = {
    kernel?: unknown;
    colorSpace?: unknown;
    projection?: unknown;
    sortingMethod?: unknown;
};

const getGaussianSplattingExtension = (prim: GltfPrimitive): unknown | undefined => (prim.extensions as Record<string, unknown> | undefined)?.[KHR_GAUSSIAN_SPLATTING];

const getPrimitiveAccessorIndices = (prim: GltfPrimitive): number[] => {
    const indices: number[] = [];
    if (typeof prim.indices === "number") indices.push(prim.indices);
    for (const accessorIndex of Object.values(prim.attributes ?? {})) if (typeof accessorIndex === "number") indices.push(accessorIndex);
    for (const target of prim.targets ?? []) for (const accessorIndex of Object.values(target)) if (typeof accessorIndex === "number") indices.push(accessorIndex);
    return indices;
};

const primitiveUsesMeshopt = (json: GltfRoot, prim: GltfPrimitive): boolean => {
    for (const accessorIndex of getPrimitiveAccessorIndices(prim)) {
        const accessor = json.accessors?.[accessorIndex];
        if (!accessor) continue;
        const bufferViewIndices = [accessor.bufferView, accessor.sparse?.indices.bufferView, accessor.sparse?.values.bufferView];
        for (const bufferViewIndex of bufferViewIndices) {
            const bufferView = bufferViewIndex !== undefined ? json.bufferViews?.[bufferViewIndex] : undefined;
            if (bufferView?.extensions?.[EXT_MESHOPT_COMPRESSION] !== undefined) return true;
        }
    }
    return false;
};

const failGaussianSplatting = (context: string, message: string): never => { throw new Error(`${KHR_GAUSSIAN_SPLATTING}: ${context}: ${message}`); };

const handleUnsupportedGaussianSplatting = (json: GltfRoot, extensions: GltfImportExtensionsMetadata, opts: ImportGltfOptions, context: string, message: string): null => {
    markExtensionSupport(extensions, KHR_GAUSSIAN_SPLATTING, "partial");
    if (isExtensionRequired(json, KHR_GAUSSIAN_SPLATTING)) failGaussianSplatting(context, message);
    warn(opts, `${KHR_GAUSSIAN_SPLATTING}: ${context}: ${message}; skipping primitive. WasmGPU does not implement optional sparse point-cloud fallback conversion for unsupported Gaussian splat primitives in this MVP.`);
    return null;
};

const requireSplatAttribute = (attrs: GltfPrimitiveAttributes, semantic: string, context: string): number => {
    const accessorIndex = attrs[semantic];
    if (accessorIndex === undefined) return failGaussianSplatting(context, `missing required attribute '${semantic}'.`);
    return accessorIndex;
};

const validateSplatAccessor = (json: GltfRoot, accessorIndex: number, expectedType: string, isSupportedEncoding: (componentType: number, normalized: boolean) => boolean, context: string, semantic: string): number => {
    const accessor = json.accessors?.[accessorIndex];
    if (!accessor) return failGaussianSplatting(context, `attribute '${semantic}' references missing accessor ${accessorIndex}.`);
    if (accessor.type !== expectedType) failGaussianSplatting(context, `attribute '${semantic}' must use accessor type ${expectedType}, got ${accessor.type}.`);
    const normalized = accessor.normalized === true;
    if (!isSupportedEncoding(accessor.componentType, normalized)) failGaussianSplatting(context, `attribute '${semantic}' has unsupported accessor encoding componentType=${accessor.componentType} normalized=${normalized}.`);
    return accessor.count | 0;
};

const validateSplatAttributeCount = (count: number, expectedCount: number, context: string, semantic: string): void => { if (count !== expectedCount) failGaussianSplatting(context, `attribute '${semantic}' count ${count} does not match POSITION count ${expectedCount}.`); };

const isFloatEncoding = (componentType: number): boolean => componentType === 5126;
const isFloatNonNormalizedEncoding = (componentType: number, normalized: boolean): boolean => componentType === 5126 && !normalized;
const isNormalizedSignedByteOrShort = (componentType: number, normalized: boolean): boolean => normalized && (componentType === 5120 || componentType === 5122);
const isUnsignedByteOrShort = (componentType: number): boolean => componentType === 5121 || componentType === 5123;
const isNormalizedUnsignedByteOrShort = (componentType: number, normalized: boolean): boolean => normalized && isUnsignedByteOrShort(componentType);

const validateDecodedSplatAttributeLength = (data: Float32Array, expectedCount: number, componentCount: number, context: string, semantic: string): void => {
    const expectedLength = expectedCount * componentCount;
    if (data.length !== expectedLength) failGaussianSplatting(context, `attribute '${semantic}' decoded length ${data.length} does not match expected length ${expectedLength}.`);
};

const gatherFloatAttribute = (src: Float32Array, componentCount: number, indices: Uint32Array | null): Float32Array => {
    if (!indices) return src;
    const out = new Float32Array(indices.length * componentCount);
    for (let i = 0; i < indices.length; i++) {
        const srcBase = (indices[i] ?? 0) * componentCount;
        const dstBase = i * componentCount;
        for (let c = 0; c < componentCount; c++) out[dstBase + c] = src[srcBase + c] ?? 0;
    }
    return out;
};

const validateSplatIndices = (indices: Uint32Array | null, sourceCount: number, context: string): void => {
    if (!indices) return;
    for (let i = 0; i < indices.length; i++) {
        const index = indices[i]!;
        if (index >= sourceCount) failGaussianSplatting(context, `indices[${i}] value ${index} is out of range for splat attribute count ${sourceCount}.`);
    }
};

const validateFiniteSplatValues = (data: Float32Array, context: string, semantic: string): void => { for (let i = 0; i < data.length; i++) if (!Number.isFinite(data[i])) failGaussianSplatting(context, `attribute '${semantic}' contains non-finite value at component ${i}.`); };

const validateSplatScaleValues = (scales: Float32Array, context: string): void => { validateFiniteSplatValues(scales, context, "KHR_gaussian_splatting:SCALE"); for (let i = 0; i < scales.length; i++) if ((scales[i] ?? 0) < 0) failGaussianSplatting(context, `attribute 'KHR_gaussian_splatting:SCALE' contains negative value at component ${i}.`); };

const validateSplatOpacityValues = (opacities: Float32Array, context: string): void => {
    validateFiniteSplatValues(opacities, context, "KHR_gaussian_splatting:OPACITY");
    for (let i = 0; i < opacities.length; i++) {
        const value = opacities[i] ?? 0;
        if (value < 0 || value > 1) failGaussianSplatting(context, `attribute 'KHR_gaussian_splatting:OPACITY' contains value outside [0, 1] at component ${i}.`);
    }
};

const shDegreeCoeffCount = (degree: SplatFieldSHDegree): number => {
    switch (degree) {
        case 0: return 1;
        case 1: return 3;
        case 2: return 5;
        case 3: return 7;
    }
};

const shSemantic = (degree: SplatFieldSHDegree, coeff: number): string => `${KHR_GAUSSIAN_SPLATTING}:SH_DEGREE_${degree}_COEF_${coeff}`;

type GaussianSplatSHAttributes = {
    degree: SplatFieldSHDegree;
    accessors: Map<string, number>;
};

const resolveGaussianSplatSHAttributes = (attrs: GltfPrimitiveAttributes, sh0Acc: number, context: string): GaussianSplatSHAttributes => {
    const complete = [true, false, false, false];
    const accessors = new Map<string, number>([[shSemantic(0, 0), sh0Acc]]);
    for (const semantic of Object.keys(attrs)) {
        if (attrs[semantic] === undefined) continue;
        const match = /^KHR_gaussian_splatting:SH_DEGREE_(\d+)_COEF_(\d+)$/.exec(semantic);
        if (!match) continue;
        const degree = Number(match[1]);
        const coeff = Number(match[2]);
        if (degree < 0 || degree > 3) failGaussianSplatting(context, `attribute '${semantic}' uses unsupported spherical harmonic degree ${degree}.`);
        if (coeff < 0 || coeff >= shDegreeCoeffCount(degree as SplatFieldSHDegree)) failGaussianSplatting(context, `attribute '${semantic}' uses unsupported coefficient index ${coeff} for degree ${degree}.`);
    }
    for (const degree of [1, 2, 3] as SplatFieldSHDegree[]) {
        const required = shDegreeCoeffCount(degree);
        let present = 0;
        let firstMissing: string | null = null;
        for (let coeff = 0; coeff < required; coeff++) {
            const semantic = shSemantic(degree, coeff);
            const accessorIndex = attrs[semantic];
            if (accessorIndex === undefined) {
                if (!firstMissing) firstMissing = semantic;
                continue;
            }
            present++;
            accessors.set(semantic, accessorIndex);
        }
        if (present > 0 && present !== required) failGaussianSplatting(context, `degree ${degree} spherical harmonic attributes must be complete; missing '${firstMissing}'.`);
        complete[degree] = present === required;
    }
    if (complete[2] && !complete[1]) failGaussianSplatting(context, "degree 2 spherical harmonic attributes require complete degree 1 attributes.");
    if (complete[3] && (!complete[1] || !complete[2])) failGaussianSplatting(context, "degree 3 spherical harmonic attributes require complete degree 1 and degree 2 attributes.");
    const degree: SplatFieldSHDegree = complete[3] ? 3 : complete[2] ? 2 : complete[1] ? 1 : 0;
    return { degree, accessors };
};

const gatherSHDegreeData = (coefficients: Float32Array[], indices: Uint32Array | null): Float32Array => {
    if (coefficients.length === 0) return new Float32Array(0);
    const gathered = coefficients.map((coeff) => gatherFloatAttribute(coeff, 3, indices));
    const count = (gathered[0]!.length / 3) | 0;
    const out = new Float32Array(count * coefficients.length * 3);
    for (let i = 0; i < count; i++) {
        for (let coeff = 0; coeff < gathered.length; coeff++) {
            const src = gathered[coeff]!;
            const srcBase = i * 3;
            const dstBase = (i * gathered.length + coeff) * 3;
            out[dstBase + 0] = src[srcBase + 0] ?? 0;
            out[dstBase + 1] = src[srcBase + 1] ?? 0;
            out[dstBase + 2] = src[srcBase + 2] ?? 0;
        }
    }
    return out;
};

const resolveGaussianSplatColorSpace = (value: unknown): SplatFieldColorSpace | null => {
    if (value === "lin_rec709_display") return "linear";
    if (value === "srgb_rec709_display") return "srgb";
    return null;
};

const createSplatFieldFromPrimitive = (doc: GltfDocument, json: GltfRoot, gltfMesh: GltfMesh, meshIndex: number, prim: GltfPrimitive, primIndex: number, node: GltfNode, nodeT: Transform, extensions: GltfImportExtensionsMetadata, opts: ImportGltfOptions): SplatField | null => {
    const context = `Mesh '${gltfMesh.name ?? meshIndex}' primitive ${primIndex}`;
    const extValue = getGaussianSplattingExtension(prim);
    if (!extValue || typeof extValue !== "object" || Array.isArray(extValue)) failGaussianSplatting(context, "extension object is required.");
    const ext = extValue as KHRGaussianSplattingPrimitiveExtension;
    if (ext.kernel === undefined) failGaussianSplatting(context, "missing required property 'kernel'.");
    if (ext.kernel !== "ellipse") return handleUnsupportedGaussianSplatting(json, extensions, opts, context, `kernel '${String(ext.kernel)}' is not supported; expected 'ellipse'`);
    if (ext.colorSpace === undefined) failGaussianSplatting(context, "missing required property 'colorSpace'.");
    const colorSpace = resolveGaussianSplatColorSpace(ext.colorSpace);
    if (!colorSpace) return handleUnsupportedGaussianSplatting(json, extensions, opts, context, `colorSpace '${String(ext.colorSpace)}' is not supported`);
    if (ext.projection !== undefined && ext.projection !== "perspective") return handleUnsupportedGaussianSplatting(json, extensions, opts, context, `projection '${String(ext.projection)}' is not supported; expected 'perspective'`);
    if (ext.sortingMethod !== undefined && ext.sortingMethod !== "cameraDistance") return handleUnsupportedGaussianSplatting(json, extensions, opts, context, `sortingMethod '${String(ext.sortingMethod)}' is not supported; expected 'cameraDistance'`);
    const mode = prim.mode ?? 4;
    if (mode !== GL_POINTS) failGaussianSplatting(context, `primitive mode must be POINTS (0), got ${mode}.`);
    const attrs = prim.attributes;
    const positionAcc = requireSplatAttribute(attrs, "POSITION", context);
    const rotationAcc = requireSplatAttribute(attrs, "KHR_gaussian_splatting:ROTATION", context);
    const scaleAcc = requireSplatAttribute(attrs, "KHR_gaussian_splatting:SCALE", context);
    const opacityAcc = requireSplatAttribute(attrs, "KHR_gaussian_splatting:OPACITY", context);
    const sh0Acc = requireSplatAttribute(attrs, "KHR_gaussian_splatting:SH_DEGREE_0_COEF_0", context);
    const shAttrs = resolveGaussianSplatSHAttributes(attrs, sh0Acc, context);
    const sourceCount = validateSplatAccessor(json, positionAcc, "VEC3", (componentType, normalized) => isFloatNonNormalizedEncoding(componentType, normalized), context, "POSITION");
    validateSplatAttributeCount(validateSplatAccessor(json, rotationAcc, "VEC4", (componentType, normalized) => isFloatEncoding(componentType) || isNormalizedSignedByteOrShort(componentType, normalized), context, "KHR_gaussian_splatting:ROTATION"), sourceCount, context, "KHR_gaussian_splatting:ROTATION");
    validateSplatAttributeCount(validateSplatAccessor(json, scaleAcc, "VEC3", (componentType) => isFloatEncoding(componentType) || isUnsignedByteOrShort(componentType), context, "KHR_gaussian_splatting:SCALE"), sourceCount, context, "KHR_gaussian_splatting:SCALE");
    validateSplatAttributeCount(validateSplatAccessor(json, opacityAcc, "SCALAR", (componentType, normalized) => isFloatEncoding(componentType) || isNormalizedUnsignedByteOrShort(componentType, normalized), context, "KHR_gaussian_splatting:OPACITY"), sourceCount, context, "KHR_gaussian_splatting:OPACITY");
    for (const [semantic, accessorIndex] of shAttrs.accessors) validateSplatAttributeCount(validateSplatAccessor(json, accessorIndex, "VEC3", (componentType, normalized) => isFloatNonNormalizedEncoding(componentType, normalized), context, semantic), sourceCount, context, semantic);
    markExtensionSupport(extensions, KHR_GAUSSIAN_SPLATTING, "supported");
    const indices = prim.indices !== undefined ? readIndicesAsUint32(doc, prim.indices) : null;
    validateSplatIndices(indices, sourceCount, context);
    const splatCount = indices ? indices.length : sourceCount;
    const sourcePositions = readAccessorAsFloat32(doc, positionAcc);
    const sourceRotations = readAccessorAsFloat32(doc, rotationAcc);
    const sourceScales = readAccessorAsFloat32(doc, scaleAcc);
    const sourceOpacities = readAccessorAsFloat32(doc, opacityAcc);
    validateDecodedSplatAttributeLength(sourcePositions, sourceCount, 3, context, "POSITION");
    validateDecodedSplatAttributeLength(sourceRotations, sourceCount, 4, context, "KHR_gaussian_splatting:ROTATION");
    validateDecodedSplatAttributeLength(sourceScales, sourceCount, 3, context, "KHR_gaussian_splatting:SCALE");
    validateDecodedSplatAttributeLength(sourceOpacities, sourceCount, 1, context, "KHR_gaussian_splatting:OPACITY");
    const positions = gatherFloatAttribute(sourcePositions, 3, indices);
    const rotations = gatherFloatAttribute(sourceRotations, 4, indices);
    const scales = gatherFloatAttribute(sourceScales, 3, indices);
    const opacities = gatherFloatAttribute(sourceOpacities, 1, indices);
    validateFiniteSplatValues(positions, context, "POSITION");
    validateFiniteSplatValues(rotations, context, "KHR_gaussian_splatting:ROTATION");
    validateSplatScaleValues(scales, context);
    validateSplatOpacityValues(opacities, context);
    const readSHCoeff = (degree: SplatFieldSHDegree, coeff: number): Float32Array => {
        const semantic = shSemantic(degree, coeff);
        const accessorIndex = shAttrs.accessors.get(semantic) ?? failGaussianSplatting(context, `missing required attribute '${semantic}'.`);
        const data = readAccessorAsFloat32(doc, accessorIndex);
        validateDecodedSplatAttributeLength(data, sourceCount, 3, context, semantic);
        validateFiniteSplatValues(data, context, semantic);
        return data;
    };
    const sh0 = gatherSHDegreeData([readSHCoeff(0, 0)], indices);
    const sh1 = shAttrs.degree >= 1 ? gatherSHDegreeData([readSHCoeff(1, 0), readSHCoeff(1, 1), readSHCoeff(1, 2)], indices) : undefined;
    const sh2 = shAttrs.degree >= 2 ? gatherSHDegreeData([readSHCoeff(2, 0), readSHCoeff(2, 1), readSHCoeff(2, 2), readSHCoeff(2, 3), readSHCoeff(2, 4)], indices) : undefined;
    const sh3 = shAttrs.degree >= 3 ? gatherSHDegreeData([readSHCoeff(3, 0), readSHCoeff(3, 1), readSHCoeff(3, 2), readSHCoeff(3, 3), readSHCoeff(3, 4), readSHCoeff(3, 5), readSHCoeff(3, 6)], indices) : undefined;
    const field = new SplatField({
        name: node.name ?? gltfMesh.name ?? `gltf_splatfield_${meshIndex}_${primIndex}`,
        positions, rotations, scales, opacities,
        sh0, sh1, sh2, sh3,
        shDegree: shAttrs.degree,
        splatCount, colorSpace
    });
    field.transform.setParent(nodeT);
    return field;
};

const buildGeometryFromPrimitive = (doc: GltfDocument, json: GltfRoot, prim: GltfPrimitive, computeMissingNormals: boolean, opts: ImportGltfOptions): Geometry | null => {
    const attrs = prim.attributes;
    const posAcc = attrs["POSITION"];
    if (posAcc === undefined) { warn(opts, "Primitive missing POSITION; skipping"); return null; }
    const positions = readAccessorAsFloat32(doc, posAcc);
    let normals: Float32Array | null = null;
    const nAcc = attrs["NORMAL"];
    if (nAcc !== undefined) normals = readAccessorAsFloat32(doc, nAcc);
    let tangents: Float32Array | null = null;
    const tangentAcc = attrs["TANGENT"];
    if (tangentAcc !== undefined) tangents = readAccessorAsFloat32(doc, tangentAcc);
    let uvs: Float32Array | null = null;
    const uvAcc = attrs["TEXCOORD_0"];
    if (uvAcc !== undefined) uvs = readAccessorAsFloat32(doc, uvAcc);
    let uvs1: Float32Array | null = null;
    const uv1Acc = attrs["TEXCOORD_1"];
    if (uv1Acc !== undefined) uvs1 = readAccessorAsFloat32(doc, uv1Acc);
    let joints: Uint16Array | null = null;
    let weights: Float32Array | null = null;
    let joints1: Uint16Array | null = null;
    let weights1: Float32Array | null = null;
    const jAcc0 = attrs["JOINTS_0"];
    const wAcc0 = attrs["WEIGHTS_0"];
    const jAcc1 = attrs["JOINTS_1"];
    const wAcc1 = attrs["WEIGHTS_1"];
    if (jAcc0 !== undefined && wAcc0 !== undefined) {
        const joints0 = readAccessorAsUint16(doc, jAcc0);
        const weights0 = readAccessorAsFloat32(doc, wAcc0);
        if (jAcc1 !== undefined && wAcc1 !== undefined) {
            const joints1Raw = readAccessorAsUint16(doc, jAcc1);
            const weights1Raw = readAccessorAsFloat32(doc, wAcc1);
            if (joints1Raw.length === joints0.length && weights1Raw.length === weights0.length) {
                const norm = normalizeWeightsTo8(weights0, weights1Raw);
                joints = joints0;
                weights = norm.weights0;
                joints1 = joints1Raw;
                weights1 = norm.weights1;
            } else {
                warn(opts, "Primitive has JOINTS_1/WEIGHTS_1 but lengths don't match JOINTS_0/WEIGHTS_0; ignoring additional influences");
                joints = joints0;
                weights = normalizeWeightsTo4(weights0);
            }
        } else if (jAcc1 !== undefined || wAcc1 !== undefined) {
            warn(opts, "Primitive has JOINTS_1/WEIGHTS_1 mismatch; ignoring additional influences");
            joints = joints0;
            weights = normalizeWeightsTo4(weights0);
        } else {
            joints = joints0;
            weights = normalizeWeightsTo4(weights0);
        }
    } else if (jAcc0 !== undefined || wAcc0 !== undefined) {
        warn(opts, "Primitive has JOINTS_0/WEIGHTS_0 mismatch; ignoring skinning attributes for this primitive");
    }
    const mode = prim.mode ?? 4;
    let indices: Uint32Array | null = null;
    if (prim.indices !== undefined) {
        indices = readIndicesAsUint32(doc, prim.indices);
    } else {
        const vcount = (positions.length / 3) | 0;
        const seq = new Uint32Array(vcount);
        for (let i = 0; i < vcount; i++) seq[i] = i >>> 0;
        indices = mode === 4 ? null : seq;
    }
    if (mode === 5) {
        const idx = indices ?? new Uint32Array(0);
        indices = triangulateStrip(idx);
    } else if (mode === 6) {
        const idx = indices ?? new Uint32Array(0);
        indices = triangulateFan(idx);
    } else if (mode !== 4) {
        warn(opts, `Unsupported primitive mode=${mode} (only triangles/strip/fan supported); skipping primitive`);
        return null;
    }
    const morphTargets: GeometryMorphTargetDescriptor[] = [];
    if (prim.targets && prim.targets.length > 0) {
        for (let targetIndex = 0; targetIndex < prim.targets.length; targetIndex++) {
            const targetAttrs = prim.targets[targetIndex]!;
            const target: GeometryMorphTargetDescriptor = {};
            const targetPosAcc = targetAttrs["POSITION"];
            const targetNormalAcc = targetAttrs["NORMAL"];
            if (targetPosAcc !== undefined) {
                const targetPositions = readAccessorAsFloat32(doc, targetPosAcc);
                if (targetPositions.length === positions.length) target.positions = targetPositions;
                else warn(opts, `Primitive morph target ${targetIndex} POSITION length ${targetPositions.length} does not match base POSITION length ${positions.length}; ignoring POSITION deltas.`);
            }
            if (targetNormalAcc !== undefined) {
                const targetNormals = readAccessorAsFloat32(doc, targetNormalAcc);
                if (targetNormals.length === positions.length) target.normals = targetNormals;
                else warn(opts, `Primitive morph target ${targetIndex} NORMAL length ${targetNormals.length} does not match base NORMAL length ${positions.length}; ignoring NORMAL deltas.`);
            }
            if (targetAttrs["TANGENT"] !== undefined) warn(opts, `Primitive morph target ${targetIndex} provides TANGENT deltas; WasmGPU ignores tangent morph data.`);
            if (!target.positions && !target.normals) warn(opts, `Primitive morph target ${targetIndex} has no supported POSITION or NORMAL deltas; preserving target slot with no runtime effect.`);
            morphTargets.push(target);
        }
    }
    const tangentTexCoords = getMaterialTangentTexCoords(prim.material !== undefined ? json.materials?.[prim.material] : undefined);
    const tangentSpaceNeeded = tangentTexCoords.length > 0;
    if (!normals && (computeMissingNormals || tangentSpaceNeeded)) normals = computeGeometryVertexNormals(positions, indices);
    if (!tangents && tangentSpaceNeeded) {
        const tangentTexCoord = tangentTexCoords[0]!;
        if (tangentTexCoords.length > 1) warn(opts, "Primitive uses tangent-space textures on multiple texture coordinate sets; shader will fall back to derivative tangent space.");
        else {
            const tangentUvs = tangentTexCoord === 1 ? uvs1 : uvs;
            if (normals && tangentUvs) tangents = computeGeometryTangents(positions, normals, tangentUvs, indices);
            else warn(opts, `Primitive uses tangent-space material features but is missing NORMAL or TEXCOORD_${tangentTexCoord}; shader will fall back to derivative tangent space.`);
        }
    }
    return new Geometry({
        positions,
        normals: normals ?? undefined,
        tangents: tangents ?? undefined,
        uvs: uvs ?? undefined,
        uvs1: uvs1 ?? undefined,
        joints: joints ?? undefined,
        weights: weights ?? undefined,
        joints1: joints1 ?? undefined,
        weights1: weights1 ?? undefined,
        indices: indices ?? undefined,
        morphTargets,
        authoredNormals: nAcc !== undefined
    });
};

type ImportedMeshNodeObjects = {
    meshes: Mesh[];
    splatFields: SplatField[];
};

const instantiateMeshNode = (doc: GltfDocument, json: GltfRoot, nodeIndex: number, node: GltfNode, nodeT: Transform, materialCache: Map<number, Material>, textureCache: Map<number, Texture2D>, geometryCache: Map<string, Geometry | null>, variantsController: GltfVariantController, extensions: GltfImportExtensionsMetadata, opts: ImportGltfOptions): ImportedMeshNodeObjects => {
    if (node.mesh === undefined) return { meshes: [], splatFields: [] };
    const gltfMesh: GltfMesh | undefined = json.meshes?.[node.mesh];
    if (!gltfMesh) { warn(opts, `nodes[].mesh=${node.mesh} missing; skipping mesh node`); return { meshes: [], splatFields: [] }; }
    const meshes: Mesh[] = [];
    const splatFields: SplatField[] = [];
    const computeMissingNormals = opts.computeMissingNormals !== false;
    for (let primIndex = 0; primIndex < gltfMesh.primitives.length; primIndex++) {
        const prim = gltfMesh.primitives[primIndex]!;
        const hasOptionalMeshopt = primitiveUsesMeshopt(json, prim) && !isExtensionRequired(json, EXT_MESHOPT_COMPRESSION);
        if (hasOptionalMeshopt) warn(opts, `Mesh ${gltfMesh.name ?? node.mesh} primitive ${primIndex}: ignoring optional ${EXT_MESHOPT_COMPRESSION} payload and attempting the uncompressed core accessor representation.`);
        if ((prim.extensions as unknown as Record<string, unknown> | undefined)?.[KHR_DRACO_MESH_COMPRESSION]) {
            const hasCorePosition = prim.attributes?.POSITION !== undefined && !!json.accessors?.[prim.attributes.POSITION];
            if (!hasCorePosition) {
                warn(opts, `Mesh ${gltfMesh.name ?? node.mesh} primitive ${primIndex}: ${KHR_DRACO_MESH_COMPRESSION} has no usable uncompressed core POSITION; skipping primitive.`);
                continue;
            }
            warn(opts, `Mesh ${gltfMesh.name ?? node.mesh} primitive ${primIndex}: ignoring optional ${KHR_DRACO_MESH_COMPRESSION} payload and using the uncompressed core primitive.`);
        }
        if (getGaussianSplattingExtension(prim) !== undefined) {
            const field = createSplatFieldFromPrimitive(doc, json, gltfMesh, node.mesh, prim, primIndex, node, nodeT, extensions, opts);
            if (field) splatFields.push(field);
            continue;
        }
        const cacheKey = `${node.mesh ?? -1}:${primIndex}`;
        const hasCachedGeometry = geometryCache.has(cacheKey);
        let geom = geometryCache.get(cacheKey);
        const meshName = `${gltfMesh.name ?? `mesh_${node.mesh}`}_${primIndex}`;
        const matJson = prim.material !== undefined ? json.materials?.[prim.material] : undefined;
        validateMaterialTextureCoordinates(matJson, prim.attributes, opts, `Mesh '${gltfMesh.name ?? node.mesh}' primitive ${primIndex}`);
        if (!hasCachedGeometry) {
            let built: Geometry | null;
            try {
                built = buildGeometryFromPrimitive(doc, json, prim, computeMissingNormals, opts);
            } catch (error) {
                if (!hasOptionalMeshopt) throw error;
                const detail = error instanceof Error ? error.message : String(error);
                warn(opts, `Mesh ${gltfMesh.name ?? node.mesh} primitive ${primIndex}: ${EXT_MESHOPT_COMPRESSION} has no usable uncompressed core representation; skipping primitive (${detail}).`);
                built = null;
            }
            geom = built;
            geometryCache.set(cacheKey, geom);
        }
        if (!geom) continue;
        if (hasCachedGeometry) geom.retain();
        const mat = getOrCreateMaterial(doc, json, prim.material, materialCache, textureCache, opts);
        const mesh = new Mesh(geom, mat);
        mesh.name = node.name ?? gltfMesh.name ?? `gltf_mesh_${node.mesh}_${primIndex}`;
        mesh.transform.setParent(nodeT);
        const resolvedWeights = resolveMorphWeights(node.weights ?? gltfMesh.weights, geom.morphTargets.length | 0, opts, `Mesh '${mesh.name}' primitive ${primIndex}`);
        if (geom.morphTargets.length > 0) initializeMeshMorphRuntime(mesh, resolvedWeights);
        mesh.userData.gltf = {
            nodeIndex,
            meshIndex: node.mesh,
            primitiveIndex: primIndex,
            resolvedWeights: Array.from(resolvedWeights),
            extras: {
                node: node.extras,
                mesh: gltfMesh.extras,
                primitive: prim.extras,
                material: matJson?.extras
            },
            extensions: {
                node: node.extensions,
                mesh: gltfMesh.extensions,
                primitive: prim.extensions,
                material: matJson?.extensions
            }
        };
        meshes.push(mesh);
        const variantMaterials = getPrimitiveVariantMaterials(doc, json, prim, materialCache, textureCache, opts, `Mesh '${gltfMesh.name ?? node.mesh}' primitive ${primIndex}`);
        variantsController.register(mesh, mesh.material, variantMaterials.variants);
        for (const material of variantMaterials.ownedMaterials) material.release();
    }
    return { meshes, splatFields };
};

const instantiateCameraNode = (json: GltfRoot, node: GltfNode, nodeT: Transform, opts: ImportGltfOptions): Camera | null => {
    if (node.camera === undefined) return null;
    const cam: GltfCamera | undefined = json.cameras?.[node.camera];
    if (!cam) { warn(opts, `nodes[].camera=${node.camera} missing; skipping camera`); return null; }
    let out: Camera;
    if (cam.type === "perspective") {
        const p = cam.perspective;
        if (!p) { warn(opts, `camera[${node.camera}] missing perspective block; skipping`); return null; }
        out = new PerspectiveCamera({ fov: (p.yfov * 180) / Math.PI, aspect: p.aspectRatio, near: p.znear, far: p.zfar ?? 1000 });
    } else {
        const o = cam.orthographic;
        if (!o) { warn(opts, `camera[${node.camera}] missing orthographic block; skipping`); return null; }
        out = new OrthographicCamera({ left: -o.xmag, right: o.xmag, top: o.ymag, bottom: -o.ymag, near: o.znear, far: o.zfar });
    }
    out.transform.setParent(nodeT);
    return out;
};

const instantiateLightNode = (light: KHRLightsPunctualLight, nodeT: Transform): Light | null => {
    const color = light.color ?? [1, 1, 1];
    const intensity = light.intensity ?? 1.0;
    if (light.type === "directional") {
        const wm = nodeT.worldMatrix;
        const zx = wm[8] ?? 0;
        const zy = wm[9] ?? 0;
        const zz = wm[10] ?? -1;
        const dx = -zx, dy = -zy, dz = -zz;
        const inv = 1.0 / (Math.hypot(dx, dy, dz) || 1.0);
        return new DirectionalLight({
            direction: [dx * inv, dy * inv, dz * inv],
            color: [color[0] ?? 1, color[1] ?? 1, color[2] ?? 1],
            intensity,
        });
    }
    if (light.type === "point") {
        const pos = nodeT.worldPosition;
        return new PointLight({
            position: [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0],
            color: [color[0] ?? 1, color[1] ?? 1, color[2] ?? 1],
            intensity,
            range: light.range ?? 0,
        });
    }
    if (light.type === "spot") {
        const pos = nodeT.worldPosition;
        const wm = nodeT.worldMatrix;
        const dx = -(wm[8] ?? 0);
        const dy = -(wm[9] ?? 0);
        const dz = -(wm[10] ?? -1);
        const inv = 1.0 / (Math.hypot(dx, dy, dz) || 1.0);
        return new SpotLight({
            position: [pos[0] ?? 0, pos[1] ?? 0, pos[2] ?? 0],
            direction: [dx * inv, dy * inv, dz * inv],
            color: [color[0] ?? 1, color[1] ?? 1, color[2] ?? 1],
            intensity,
            range: light.range ?? 0,
            innerCone: light.spot?.innerConeAngle ?? 0,
            outerCone: light.spot?.outerConeAngle ?? Math.PI / 4
        });
    }
    return null;
};

const parseSkins = (doc: GltfDocument, json: GltfRoot, nodes: GltfImportedNode[], opts: ImportGltfOptions): ImportedSkin[] => {
    const skins = json.skins ?? [];
    const out: ImportedSkin[] = [];
    for (let i = 0; i < skins.length; i++) {
        const s: GltfSkin = skins[i]!;
        const joints: Transform[] = [];
        let missingJoint = false;
        for (let jointSlot = 0; jointSlot < s.joints.length; jointSlot++) {
            const j = s.joints[jointSlot]!;
            const t = nodes[j]?.transform;
            if (!t) { warn(opts, `skin[${i}] joint slot ${jointSlot} references missing node ${j}; skipping skin runtime to avoid remapped joint indices.`); missingJoint = true; continue; }
            joints.push(t);
        }
        let inverseBind: Float32Array | undefined;
        if (s.inverseBindMatrices !== undefined) inverseBind = readAccessorAsFloat32(doc, s.inverseBindMatrices);
        let runtimeInverseBind = inverseBind;
        if (inverseBind && inverseBind.length !== s.joints.length * 16) { warn(opts, `skin[${i}] inverseBindMatrices length ${inverseBind.length} does not match ${s.joints.length} joints; using identity inverse binds.`); runtimeInverseBind = undefined; }
        const skel = s.skeleton !== undefined ? nodes[s.skeleton]?.transform : undefined;
        const runtime = missingJoint || joints.length === 0 ? null : new Skin(s.name ?? `skin_${i}`, joints, runtimeInverseBind ?? null);
        if (!runtime) warn(opts, `skin[${i}] has no valid runtime; meshes referencing it will render unskinned.`);
        out.push({ name: s.name, joints, inverseBindMatrices: inverseBind, skeleton: skel, runtime });
    }
    return out;
};

type AnimationPointerTarget =
    | { kind: "trs"; canonical: string; targetIndex: number; pathCode: number }
    | { kind: "weights"; canonical: string; meshes: Mesh[] }
    | { kind: "pointer"; canonical: string; valueSize: number; requiresStep?: boolean; allowDuplicateTarget?: boolean; setValue: (value: Float32Array) => void };

type AnimationPointerContext = {
    json: GltfRoot;
    nodes: GltfImportedNode[];
    materialCache: Map<number, Material>;
    cameraRuntimeMap: Map<number, Camera[]>;
    lightRuntimeMap: Map<number, Light[]>;
    opts: ImportGltfOptions;
};

const decodeJsonPointer = (pointer: string): string[] | null => {
    if (pointer === "") return [];
    if (!pointer.startsWith("/")) return null;
    return pointer.slice(1).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
};

const parsePointerIndex = (tokens: readonly string[], index: number): number | null => {
    const token = tokens[index];
    if (token === undefined || !/^(0|[1-9]\d*)$/.test(token)) return null;
    const value = Number(token);
    return Number.isSafeInteger(value) ? value : null;
};

const getChannelPointer = (channel: GltfAnimationChannel): string | null => {
    const ext = channel.target.extensions?.["KHR_animation_pointer"] as { pointer?: unknown } | undefined;
    return typeof ext?.pointer === "string" ? ext.pointer : null;
};

const getTextureTransformValueSize = (property: string): number | null => {
    if (property === "rotation") return 1;
    if (property === "offset" || property === "scale") return 2;
    return null;
};

const makeTextureTransformPatch = (current: TextureTransformDescriptor | null | undefined, property: string, value: Float32Array): TextureTransformDescriptor => {
    const out: TextureTransformDescriptor = {
        offset: [current?.offset?.[0] ?? 0, current?.offset?.[1] ?? 0],
        rotation: current?.rotation ?? 0,
        scale: [current?.scale?.[0] ?? 1, current?.scale?.[1] ?? 1],
        texCoord: current?.texCoord
    };
    if (property === "offset") out.offset = [value[0] ?? 0, value[1] ?? 0];
    else if (property === "rotation") out.rotation = value[0] ?? 0;
    else if (property === "scale") out.scale = [value[0] ?? 1, value[1] ?? 1];
    return out;
};

const patchStandardMaterialExtensions = (material: StandardMaterial, update: (extensions: StandardMaterialExtensionsDescriptor) => void): void => {
    const extensions = material.extensions as unknown as StandardMaterialExtensionsDescriptor;
    update(extensions);
    material.setExtensions(extensions);
};

const makeStandardExtensionValueTarget = (material: Material, extensionName: keyof StandardMaterialExtensionsDescriptor, valueSize: number, update: (extension: any, value: Float32Array) => void, allowDuplicateTarget: boolean = false): AnimationPointerTarget | null => {
    if (!(material instanceof StandardMaterial)) return null;
    const extensions = material.extensions as any;
    if (!extensions[extensionName]) return null;
    return {
        kind: "pointer",
        canonical: "",
        valueSize,
        allowDuplicateTarget,
        setValue: (value: Float32Array): void => {
            patchStandardMaterialExtensions(material, (next) => {
                const extension = (next as any)[extensionName];
                if (extension) update(extension, value);
            });
        }
    };
};

const makeStandardExtensionTextureTransformTarget = (material: Material, extensionName: keyof StandardMaterialExtensionsDescriptor, transformField: string, property: string): AnimationPointerTarget | null => {
    const valueSize = getTextureTransformValueSize(property);
    if (valueSize === null) return null;
    return makeStandardExtensionValueTarget(material, extensionName, valueSize, (extension, value) => { extension[transformField] = makeTextureTransformPatch(extension[transformField], property, value); }, true);
};

const resolveMaterialTextureTransformPointer = (material: Material, slot: string, property: string): AnimationPointerTarget | null => {
    const valueSize = getTextureTransformValueSize(property);
    if (valueSize === null) return null;
    const setTransform = (getCurrent: () => TextureTransformDescriptor, setCurrent: (next: TextureTransformDescriptor) => void): AnimationPointerTarget => ({
        kind: "pointer",
        canonical: "",
        valueSize,
        allowDuplicateTarget: true,
        setValue: (value: Float32Array): void => setCurrent(makeTextureTransformPatch(getCurrent(), property, value))
    });
    if (slot === "baseColorTexture" && (material instanceof StandardMaterial || material instanceof UnlitMaterial)) return setTransform(() => material.baseColorTextureTransform, (next) => { material.baseColorTextureTransform = next; });
    if (!(material instanceof StandardMaterial)) return null;
    switch (slot) {
        case "metallicRoughnessTexture":
            return setTransform(() => material.metallicRoughnessTextureTransform, (next) => { material.metallicRoughnessTextureTransform = next; });
        case "normalTexture":
            return setTransform(() => material.normalTextureTransform, (next) => { material.normalTextureTransform = next; });
        case "occlusionTexture":
            return setTransform(() => material.occlusionTextureTransform, (next) => { material.occlusionTextureTransform = next; });
        case "emissiveTexture":
            return setTransform(() => material.emissiveTextureTransform, (next) => { material.emissiveTextureTransform = next; });
        default:
            return null;
    }
};

const hasTextureTransformExtension = (info: any | undefined): boolean => {
    return !!info?.extensions?.KHR_texture_transform;
};

const resolveMaterialPointer = (ctx: AnimationPointerContext, tokens: readonly string[], canonical: string): AnimationPointerTarget | null => {
    const materialIndex = parsePointerIndex(tokens, 1);
    const matJson = materialIndex !== null ? ctx.json.materials?.[materialIndex] : undefined;
    const material = materialIndex !== null ? ctx.materialCache.get(materialIndex) : undefined;
    if (materialIndex === null || !matJson || !material) {
        warn(ctx.opts, `KHR_animation_pointer: material pointer '${canonical}' does not resolve to an imported runtime material.`);
        return null;
    }
    const withCanonical = (target: AnimationPointerTarget | null): AnimationPointerTarget | null => {
        if (target) target.canonical = canonical;
        return target;
    };
    const pbr = matJson.pbrMetallicRoughness;
    if (tokens[2] === "pbrMetallicRoughness") {
        if (!pbr) return null;
        if (tokens.length === 4 && tokens[3] === "baseColorFactor" && (material instanceof StandardMaterial || material instanceof UnlitMaterial)) {
            return withCanonical({
                kind: "pointer",
                canonical,
                valueSize: 4,
                setValue: (value) => {
                    material.color = [value[0] ?? 1, value[1] ?? 1, value[2] ?? 1];
                    material.opacity = value[3] ?? 1;
                }
            });
        }
        if (tokens.length === 4 && tokens[3] === "metallicFactor" && material instanceof StandardMaterial) return withCanonical({ kind: "pointer", canonical, valueSize: 1, setValue: (value) => { material.metallic = value[0] ?? 0; } });
        if (tokens.length === 4 && tokens[3] === "roughnessFactor" && material instanceof StandardMaterial) return withCanonical({ kind: "pointer", canonical, valueSize: 1, setValue: (value) => { material.roughness = value[0] ?? 1; } });
        if (tokens.length === 7 && tokens[4] === "extensions" && tokens[5] === "KHR_texture_transform" && hasTextureTransformExtension((pbr as any)[tokens[3]!])) return withCanonical(resolveMaterialTextureTransformPointer(material, tokens[3]!, tokens[6]!));
        return null;
    }
    if (tokens.length === 3 && tokens[2] === "alphaCutoff" && (material instanceof StandardMaterial || material instanceof UnlitMaterial)) return withCanonical({ kind: "pointer", canonical, valueSize: 1, setValue: (value) => { material.alphaCutoff = value[0] ?? 0; } });
    if (tokens.length === 3 && tokens[2] === "emissiveFactor" && material instanceof StandardMaterial) return withCanonical({ kind: "pointer", canonical, valueSize: 3, setValue: (value) => { material.emissive = [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0]; } });
    if (tokens.length === 4 && tokens[2] === "normalTexture" && tokens[3] === "scale" && matJson.normalTexture && material instanceof StandardMaterial) return withCanonical({ kind: "pointer", canonical, valueSize: 1, setValue: (value) => { material.normalScale = value[0] ?? 1; } });
    if (tokens.length === 4 && tokens[2] === "occlusionTexture" && tokens[3] === "strength" && matJson.occlusionTexture && material instanceof StandardMaterial) return withCanonical({ kind: "pointer", canonical, valueSize: 1, setValue: (value) => { material.occlusionStrength = value[0] ?? 1; } });
    if (tokens.length === 6 && tokens[3] === "extensions" && tokens[4] === "KHR_texture_transform" && hasTextureTransformExtension((matJson as any)[tokens[2]!])) return withCanonical(resolveMaterialTextureTransformPointer(material, tokens[2]!, tokens[5]!));
    if (tokens[2] !== "extensions" || tokens.length < 5) return null;
    const extensions = matJson.extensions as any;
    const extName = tokens[3]!;
    const extJson = extensions?.[extName];
    if (!extJson || !(material instanceof StandardMaterial)) return null;
    const prop = tokens[4]!;
    const standardExt = material.extensions as any;
    if (tokens.length === 5) {
        switch (extName) {
            case "KHR_materials_anisotropy":
                if (prop === "anisotropyStrength") return withCanonical(makeStandardExtensionValueTarget(material, "anisotropy", 1, (ext, value) => { ext.strength = value[0] ?? 0; }));
                if (prop === "anisotropyRotation") return withCanonical(makeStandardExtensionValueTarget(material, "anisotropy", 1, (ext, value) => { ext.rotation = value[0] ?? 0; }));
                break;
            case "KHR_materials_clearcoat":
                if (prop === "clearcoatFactor") return withCanonical(makeStandardExtensionValueTarget(material, "clearcoat", 1, (ext, value) => { ext.factor = value[0] ?? 0; }));
                if (prop === "clearcoatRoughnessFactor") return withCanonical(makeStandardExtensionValueTarget(material, "clearcoat", 1, (ext, value) => { ext.roughness = value[0] ?? 0; }));
                break;
            case "KHR_materials_dispersion":
                if (prop === "dispersion") return withCanonical(makeStandardExtensionValueTarget(material, "dispersion", 1, (ext, value) => { ext.dispersion = value[0] ?? 0; }));
                break;
            case "KHR_materials_emissive_strength":
                if (prop === "emissiveStrength") return withCanonical(makeStandardExtensionValueTarget(material, "emissiveStrength", 1, (ext, value) => { ext.strength = value[0] ?? 1; }));
                break;
            case "KHR_materials_ior":
                if (prop === "ior") return withCanonical(makeStandardExtensionValueTarget(material, "ior", 1, (ext, value) => { ext.ior = value[0] ?? 1.5; }));
                break;
            case "KHR_materials_iridescence":
                if (prop === "iridescenceFactor") return withCanonical(makeStandardExtensionValueTarget(material, "iridescence", 1, (ext, value) => { ext.factor = value[0] ?? 0; }));
                if (prop === "iridescenceIor") return withCanonical(makeStandardExtensionValueTarget(material, "iridescence", 1, (ext, value) => { ext.ior = value[0] ?? 1.3; }));
                if (prop === "iridescenceThicknessMinimum") return withCanonical(makeStandardExtensionValueTarget(material, "iridescence", 1, (ext, value) => { ext.thicknessMinimum = value[0] ?? 100; }));
                if (prop === "iridescenceThicknessMaximum") return withCanonical(makeStandardExtensionValueTarget(material, "iridescence", 1, (ext, value) => { ext.thicknessMaximum = value[0] ?? 400; }));
                break;
            case "KHR_materials_sheen":
                if (prop === "sheenColorFactor") return withCanonical(makeStandardExtensionValueTarget(material, "sheen", 3, (ext, value) => { ext.color = [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0]; }));
                if (prop === "sheenRoughnessFactor") return withCanonical(makeStandardExtensionValueTarget(material, "sheen", 1, (ext, value) => { ext.roughness = value[0] ?? 0; }));
                break;
            case "KHR_materials_specular":
                if (prop === "specularFactor") return withCanonical(makeStandardExtensionValueTarget(material, "specular", 1, (ext, value) => { ext.factor = value[0] ?? 1; }));
                if (prop === "specularColorFactor") return withCanonical(makeStandardExtensionValueTarget(material, "specular", 3, (ext, value) => { ext.color = [value[0] ?? 1, value[1] ?? 1, value[2] ?? 1]; }));
                break;
            case "KHR_materials_transmission":
                if (prop === "transmissionFactor") return withCanonical(makeStandardExtensionValueTarget(material, "transmission", 1, (ext, value) => { ext.factor = value[0] ?? 0; }));
                break;
            case "KHR_materials_volume":
                if (prop === "thicknessFactor") return withCanonical(makeStandardExtensionValueTarget(material, "volume", 1, (ext, value) => { ext.thicknessFactor = value[0] ?? 0; }));
                if (prop === "attenuationDistance") return withCanonical(makeStandardExtensionValueTarget(material, "volume", 1, (ext, value) => { ext.attenuationDistance = value[0] ?? Infinity; }));
                if (prop === "attenuationColor") return withCanonical(makeStandardExtensionValueTarget(material, "volume", 3, (ext, value) => { ext.attenuationColor = [value[0] ?? 1, value[1] ?? 1, value[2] ?? 1]; }));
                break;
            case "KHR_materials_diffuse_transmission":
                if (prop === "diffuseTransmissionFactor") return withCanonical(makeStandardExtensionValueTarget(material, "diffuseTransmission", 1, (ext, value) => { ext.factor = value[0] ?? 0; }));
                if (prop === "diffuseTransmissionColorFactor") return withCanonical(makeStandardExtensionValueTarget(material, "diffuseTransmission", 3, (ext, value) => { ext.color = [value[0] ?? 1, value[1] ?? 1, value[2] ?? 1]; }));
                break;
        }
    }
    if (tokens.length === 6 && tokens[5] === "scale" && extName === "KHR_materials_clearcoat" && prop === "clearcoatNormalTexture" && extJson.clearcoatNormalTexture && standardExt.clearcoat) return withCanonical(makeStandardExtensionValueTarget(material, "clearcoat", 1, (ext, value) => { ext.normalScale = value[0] ?? 1; }));
    if (tokens.length === 8 && tokens[5] === "extensions" && tokens[6] === "KHR_texture_transform" && hasTextureTransformExtension(extJson[prop])) {
        const transformFields: Record<string, Record<string, string>> = {
            KHR_materials_anisotropy: { anisotropyTexture: "textureTransform" },
            KHR_materials_clearcoat: { clearcoatTexture: "textureTransform", clearcoatRoughnessTexture: "roughnessTextureTransform", clearcoatNormalTexture: "normalTextureTransform" },
            KHR_materials_iridescence: { iridescenceTexture: "textureTransform", iridescenceThicknessTexture: "thicknessTextureTransform" },
            KHR_materials_sheen: { sheenColorTexture: "colorTextureTransform", sheenRoughnessTexture: "roughnessTextureTransform" },
            KHR_materials_specular: { specularTexture: "textureTransform", specularColorTexture: "colorTextureTransform" },
            KHR_materials_transmission: { transmissionTexture: "textureTransform" },
            KHR_materials_volume: { thicknessTexture: "thicknessTextureTransform" },
            KHR_materials_diffuse_transmission: { diffuseTransmissionTexture: "textureTransform", diffuseTransmissionColorTexture: "colorTextureTransform" }
        };
        const extensionFields: Record<string, keyof StandardMaterialExtensionsDescriptor> = {
            KHR_materials_anisotropy: "anisotropy",
            KHR_materials_clearcoat: "clearcoat",
            KHR_materials_iridescence: "iridescence",
            KHR_materials_sheen: "sheen",
            KHR_materials_specular: "specular",
            KHR_materials_transmission: "transmission",
            KHR_materials_volume: "volume",
            KHR_materials_diffuse_transmission: "diffuseTransmission"
        };
        const transformField = transformFields[extName]?.[prop];
        const extensionField = extensionFields[extName];
        if (transformField && extensionField) return withCanonical(makeStandardExtensionTextureTransformTarget(material, extensionField, transformField, tokens[7]!));
    }
    return null;
};

const resolveNodePointer = (ctx: AnimationPointerContext, tokens: readonly string[], canonical: string): AnimationPointerTarget | null => {
    const nodeIndex = parsePointerIndex(tokens, 1);
    const importedNode = nodeIndex !== null ? ctx.nodes[nodeIndex] : undefined;
    const nodeJson = nodeIndex !== null ? ctx.json.nodes?.[nodeIndex] : undefined;
    if (nodeIndex === null || !importedNode || !nodeJson) {
        warn(ctx.opts, `KHR_animation_pointer: node pointer '${canonical}' does not resolve to an imported node.`);
        return null;
    }
    if (tokens.length === 3) {
        const path = tokens[2];
        if (path === "translation") return { kind: "trs", canonical, targetIndex: importedNode.transform.index >>> 0, pathCode: 0 };
        if (path === "rotation") {
            if (nodeJson.matrix) return null;
            return { kind: "trs", canonical, targetIndex: importedNode.transform.index >>> 0, pathCode: 1 };
        }
        if (path === "scale") {
            if (nodeJson.matrix) return null;
            return { kind: "trs", canonical, targetIndex: importedNode.transform.index >>> 0, pathCode: 2 };
        }
        if (path === "weights") {
            const morphMeshes = importedNode.meshes.filter((mesh) => mesh.geometry.morphTargets.length > 0);
            return morphMeshes.length > 0 ? { kind: "weights", canonical, meshes: morphMeshes } : null;
        }
    }
    if (tokens.length === 4 && tokens[2] === "weights") {
        const weightIndex = parsePointerIndex(tokens, 3);
        if (weightIndex === null) return null;
        const morphMeshes = importedNode.meshes.filter((mesh) => mesh.geometry.morphTargets.length > weightIndex);
        if (morphMeshes.length === 0) return null;
        return {
            kind: "pointer",
            canonical,
            valueSize: 1,
            setValue: (value) => {
                const weight = value[0] ?? 0;
                for (const mesh of morphMeshes) setMeshMorphWeight(mesh, weightIndex, weight);
            }
        };
    }
    if (tokens.length === 5 && tokens[2] === "extensions" && tokens[3] === "KHR_node_visibility" && tokens[4] === "visible") {
        if (!nodeJson.extensions?.["KHR_node_visibility"]) return null;
        return {
            kind: "pointer",
            canonical,
            valueSize: 1,
            requiresStep: true,
            setValue: (value) => { importedNode.visible = (value[0] ?? 0) !== 0; }
        };
    }
    return null;
};

const resolveCameraPointer = (ctx: AnimationPointerContext, tokens: readonly string[], canonical: string): AnimationPointerTarget | null => {
    const cameraIndex = parsePointerIndex(tokens, 1);
    const cameraJson = cameraIndex !== null ? ctx.json.cameras?.[cameraIndex] : undefined;
    const cameras = cameraIndex !== null ? ctx.cameraRuntimeMap.get(cameraIndex) ?? [] : [];
    if (cameraIndex === null || !cameraJson || cameras.length === 0) return null;
    if (tokens.length !== 4) return null;
    const family = tokens[2];
    const prop = tokens[3];
    if (family === "perspective" && cameraJson.type === "perspective") {
        const perspectiveCameras = cameras.filter((camera): camera is PerspectiveCamera => camera instanceof PerspectiveCamera);
        if (perspectiveCameras.length === 0) return null;
        if (prop === "aspectRatio" && cameraJson.perspective?.aspectRatio === undefined) return null;
        if (prop === "zfar" && cameraJson.perspective?.zfar === undefined) return null;
        const setters: Record<string, (camera: PerspectiveCamera, value: number) => void> = {
            aspectRatio: (camera, value) => { camera.aspect = value; },
            yfov: (camera, value) => { camera.fov = (value * 180) / Math.PI; },
            znear: (camera, value) => { camera.near = value; },
            zfar: (camera, value) => { camera.far = value; }
        };
        const setter = setters[prop];
        if (!setter) return null;
        return { kind: "pointer", canonical, valueSize: 1, setValue: (value) => { for (const camera of perspectiveCameras) setter(camera, value[0] ?? 0); } };
    }
    if (family === "orthographic" && cameraJson.type === "orthographic") {
        const orthographicCameras = cameras.filter((camera): camera is OrthographicCamera => camera instanceof OrthographicCamera);
        if (orthographicCameras.length === 0) return null;
        const setters: Record<string, (camera: OrthographicCamera, value: number) => void> = {
            xmag: (camera, value) => { camera.left = -value; camera.right = value; },
            ymag: (camera, value) => { camera.top = value; camera.bottom = -value; },
            znear: (camera, value) => { camera.near = value; },
            zfar: (camera, value) => { camera.far = value; }
        };
        const setter = setters[prop];
        if (!setter) return null;
        return { kind: "pointer", canonical, valueSize: 1, setValue: (value) => { for (const camera of orthographicCameras) setter(camera, value[0] ?? 0); } };
    }
    return null;
};

const resolveLightPointer = (ctx: AnimationPointerContext, tokens: readonly string[], canonical: string): AnimationPointerTarget | null => {
    if (tokens.length < 5 || tokens[0] !== "extensions" || tokens[1] !== "KHR_lights_punctual" || tokens[2] !== "lights") return null;
    const lightIndex = parsePointerIndex(tokens, 3);
    const root = getKHRLightsFromRoot(ctx.json);
    const lightJson = lightIndex !== null ? root?.lights?.[lightIndex] : undefined;
    const lights = lightIndex !== null ? ctx.lightRuntimeMap.get(lightIndex) ?? [] : [];
    if (lightIndex === null || !lightJson || lights.length === 0) return null;
    if (tokens.length === 5) {
        const prop = tokens[4];
        if (prop === "color") return { kind: "pointer", canonical, valueSize: 3, setValue: (value) => { for (const light of lights) light.color = [value[0] ?? 1, value[1] ?? 1, value[2] ?? 1]; } };
        if (prop === "intensity") return { kind: "pointer", canonical, valueSize: 1, setValue: (value) => { for (const light of lights) light.intensity = value[0] ?? 1; } };
        if (prop === "range") {
            const rangedLights = lights.filter((light): light is PointLight | SpotLight => light instanceof PointLight || light instanceof SpotLight);
            if (rangedLights.length === 0) return null;
            return { kind: "pointer", canonical, valueSize: 1, setValue: (value) => { for (const light of rangedLights) light.range = value[0] ?? 0; } };
        }
    }
    if (tokens.length === 6 && tokens[4] === "spot" && lightJson.type === "spot") {
        const spotLights = lights.filter((light): light is SpotLight => light instanceof SpotLight);
        if (tokens[5] === "innerConeAngle") return { kind: "pointer", canonical, valueSize: 1, setValue: (value) => { for (const light of spotLights) light.innerCone = value[0] ?? 0; } };
        if (tokens[5] === "outerConeAngle") return { kind: "pointer", canonical, valueSize: 1, setValue: (value) => { for (const light of spotLights) light.outerCone = value[0] ?? Math.PI / 4; } };
    }
    return null;
};

const canonicalizePointerTokens = (tokens: readonly string[]): string => {
    return `/${tokens.map((token) => token.replace(/~/g, "~0").replace(/\//g, "~1")).join("/")}`;
};

const resolveAnimationPointer = (ctx: AnimationPointerContext, pointer: string): AnimationPointerTarget | null => {
    const tokens = decodeJsonPointer(pointer);
    if (!tokens) {
        warn(ctx.opts, `KHR_animation_pointer: invalid JSON pointer '${pointer}'.`);
        return null;
    }
    const canonical = canonicalizePointerTokens(tokens);
    if (tokens[0] === "nodes") return resolveNodePointer(ctx, tokens, canonical);
    if (tokens[0] === "materials") return resolveMaterialPointer(ctx, tokens, canonical);
    if (tokens[0] === "cameras") return resolveCameraPointer(ctx, tokens, canonical);
    if (tokens[0] === "extensions") return resolveLightPointer(ctx, tokens, canonical);
    return null;
};

const trackAnimationTarget = (seen: Set<string>, canonical: string, animationName: string, opts: ImportGltfOptions, allowDuplicateTarget: boolean): void => {
    const weightElementMatch = canonical.match(/^\/nodes\/(\d+)\/weights\/(\d+)$/);
    const weightBase = weightElementMatch ? `/nodes/${weightElementMatch[1]}/weights` : canonical.match(/^\/nodes\/(\d+)\/weights$/)?.[0] ?? null;
    for (const target of seen) {
        if (target === canonical) {
            if (!allowDuplicateTarget) throw new Error(`glTF animation '${animationName}' targets '${canonical}' more than once.`);
            warn(opts, `KHR_animation_pointer: animation '${animationName}' targets '${canonical}' more than once; applying duplicate pointer channels in file order.`);
            continue;
        }
        if (weightBase && (canonical === weightBase ? target.startsWith(`${weightBase}/`) : target === weightBase)) throw new Error(`glTF animation '${animationName}' targets overlapping morph weight paths '${target}' and '${canonical}'.`);
    }
    seen.add(canonical);
};

const parseAnimations = (doc: GltfDocument, json: GltfRoot, nodes: GltfImportedNode[], materialCache: Map<number, Material>, cameraRuntimeMap: Map<number, Camera[]>, lightRuntimeMap: Map<number, Light[]>, extensions: GltfImportExtensionsMetadata, opts: ImportGltfOptions): ImportedAnimation[] => {
    const anims = json.animations ?? [];
    const out: ImportedAnimation[] = [];
    const interpToCode = (interp: string): number => {
        switch (interp) {
            case "STEP": return 0;
            case "CUBICSPLINE": return 2;
            case "LINEAR":
            default: return 1;
        }
    };
    const pathToCode = (path: ImportedAnimationChannel["path"]): number => {
        switch (path) {
            case "translation": return 0;
            case "rotation": return 1;
            case "scale": return 2;
            default: return -1;
        }
    };
    try {
        for (let i = 0; i < anims.length; i++) {
            const a: GltfAnimation = anims[i]!;
            const samplers: ImportedAnimationSampler[] = [];
            const valueSamplers: Array<{ interpolation: "LINEAR" | "STEP" | "CUBICSPLINE"; input: Float32Array; output: Float32Array; valueSize: number }> = [];
            const pointerChannels: AnimationPointerChannel[] = [];
            const channels: ImportedAnimationChannel[] = [];
            const seenTargets = new Set<string>();
            const animationName = a.name ?? `anim_${i}`;
            const samplerCount = a.samplers.length | 0;
            const ownedF32Allocs: { ptr: WasmPtr; len: number }[] = [];
            const ownedU32Allocs: { ptr: WasmPtr; len: number }[] = [];
            const allocOwnedF32 = (len: number, label: string): WasmPtr => {
                const length = len >>> 0;
                const ptr = wasm.allocF32(length) as WasmPtr;
                if (!ptr && length !== 0) throw new Error(`${label}: WebAssembly f32 allocation failed (${length} elements).`);
                if (ptr) ownedF32Allocs.push({ ptr, len: length });
                return ptr;
            };
            const allocOwnedU32 = (len: number, label: string): WasmPtr => {
                const length = len >>> 0;
                const ptr = wasm.allocU32(length) as WasmPtr;
                if (!ptr && length !== 0) throw new Error(`${label}: WebAssembly u32 allocation failed (${length} elements).`);
                if (ptr) ownedU32Allocs.push({ ptr, len: length });
                return ptr;
            };
            let samplerTablePtr = 0 as WasmPtr;
            let allocationsTransferred = false;
            try {
                if (samplerCount > 0) samplerTablePtr = allocOwnedU32(samplerCount * 5, `animation '${animationName}' samplers`);
                let startTime = Number.POSITIVE_INFINITY;
                let endTime = Number.NEGATIVE_INFINITY;
                for (let si = 0; si < a.samplers.length; si++) {
                    const s: GltfAnimationSampler = a.samplers[si]!;
                    const input = readAccessorAsFloat32(doc, s.input);
                    const outView = readAccessor(doc, s.output);
                    const output = readAccessorAsFloat32(doc, s.output);
                    samplers.push({ interpolation: (s.interpolation ?? "LINEAR") as ImportedAnimationSampler["interpolation"], input, output });
                    const interpolation = (s.interpolation ?? "LINEAR") as ImportedAnimationSampler["interpolation"];
                    const denom = interpolation === "CUBICSPLINE" ? Math.max(1, (input.length | 0) * 3) : Math.max(1, input.length | 0);
                    const valueSize = Math.max(0, Math.floor(output.length / denom));
                    valueSamplers.push({ interpolation, input, output, valueSize });
                    if (input.length > 0) {
                        startTime = Math.min(startTime, input[0]!);
                        endTime = Math.max(endTime, input[input.length - 1]!);
                    }
                    if (samplerCount > 0) {
                        const timesPtr = allocOwnedF32(input.length, `animation '${animationName}' sampler ${si} times`);
                        wasm.f32view(timesPtr, input.length).set(input);
                        const valuesPtr = allocOwnedF32(output.length, `animation '${animationName}' sampler ${si} values`);
                        wasm.f32view(valuesPtr, output.length).set(output);
                        const samplerTable = wasm.u32view(samplerTablePtr, samplerCount * 5);
                        const base = si * 5;
                        samplerTable[base + 0] = timesPtr >>> 0;
                        samplerTable[base + 1] = (input.length | 0) >>> 0;
                        samplerTable[base + 2] = valuesPtr >>> 0;
                        samplerTable[base + 3] = (outView.numComponents | 0) >>> 0;
                        samplerTable[base + 4] = interpToCode(s.interpolation ?? "LINEAR") >>> 0;
                    }
                }
                const runtimeChannels: { sampler: number; targetIndex: number; pathCode: number }[] = [];
                const runtimeWeightChannels: { sampler: number; meshes: Mesh[] }[] = [];
                const pointerContext: AnimationPointerContext = { json, nodes, materialCache, cameraRuntimeMap, lightRuntimeMap, opts };
                for (let ci = 0; ci < a.channels.length; ci++) {
                    const c: GltfAnimationChannel = a.channels[ci]!;
                    const nodeIndex = c.target.node;
                    const importedNode = nodeIndex !== undefined ? nodes[nodeIndex] ?? null : null;
                    const t = importedNode?.transform ?? null;
                    const chan: ImportedAnimationChannel = {
                        sampler: c.sampler | 0,
                        targetNode: t,
                        path: c.target.path
                    };
                    if (c.target.path === "pointer") chan.targetPointer = getChannelPointer(c) ?? undefined;
                    channels.push(chan);
                    if (c.target.path === "pointer") {
                        if (nodeIndex !== undefined) { reportAnimationPointerLoss(json, extensions, opts, `animation '${animationName}' channel ${ci} sets target.node; skipping pointer channel.`); continue; }
                        const pointer = getChannelPointer(c);
                        if (!pointer) { reportAnimationPointerLoss(json, extensions, opts, `animation '${animationName}' channel ${ci} is missing extensions.KHR_animation_pointer.pointer.`); continue; }
                        const resolved = resolveAnimationPointer(pointerContext, pointer);
                        if (!resolved) { reportAnimationPointerLoss(json, extensions, opts, `animation '${animationName}' channel ${ci} pointer '${pointer}' is not supported by this importer.`); continue; }
                        trackAnimationTarget(seenTargets, resolved.canonical, animationName, opts, resolved.kind === "pointer" && resolved.allowDuplicateTarget === true);
                        if (resolved.kind === "trs") {
                            runtimeChannels.push({
                                sampler: chan.sampler | 0,
                                targetIndex: resolved.targetIndex,
                                pathCode: resolved.pathCode
                            });
                            continue;
                        }
                        if (resolved.kind === "weights") {
                            runtimeWeightChannels.push({ sampler: chan.sampler | 0, meshes: resolved.meshes });
                            continue;
                        }
                        const sampler = valueSamplers[chan.sampler];
                        if (!sampler) { reportAnimationPointerLoss(json, extensions, opts, `animation '${animationName}' channel ${ci} references missing sampler ${chan.sampler}.`); continue; }
                        if (resolved.requiresStep && sampler.interpolation !== "STEP") { reportAnimationPointerLoss(json, extensions, opts, `boolean pointer '${resolved.canonical}' requires STEP interpolation; skipping channel.`); continue; }
                        if ((sampler.valueSize | 0) !== (resolved.valueSize | 0)) { reportAnimationPointerLoss(json, extensions, opts, `pointer '${resolved.canonical}' expects ${resolved.valueSize} output component(s), got ${sampler.valueSize}; skipping channel.`); continue; }
                        pointerChannels.push({
                            sampler: chan.sampler | 0,
                            scratch: new Float32Array(resolved.valueSize),
                            setValue: resolved.setValue
                        });
                        continue;
                    }
                    const pathCode = pathToCode(chan.path);
                    if (t && pathCode >= 0) {
                        if (nodeIndex !== undefined) trackAnimationTarget(seenTargets, `/nodes/${nodeIndex}/${chan.path}`, animationName, opts, false);
                        runtimeChannels.push({
                            sampler: chan.sampler | 0,
                            targetIndex: t.index >>> 0,
                            pathCode
                        });
                    } else if (chan.path === "weights" && nodeIndex !== undefined) {
                        trackAnimationTarget(seenTargets, `/nodes/${nodeIndex}/weights`, animationName, opts, false);
                        const meshes = (nodes[nodeIndex]?.meshes ?? []).filter((mesh) => mesh.geometry.morphTargets.length > 0);
                        if (meshes.length > 0) runtimeWeightChannels.push({ sampler: chan.sampler | 0, meshes });
                    }
                }
                let clip: AnimationClip | null = null;
                const channelCount = runtimeChannels.length | 0;
                const weightChannelCount = runtimeWeightChannels.length | 0;
                const pointerChannelCount = pointerChannels.length | 0;
                if (samplerCount > 0 && (channelCount > 0 || weightChannelCount > 0 || pointerChannelCount > 0)) {
                    let channelsPtr = 0 as WasmPtr;
                    if (channelCount > 0) {
                        channelsPtr = allocOwnedU32(channelCount * 3, `animation '${animationName}' channels`);
                        const ch = wasm.u32view(channelsPtr, channelCount * 3);
                        for (let ci = 0; ci < channelCount; ci++) {
                            const rc = runtimeChannels[ci]!;
                            const base = ci * 3;
                            ch[base + 0] = rc.sampler >>> 0;
                            ch[base + 1] = rc.targetIndex >>> 0;
                            ch[base + 2] = rc.pathCode >>> 0;
                        }
                    }
                    if (!Number.isFinite(startTime)) startTime = 0;
                    if (!Number.isFinite(endTime)) endTime = 0;
                    clip = new AnimationClip({
                        name: a.name ?? `anim_${i}`,
                        samplerCount,
                        channelCount,
                        samplersPtr: samplerTablePtr,
                        channelsPtr,
                        startTime,
                        endTime,
                        ownedF32Allocs,
                        ownedU32Allocs,
                        weightSamplers: valueSamplers,
                        weightChannels: runtimeWeightChannels.map((channel) => ({
                            sampler: channel.sampler,
                            meshes: channel.meshes,
                            scratch: new Float32Array(valueSamplers[channel.sampler]?.valueSize ?? 0)
                        })),
                        pointerSamplers: valueSamplers as AnimationPointerSampler[],
                        pointerChannels
                    });
                }
                out.push({ name: a.name, samplers, channels, clip });
                allocationsTransferred = clip !== null;
            } finally {
                if (!allocationsTransferred) {
                    for (let ai = ownedF32Allocs.length - 1; ai >= 0; ai--) wasm.freeF32(ownedF32Allocs[ai]!.ptr, ownedF32Allocs[ai]!.len);
                    for (let ai = ownedU32Allocs.length - 1; ai >= 0; ai--) wasm.freeU32(ownedU32Allocs[ai]!.ptr, ownedU32Allocs[ai]!.len);
                }
            }
        }
    } catch (error) {
        for (const animation of out) animation.clip?.dispose();
        throw error;
    }
    return out;
};

export const importGltf = (doc: GltfDocument, opts: ImportGltfOptions = {}): GltfImportResult => {
    const json = doc.json;
    validateGltfCompatibility(json);
    const { metadata: extensions, assessments } = buildExtensionsMetadata(json, opts);
    enforceRequiredExtensions(json, extensions, assessments);
    const scene = opts.targetScene ?? new Scene();
    const addToScene = opts.addToScene !== false;
    const sceneIndex = getSceneIndex(json, opts);
    const gltfNodes = json.nodes ?? [];
    const nodes: GltfImportedNode[] = new Array(gltfNodes.length);
    for (let i = 0; i < gltfNodes.length; i++) {
        const n: GltfNode = gltfNodes[i]!;
        const t = new Transform();
        if (n.matrix && n.matrix.length >= 16) applyNodeMatrixViaWasmDecompose(t, n.matrix);
        else {
            const tr = n.translation ?? [0, 0, 0];
            const ro = n.rotation ?? [0, 0, 0, 1];
            const sc = n.scale ?? [1, 1, 1];
            t.setPosition(tr[0], tr[1], tr[2]);
            t.setRotation(ro[0], ro[1], ro[2], ro[3]);
            t.setScale(sc[0], sc[1], sc[2]);
        }
        nodes[i] = new GltfImportedNode(i, t, n);
    }
    for (let i = 0; i < gltfNodes.length; i++) {
        const n = gltfNodes[i]!;
        const parentNode = nodes[i]!;
        for (const child of n.children ?? []) {
            const childNode = nodes[child];
            if (childNode) {
                childNode.transform.setParent(parentNode.transform);
                childNode.parentIndex = i;
                childNode.setParentNode(parentNode);
            }
            else warn(opts, `Node ${i} child ${child} missing transform`);
        }
    }
    const xmp = buildXmpMetadata(json);
    const variantsController = createVariantsController(getDeclaredVariants(json, xmp.packets));
    const skins = parseSkins(doc, json, nodes, opts);
    const materialCache = new Map<number, Material>();
    const textureCache = new Map<number, Texture2D>();
    const geometryCache = new Map<string, Geometry | null>();
    const meshes: Mesh[] = [];
    const splatFields: SplatField[] = [];
    const cameras: Camera[] = [];
    const lights: Light[] = [];
    const cameraRuntimeMap = new Map<number, Camera[]>();
    const lightRuntimeMap = new Map<number, Light[]>();
    const khrLights = getKHRLightsFromRoot(json);
    const instantiateNodeRecursive = (nodeIndex: number, inheritedSkinIndex: number | undefined): void => {
        const node = gltfNodes[nodeIndex];
        if (!node) return;
        const importedNode = nodes[nodeIndex];
        const nodeT = importedNode?.transform;
        if (!importedNode || !nodeT) return;
        if (node.extensions?.[EXT_MESH_GPU_INSTANCING] !== undefined && !isExtensionRequired(json, EXT_MESH_GPU_INSTANCING)) warn(opts, `Node ${node.name ?? nodeIndex}: ignoring optional ${EXT_MESH_GPU_INSTANCING}; using the single core node instance because instancing is deferred.`);
        const createdObjects = instantiateMeshNode(doc, json, nodeIndex, node, nodeT, materialCache, textureCache, geometryCache, variantsController, extensions, opts);
        const createdMeshes = createdObjects.meshes;
        const createdSplatFields = createdObjects.splatFields;
        importedNode.meshes = createdMeshes;
        importedNode.splatFields = createdSplatFields;
        importedNode.applyVisibility();
        const skinIndex = node.skin !== undefined ? (node.skin | 0) : inheritedSkinIndex;
        if (skinIndex !== undefined) {
            const skinDef = skins[skinIndex];
            if (!skinDef || !skinDef.runtime) warn(opts, `nodes[${nodeIndex}].skin=${skinIndex} missing or invalid; skipping skin binding`);
            else {
                for (const m of createdMeshes) {
                    if (m.geometry.joints === null || m.geometry.weights === null) { warn(opts, `Mesh '${m.name}' is skinned (node.skin) but is missing JOINTS_0/WEIGHTS_0; it will render unskinned.`); continue; }
                    m.skin = skinDef.runtime.createInstance(m.transform);
                }
            }
        }
        for (const m of createdMeshes) { meshes.push(m); if (addToScene) scene.add(m); }
        for (const s of createdSplatFields) { splatFields.push(s); if (addToScene) scene.add(s); }
        if (opts.importCameras) { const cam = instantiateCameraNode(json, node, nodeT, opts); if (cam) { cameras.push(cam); importedNode.camera = cam; if (node.camera !== undefined) { const cameraIndex = node.camera | 0; const list = cameraRuntimeMap.get(cameraIndex) ?? []; list.push(cam); cameraRuntimeMap.set(cameraIndex, list); } } }
        if (opts.importLights && khrLights) {
            const nodeLight = getNodeKHRLight(node);
            if (nodeLight) {
                const lightDef = khrLights.lights[nodeLight.light];
                if (!lightDef) warn(opts, `KHR_lights_punctual node references missing light ${nodeLight.light}`);
                else {
                    const created = instantiateLightNode(lightDef, nodeT);
                    if (created) {
                        bindLightToTransform(created, nodeT);
                        lights.push(created);
                        importedNode.light = created;
                        const lightIndex = nodeLight.light | 0;
                        const list = lightRuntimeMap.get(lightIndex) ?? [];
                        list.push(created);
                        lightRuntimeMap.set(lightIndex, list);
                        importedNode.applyVisibility();
                        if (addToScene) scene.addLight(created);
                    } else warn(opts, `Light '${node.name ?? `index ${nodeIndex}`}' has unsupported type '${lightDef.type}' and was skipped.`);
                }
            }
        }
        for (const child of node.children ?? []) instantiateNodeRecursive(child, skinIndex);
    };
    const gltfScene: GltfScene | undefined = json.scenes?.[sceneIndex];
    const roots = gltfScene?.nodes ?? [];
    for (const root of roots) instantiateNodeRecursive(root, undefined);
    const animations = parseAnimations(doc, json, nodes, materialCache, cameraRuntimeMap, lightRuntimeMap, extensions, opts);
    const clips = animations.map((a) => a.clip).filter((c): c is AnimationClip => c !== null);
    const metadata = buildImportMetadata(json, sceneIndex, extensions, xmp, variantsController.public);
    let destroyed = false;
    return {
        scene, meshes, splatFields, nodes, lights, cameras, skins, animations, clips, metadata,
        destroy(): void {
            if (destroyed) return;
            destroyed = true;
            if (addToScene) { for (const m of meshes) scene.remove(m); for (const s of splatFields) scene.remove(s); for (const light of lights) scene.removeLight(light); }
            for (const light of lights) unbindLightTransform(light);
            for (const m of meshes) m.destroy();
            for (const s of splatFields) s.destroy();
            for (const camera of cameras) camera.destroy();
            for (const a of animations) a.clip?.dispose();
            for (const s of skins) s.runtime?.dispose();
            variantsController.destroy();
            for (const tex of textureCache.values()) tex.destroy();
            for (const node of nodes) node.transform.dispose();
        }
    };
};
