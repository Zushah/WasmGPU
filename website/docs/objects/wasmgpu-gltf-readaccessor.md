# WasmGPU.gltf.readAccessor

## Summary
WasmGPU.gltf.readAccessor reads one accessor from a loaded glTF document and returns its metadata plus the typed-array payload for that accessor. Strided accessors are deinterleaved when needed, and sparse patches are applied before the result is returned.

## Syntax
```ts
WasmGPU.gltf.readAccessor(doc: GltfDocument, accessorIndex: number): AccessorView
const result = wgpu.gltf.readAccessor(doc, accessorIndex);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `doc` | `GltfDocument` | Yes | Parsed glTF document containing JSON, buffers, and optional image payloads. |
| `accessorIndex` | `number` | Yes | Zero-based accessor index in `doc.json.accessors`. |

## Returns
`AccessorView` - Accessor metadata plus typed-array data for the requested glTF accessor.

## Type Details
### GltfDocument

```ts
type GltfDocument = {

    json: GltfRoot;

    buffers: ArrayBuffer[];

    images?: ArrayBuffer[];

    resourceBaseUrl: string;

};
```

#### GltfDocument Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `json` | `GltfRoot` | Yes | Parsed glTF JSON root object. |
| `buffers` | `ArrayBuffer[]` | Yes | Typed numeric/binary data consumed by this operation. |
| `images` | `ArrayBuffer[]` | No | Typed numeric/binary data consumed by this operation. |
| `resourceBaseUrl` | `string` | Yes | Directory URL used to resolve relative glTF buffer and image URIs. |

### AccessorView

```ts
type AccessorView = {

    accessor: GltfAccessor;

    componentType: GltfAccessorComponentType;

    type: GltfAccessorType;

    count: number;

    numComponents: number;

    normalized: boolean;

    array: GltfTypedArray;

};
```

#### AccessorView Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `accessor` | `GltfAccessor` | Yes | Accessor metadata object selected for this read operation. |
| `componentType` | `GltfAccessorComponentType` | Yes | glTF accessor component type enum describing scalar storage width/type. |
| `type` | `GltfAccessorType` | Yes | Accessor shape such as `SCALAR`, `VEC3`, or `MAT4`. |
| `count` | `number` | Yes | Number of accessor elements in the returned payload. |
| `numComponents` | `number` | Yes | Number of scalar components per accessor element. |
| `normalized` | `boolean` | Yes | Whether integer accessor values should be normalized when interpreted. |
| `array` | `GltfTypedArray` | Yes | Typed-array payload containing accessor data. |

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
| `name` | `string` | No | Optional glTF name for this accessor. |
| `extras` | `GltfExtras` | No | Opaque application-specific metadata preserved by loader/import utilities. |
| `extensions` | `GltfExtensions` | No | Extension payload map (usually keyed by extension name). |

### GltfAccessorComponentType

```ts
type GltfAccessorComponentType = 5120 | 5121 | 5122 | 5123 | 5124 | 5125 | 5126;
```

### GltfAccessorType

```ts
type GltfAccessorType = "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4";
```

### GltfTypedArray

```ts
type GltfTypedArray = | Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;
```

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

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const doc = await wgpu.gltf.load("./model.glb", { loadImages: true });
const accessorIndex = 0;
const result = wgpu.gltf.readAccessor(doc, accessorIndex);
console.log(result);
```

## See Also
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
- [WasmGPU.gltf.loadAndImport](./wasmgpu-gltf-loadandimport.md)
- [WasmGPU.gltf.parseGLB](./wasmgpu-gltf-parseglb.md)
- [WasmGPU.gltf.readAccessorAsFloat32](./wasmgpu-gltf-readaccessorasfloat32.md)
- [WasmGPU.gltf.readAccessorAsUint16](./wasmgpu-gltf-readaccessorasuint16.md)
- [WasmGPU.gltf.readIndicesAsUint32](./wasmgpu-gltf-readindicesasuint32.md)
