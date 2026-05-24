# WasmGPU.gltf.readIndicesAsUint32

## Summary
WasmGPU.gltf.readIndicesAsUint32 reads one accessor from a loaded glTF document and returns it as `Uint32Array` for index-buffer use. Native uint32 index accessors are returned directly when no conversion is needed; smaller integer component types are widened through the WebAssembly accessor helpers.

## Syntax
```ts
WasmGPU.gltf.readIndicesAsUint32(doc: GltfDocument, accessorIndex: number): Uint32Array
const result = wgpu.gltf.readIndicesAsUint32(doc, accessorIndex);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `doc` | `GltfDocument` | Yes | Parsed glTF document containing JSON, buffers, and optional image payloads. |
| `accessorIndex` | `number` | Yes | Zero-based accessor index in `doc.json.accessors`. |

## Returns
`Uint32Array` - Index payload converted to uint32 elements.

## Type Details
### GltfDocument

```ts
type GltfDocument = {

    json: GltfRoot;

    buffers: ArrayBuffer[];

    images?: ArrayBuffer[];

    baseUrl: string;

};
```

#### GltfDocument Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `json` | `GltfRoot` | Yes | Parsed glTF JSON root object. |
| `buffers` | `ArrayBuffer[]` | Yes | Typed numeric/binary data consumed by this operation. |
| `images` | `ArrayBuffer[]` | No | Typed numeric/binary data consumed by this operation. |
| `baseUrl` | `string` | Yes | Base URL used to resolve relative glTF asset URIs. |

### GltfRoot

```ts
type GltfRoot = {

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
```

#### GltfRoot Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `asset` | `GltfAsset` | Yes | glTF asset metadata block. |
| `scene` | `GltfID` | No | Default scene index or scene reference in glTF/root metadata. |
| `scenes` | `GltfScene[]` | No | All scene definitions declared in the asset. |
| `nodes` | `GltfNode[]` | No | All node definitions declared in the asset. |
| `meshes` | `GltfMesh[]` | No | All mesh definitions declared in the asset. |
| `buffers` | `GltfBuffer[]` | No | Binary buffer declarations referenced by buffer views. |
| `bufferViews` | `GltfBufferView[]` | No | Byte-range slices into the declared buffers. |
| `accessors` | `GltfAccessor[]` | No | Accessor metadata entries available for reads. |
| `materials` | `GltfMaterial[]` | No | Material definitions referenced by meshes. |
| `textures` | `GltfTexture[]` | No | Texture definitions referenced by materials. |
| `images` | `GltfImage[]` | No | Image declarations referenced by textures. |
| `samplers` | `GltfSampler[]` | No | Sampler definitions referenced by textures. |

### GltfAsset

```ts
type GltfAsset = {

    version: string;

    generator?: string;

    copyright?: string;

    minVersion?: string;

    extras?: GltfExtras;

};
```

#### GltfAsset Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `version` | `string` | Yes | Declared glTF version string, typically `"2.0"`. |
| `generator` | `string` | No | Optional tool string describing which exporter produced the asset. |
| `copyright` | `string` | No | Optional copyright notice from the asset metadata. |
| `minVersion` | `string` | No | Optional minimum glTF version required by the asset. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |

### GltfID

```ts
type GltfID = number;
```

### GltfScene

```ts
type GltfScene = {

    nodes?: GltfID[];

    name?: string;

    extras?: GltfExtras;

    extensions?: GltfExtensions;

};
```

#### GltfScene Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `nodes` | `GltfID[]` | No | Root node indices belonging to this scene. |
| `name` | `string` | No | Optional glTF scene name. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

### GltfNode

```ts
type GltfNode = {

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
```

#### GltfNode Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `camera` | `GltfID` | No | Camera index/reference associated with this node or runtime object. |
| `children` | `GltfID[]` | No | Child node indices referenced by this node. |
| `skin` | `GltfID` | No | Skin index/reference associated with this node or runtime object. |
| `matrix` | `number[]` | No | Optional 4x4 local transform matrix for this node. |
| `mesh` | `GltfID` | No | Mesh index/reference associated with this node. |
| `rotation` | `[number, number, number, number]` | No | Node quaternion rotation. |
| `scale` | `[number, number, number]` | No | Node scale vector. |
| `translation` | `[number, number, number]` | No | Node translation vector. |
| `weights` | `number[]` | No | Optional per-node morph-weight overrides. |
| `name` | `string` | No | Optional glTF node name. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

### GltfMesh

```ts
type GltfMesh = {

    primitives: GltfPrimitive[];

    weights?: number[];

    name?: string;

    extras?: GltfExtras;

    extensions?: GltfExtensions;

};
```

#### GltfMesh Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `primitives` | `GltfPrimitive[]` | Yes | Primitive list belonging to this mesh. |
| `weights` | `number[]` | No | Default morph weights for this mesh. |
| `name` | `string` | No | Optional glTF mesh name. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

### GltfBuffer

```ts
type GltfBuffer = {

    uri?: string;

    byteLength: number;

    name?: string;

    extras?: GltfExtras;

    extensions?: GltfExtensions;

};
```

#### GltfBuffer Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `uri` | `string` | No | Relative URI or data URI for this buffer when present in the source asset. |
| `byteLength` | `number` | Yes | Declared byte length of the buffer. |
| `name` | `string` | No | Optional glTF buffer name. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

### GltfBufferView

```ts
type GltfBufferView = {

    buffer: GltfID;

    byteOffset?: number;

    byteLength: number;

    byteStride?: number;

    target?: number;

    name?: string;

    extras?: GltfExtras;

    extensions?: GltfExtensions;

};
```

#### GltfBufferView Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `buffer` | `GltfID` | Yes | Index of the glTF buffer containing this byte range. |
| `byteOffset` | `number` | No | Byte offset into the referenced buffer. |
| `byteLength` | `number` | Yes | Length of this buffer-view slice in bytes. |
| `byteStride` | `number` | No | Optional interleaved stride in bytes. |
| `target` | `number` | No | Optional GL buffer-target hint from the asset. |
| `name` | `string` | No | Optional glTF buffer-view name. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

### GltfAccessor

```ts
type GltfAccessor = {

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
```

#### GltfAccessor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `bufferView` | `GltfID` | No | Index of the glTF bufferView backing this field. |
| `byteOffset` | `number` | No | Byte offset within the referenced buffer view. |
| `componentType` | `GltfAccessorComponentType` | Yes | glTF accessor component type enum describing scalar storage width/type. |
| `normalized` | `boolean` | No | Whether integer values should be normalized on read. |
| `count` | `number` | Yes | Number of accessor elements. |
| `type` | `GltfAccessorType` | Yes | Accessor shape such as `SCALAR`, `VEC3`, or `MAT4`. |
| `max` | `number[]` | No | Optional maximum bounds stored in the source asset. |
| `min` | `number[]` | No | Optional minimum bounds stored in the source asset. |
| `sparse` | `GltfAccessorSparse` | No | Sparse accessor payload defining index/value patch data. |
| `name` | `string` | No | Optional glTF accessor name. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const doc = await wgpu.gltf.load("./model.glb", { loadImages: true });
const accessorIndex = 0;
const result = wgpu.gltf.readIndicesAsUint32(doc, accessorIndex);
console.log(result);
```

## See Also
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
- [WasmGPU.gltf.loadAndImport](./wasmgpu-gltf-loadandimport.md)
- [WasmGPU.gltf.parseGLB](./wasmgpu-gltf-parseglb.md)
- [WasmGPU.gltf.readAccessor](./wasmgpu-gltf-readaccessor.md)
- [WasmGPU.gltf.readAccessorAsFloat32](./wasmgpu-gltf-readaccessorasfloat32.md)
- [WasmGPU.gltf.readAccessorAsUint16](./wasmgpu-gltf-readaccessorasuint16.md)
