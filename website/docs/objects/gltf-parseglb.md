# gltf.parseGLB

## Summary
gltf.parseGLB splits a raw GLB binary into parsed JSON and the optional first BIN chunk. It checks the GLB magic, version, declared and per-chunk bounds, and presence of a JSON chunk, but it does not resolve external buffers or create runtime scene objects.

## Syntax
```ts
WasmGPU.gltf.parseGLB(glb: ArrayBuffer): ParsedGLB
const result = wgpu.gltf.parseGLB(glb);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `glb` | `ArrayBuffer` | Yes | Raw GLB file contents. |

## Returns
`ParsedGLB` - Parsed GLB payload containing the JSON chunk and the first BIN chunk when present.

## Type Details
### ParsedGLB

```ts
type ParsedGLB = {
    json: GltfRoot;
    binChunk: ArrayBuffer | null;
};
```

#### ParsedGLB Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `json` | `GltfRoot` | Yes | Parsed glTF JSON root extracted from the GLB. |
| `binChunk` | `ArrayBuffer \| null` | Yes | First BIN chunk from the GLB, or `null` when the file contains only JSON data. |

### GltfRoot

```ts
type GltfRoot = {
    asset: GltfAsset;
    scene?: number;
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
    extensions?: Record<string, unknown>;
    extras?: unknown;
};
```

#### GltfRoot Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `asset` | `GltfAsset` | Yes | Core asset metadata such as version and generator. |
| `scene`, `scenes` | Scene fields | No | Default scene selection and the declared scene list. |
| `nodes`, `meshes` | Node and mesh arrays | No | Hierarchy and mesh declarations from the source file. |
| `buffers`, `bufferViews`, `accessors` | Buffer fields | No | Binary layout information for geometry, animation, skinning, and other numeric data. |
| `materials`, `textures`, `images`, `samplers` | Material and texture arrays | No | Material graph and texture source declarations. |
| `skins`, `animations`, `cameras` | Runtime-oriented arrays | No | Skin, animation, and camera declarations that later import into WasmGPU objects. |
| `extensionsUsed`, `extensionsRequired`, `extensions`, `extras` | Metadata fields | No | Declared extension usage and preserved application metadata. |

Use `parseGLB()` when you only need to inspect or preprocess the file structure. If you want resolved buffers and image payloads, use [gltf.load](./gltf-load.md). If you want WasmGPU scene resources, continue with [gltf.import](./gltf-import.md).

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const response = await fetch("./model.glb");
const glb = await response.arrayBuffer();
const parsed = wgpu.gltf.parseGLB(glb);

console.log(parsed.json.asset.version, parsed.binChunk?.byteLength ?? 0);
```

## See Also
- [gltf.load](./gltf-load.md)
- [gltf.import](./gltf-import.md)
- [gltf.loadAndImport](./gltf-loadandimport.md)
