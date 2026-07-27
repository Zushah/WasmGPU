# WasmGPU.gltf.import

## Summary
WasmGPU.gltf.import converts a loaded `GltfDocument` into WasmGPU runtime resources. It builds meshes, materials, textures, optional cameras and punctual lights, imported-node wrappers, skins, animation clips, and import metadata in one pass.

## Syntax
```ts
WasmGPU.gltf.import(doc: GltfDocument, options?: ImportGltfOptions): Promise<GltfImportResult>
const result = await wgpu.gltf.import(doc, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `doc` | `GltfDocument` | Yes | Loaded glTF document from [WasmGPU.gltf.load](./wasmgpu-gltf-load.md) or an equivalent source. |
| `options` | `ImportGltfOptions` | No | Optional controls for scene selection, destination scene ownership, normal generation, camera/light import, and warning handling. |

## Returns
`Promise<GltfImportResult>` - Promise that resolves to the imported scene resources and metadata.

## Type Details
### ImportGltfOptions

```ts
type ImportGltfOptions = {
    sceneIndex?: number;
    targetScene?: Scene;
    addToScene?: boolean;
    computeMissingNormals?: boolean;
    importCameras?: boolean;
    importLights?: boolean;
    onWarning?: (message: string) => void;
};
```

#### ImportGltfOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `sceneIndex` | `number` | No | Scene index to import. By default WasmGPU uses the file's `scene` field and falls back to `0`. |
| `targetScene` | `Scene` | No | Existing destination scene. If omitted, import creates a new scene and returns it as `result.scene`. |
| `addToScene` | `boolean` | No | When true or omitted, imported meshes and lights are inserted into the destination scene. Set this to `false` if you want detached runtime objects first. |
| `computeMissingNormals` | `boolean` | No | Controls normal generation for primitives that omit normals. The importer computes missing normals by default; set this to `false` to keep them missing. |
| `importCameras` | `boolean` | No | When true, glTF perspective and orthographic cameras import into runtime camera objects. The default is `false`. |
| `importLights` | `boolean` | No | When true, `KHR_lights_punctual` lights import into runtime light objects. The default is `false`. |
| `onWarning` | `(message: string) => void` | No | Callback for recoverable import warnings such as deferred extensions, missing attributes, or skipped channels. |

### GltfImportResult

```ts
type GltfImportResult = {
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
```

#### GltfImportResult Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `scene` | `Scene` | Yes | Destination scene used by the import. This is either `targetScene` or a new scene created for the import. |
| `meshes` | `Mesh[]` | Yes | Imported runtime meshes. Each glTF primitive becomes one WasmGPU mesh. |
| `splatFields` | `SplatField[]` | Yes | Native Gaussian splat fields imported from supported `KHR_gaussian_splatting` point primitives. |
| `nodes` | `GltfImportedNode[]` | Yes | Imported node wrappers for hierarchy traversal, visibility control, and access to attached meshes, splat fields, cameras, and lights. |
| `lights` | `Light[]` | Yes | Imported punctual lights when `importLights` is enabled. |
| `cameras` | `Camera[]` | Yes | Imported cameras when `importCameras` is enabled. |
| `skins` | `ImportedSkin[]` | Yes | Imported skin definitions and their runtime `Skin` objects. |
| `animations` | `ImportedAnimation[]` | Yes | Imported animation descriptions. `clip` is `null` when the importer could not build a runtime clip for that entry. |
| `clips` | `AnimationClip[]` | Yes | Convenience list of the non-null runtime clips from `animations`. |
| `metadata` | `GltfImportMetadata` | Yes | Preserved glTF provenance, extension support states, XMP packets, and material-variant controls. |
| `destroy` | `() => void` | Yes | Deterministically disposes imported animation clips and skin runtimes and releases meshes, splat fields, cameras, textures, and imported transforms. If the import added objects to a scene, `destroy()` also removes them. |

### GltfImportedNode

```ts
class GltfImportedNode {
    readonly index: number;
    name?: string;
    readonly transform: Transform;
    parentIndex: number | null;
    children: number[];
    meshes: Mesh[];
    splatFields: SplatField[];
    camera: Camera | null;
    light: Light | null;
    visible: boolean;
    readonly effectiveVisible: boolean;
}
```

#### GltfImportedNode Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Original glTF node index. |
| `name` | `string` | No | Node name from the glTF file, when present. |
| `transform` | `Transform` | Yes | Local transform object created for the imported node. Child transforms are parented to match the glTF hierarchy. |
| `parentIndex` | `number \| null` | Yes | Parent glTF node index, or `null` for roots. |
| `children` | `number[]` | Yes | Child node indices from the imported hierarchy. |
| `meshes` | `Mesh[]` | Yes | Runtime meshes attached to this node. |
| `splatFields` | `SplatField[]` | Yes | Runtime Gaussian splat fields attached to this node. |
| `camera` | `Camera \| null` | Yes | Imported runtime camera attached to this node, if camera import is enabled and the node references one. |
| `light` | `Light \| null` | Yes | Imported runtime light bound to this node, if light import is enabled and the node references one. |
| `visible` | `boolean` | Yes | Local node visibility. This comes from `KHR_node_visibility` when present and can be edited at runtime. |
| `effectiveVisible` | `boolean` | Yes | Resolved visibility after parent propagation. Attached meshes follow this through `mesh.visible`, and attached lights follow it through `light.enabled`. |

`visible` is the node's own flag. `effectiveVisible` also depends on the parent chain, so hiding a parent hides descendant meshes and lights even when a child's own `visible` flag is still `true`. Imported cameras are attached to the same transform hierarchy, but visibility propagation is only applied to meshes and lights.

### ImportedSkin

```ts
type ImportedSkin = {
    name?: string;
    joints: Transform[];
    inverseBindMatrices?: Float32Array;
    skeleton?: Transform;
    runtime: Skin | null;
};
```

`runtime` is the WasmGPU `Skin` object used for actual mesh skinning. It can be `null` when the source skin is present but could not be turned into a valid runtime skin.

### ImportedAnimation

```ts
type ImportedAnimation = {
    name?: string;
    samplers: ImportedAnimationSampler[];
    channels: ImportedAnimationChannel[];
    clip: AnimationClip | null;
};

type ImportedAnimationChannel = {
    sampler: number;
    targetNode: Transform | null;
    path: "translation" | "rotation" | "scale" | "weights" | "pointer";
    targetPointer?: string;
};
```

`clip` drives the supported runtime animation targets for that glTF animation entry. That includes regular node TRS channels, morph-weight playback, and supported `KHR_animation_pointer` channels. Channels that cannot be converted stay visible in `animations`, but they do not necessarily produce a runtime clip.

### GltfImportMetadata

```ts
type GltfImportMetadata = {
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

type GltfImportMetadataRecord = {
    index: number;
    name?: string;
    extras?: unknown;
    extensions?: Record<string, unknown>;
    xmp?: unknown | null;
};

type GltfImportMeshMetadata = GltfImportMetadataRecord & {
    primitives: Array<GltfImportMetadataRecord & { material?: number }>;
};
```

`metadata` preserves import-time provenance instead of only the converted runtime objects. Use it when you need original names, `extras`, extension payloads, per-record XMP packets, primitive-to-material mappings, or a support summary for extensions that the importer saw in the file.

### GltfImportExtensionsMetadata

```ts
type GltfImportExtensionsMetadata = {
    used: string[];
    required: string[];
    support: Record<string, "supported" | "partial" | "deferred" | "unsupported">;
};
```

`support[name]` reports the current importer state for that extension name. Unknown names fall back to `"unsupported"`.

### GltfImportXmpMetadata

```ts
type GltfImportXmpMetadata = {
    packets: unknown[];
    packet: unknown | null;
};
```

`packet` is the asset-level XMP packet referenced by the glTF asset metadata. Individual records such as `metadata.nodes[i]` or `metadata.materials[i]` can also expose their own resolved `xmp` packet.

### GltfImportVariantsMetadata

```ts
type GltfImportVariantsMetadata = {
    readonly items: GltfImportVariantItem[];
    readonly names: string[];
    readonly activeName: string | null;
    readonly activeIndex: number | null;
    setActive(name: string | null): void;
    setActiveIndex(index: number | null): void;
    clear(): void;
};
```

`items` and `names` describe the declared material variants. `setActive(name)` and `setActiveIndex(index)` swap registered mesh materials to that variant. `clear()` restores each mesh to its baseline imported material.

## Supported glTF Features/Extensions
### Supported
| Extension | State | Notes |
| --- | --- | --- |
| `KHR_lights_punctual` | `supported` | Imports directional, point, and spot lights when `importLights` is enabled. Imported lights bind to the source node transform. |
| `KHR_mesh_quantization` | `supported` | Quantized accessors decode into runtime geometry during import. |
| `KHR_materials_unlit` | `supported` | Imports as `UnlitMaterial`. |
| `KHR_materials_emissive_strength` | `supported` | Maps into `extensions.emissiveStrength`. |
| `KHR_materials_clearcoat` | `supported` | Maps into `extensions.clearcoat`, including texture transforms and clearcoat normal scale. |
| `KHR_materials_transmission` | `supported` | Maps into `extensions.transmission`. |
| `KHR_materials_volume` | `supported` | Maps into `extensions.volume`. |
| `KHR_materials_diffuse_transmission` | `supported` | Maps into `extensions.diffuseTransmission`. |
| `KHR_materials_dispersion` | `supported` | Maps into `extensions.dispersion`. |
| `KHR_materials_specular` | `supported` | Maps into `extensions.specular`. |
| `KHR_materials_sheen` | `supported` | Maps into `extensions.sheen`. |
| `KHR_materials_iridescence` | `supported` | Maps into `extensions.iridescence`. |
| `KHR_materials_anisotropy` | `supported` | Maps into `extensions.anisotropy`. |
| `KHR_materials_ior` | `supported` | Maps into `extensions.ior`. |
| `KHR_materials_variants` | `supported` | Populates `result.metadata.variants` and swaps registered mesh materials at runtime. |
| `KHR_gaussian_splatting` | `supported` | Imports supported point primitives as native `SplatField` objects, including direct color or complete SH coefficient sets through degree 3. |
| `KHR_node_visibility` | `supported` | Seeds `GltfImportedNode.visible` and drives imported mesh, splatfield, or light visibility propagation. |
| `KHR_animation_pointer` | `supported` | Supports selected node, material, camera, and punctual-light targets, plus morph-weight and visibility pointers described below. |
| `KHR_xmp_json_ld` | `supported` | Preserves asset-level and per-record XMP packets in `result.metadata`. |
| `KHR_texture_transform` | `supported` | Maps texture transforms and UV-set selection into WasmGPU material descriptors. |

### Partial
| Extension | State | Notes |
| --- | --- | --- |
| `KHR_materials_pbrSpecularGlossiness` | `partial` | Diffuse color is approximated through base color, roughness is approximated from glossiness, and specular-glossiness textures are currently ignored with warnings. |

### Deferred
| Extension | State | Notes |
| --- | --- | --- |
| `KHR_draco_mesh_compression` | `deferred` | Draco-compressed primitives are detected and skipped by the importer. |
| `KHR_texture_basisu` | `deferred` | Reported in metadata support, but not imported by the current loader path. |
| `EXT_mesh_gpu_instancing` | `deferred` | Reported in metadata support, but not instantiated by the importer. |
| `EXT_meshopt_compression` | `deferred` | Reported in metadata support. Meshopt-compressed accessor reads are not decoded by the current reader path. |
| `EXT_texture_webp` | `deferred` | Reported in metadata support, but not imported by the current loader path. |

Any extension name not recognized by the importer appears as `unsupported` in `result.metadata.extensions.support`.

## Import Behavior Notes
- Texture transforms: the importer carries `KHR_texture_transform` into `baseColorTextureTransform`, `metallicRoughnessTextureTransform`, `normalTextureTransform`, `occlusionTextureTransform`, `emissiveTextureTransform`, and the matching extension texture-transform fields. WasmGPU supports `TEXCOORD_0` and `TEXCOORD_1`; unsupported UV-set indices warn and fall back to `TEXCOORD_0`.
- Cameras: `importCameras` creates perspective and orthographic WasmGPU cameras and parents them to the imported node transform, so camera motion continues to follow the glTF hierarchy.
- Punctual lights: `importLights` creates directional, point, and spot lights from `KHR_lights_punctual`. Imported lights are bound to the source node transform, including spot direction and point or spot position updates from the bound transform.
- Gaussian splatting: supported point primitives require position, rotation, scale, and opacity attributes. Optional indices reorder splats. Direct colors and complete SH coefficient sets through degree 3 import natively; unsupported primitives are skipped with a warning because sparse point-cloud fallback conversion is not implemented.
- Node visibility: `KHR_node_visibility` initializes imported-node visibility. Changing `node.visible` later recomputes `effectiveVisible`, updates attached meshes and splat fields, updates attached lights, and propagates to descendants.
- Morph targets: POSITION and NORMAL morph target deltas import into geometry morph targets. Tangent morph deltas are currently ignored. Base weights come from `node.weights` when present and otherwise fall back to `mesh.weights`.
- Morph-weight playback: imported meshes with morph targets get initialized runtime morph weights, and returned clips drive morph-weight channels. Per-node morph-weight overrides are applied before playback starts.
- Skins and influence count: skinning binds when the mesh has usable `JOINTS_0` and `WEIGHTS_0`. When `JOINTS_1` and `WEIGHTS_1` are present, WasmGPU keeps the extra four influences for 8-influence skinning paths. If required joint or weight data is missing, the mesh stays unskinned and the importer emits a warning.
- Animation pointer channels: `KHR_animation_pointer` supports selected node TRS targets, node visibility, node morph weights, material factors and supported texture-transform fields, camera projection properties, and punctual-light properties such as color, intensity, range, and spot cones.
- Metadata and variants: names, `extras`, extension payloads, XMP packets, extension support states, and material variants stay accessible through `result.metadata` after import.
- Lifetime: call `result.destroy()` when the import is no longer needed. The importer also releases partially created clip and skin allocations if import fails before returning a result.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();

const doc = await wgpu.gltf.load("./model.glb", { loadImages: true });
const result = await wgpu.gltf.import(doc, {
    targetScene: scene,
    importCameras: true,
    importLights: true
});

console.log(result.nodes.map((node) => ({
    name: node.name,
    visible: node.effectiveVisible
})));

if (result.metadata.variants.names.includes("Green")) {
    result.metadata.variants.setActive("Green");
}

const clip = result.clips[0];
if (clip) {
    clip.sample(0.5);
}

result.destroy();
```

## See Also
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
- [WasmGPU.gltf.loadAndImport](./wasmgpu-gltf-loadandimport.md)
- [WasmGPU.gltf.parseGLB](./wasmgpu-gltf-parseglb.md)
- [WasmGPU.createSplatField](./wasmgpu-createsplatfield.md)
- [WasmGPU.animation.createPlayer](./wasmgpu-animation-createplayer.md)
- [WasmGPU.animation.createSkin](./wasmgpu-animation-createskin.md)
- [AnimationClip.dispose](./wasmgpu-objects-animationclip-dispose.md)
- [Skin.dispose](./wasmgpu-objects-skin-dispose.md)
- [WasmGPU.material.standard](./wasmgpu-material-standard.md)
