# WasmGPU.gltf.load

## Summary
WasmGPU.gltf.load reads a `.gltf` or `.glb` source into a `GltfDocument`. It resolves buffer payloads, optionally preloads image bytes, and leaves scene conversion for [WasmGPU.gltf.import](./wasmgpu-gltf-import.md).

## Syntax
```ts
WasmGPU.gltf.load(source: string | ArrayBuffer, options?: LoadGltfOptions): Promise<GltfDocument>
const result = await wgpu.gltf.load(source, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `string \| ArrayBuffer` | Yes | glTF JSON or GLB binary source. URL strings can reference `.gltf` or `.glb` files. |
| `options` | `LoadGltfOptions` | No | Optional loading controls for URI resolution, fetching, image preloading, and warnings. |

## Returns
`Promise<GltfDocument>` - Loaded glTF document containing parsed JSON, resolved buffers, optional image payloads, and the resolved base URL.

## Type Details
### LoadGltfOptions

```ts
type LoadGltfOptions = {
    resourceBaseUrl?: string;
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    loadImages?: boolean;
    onWarning?: (message: string) => void;
};
```

#### LoadGltfOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `resourceBaseUrl` | `string` | No | Base URL for external buffers and images. The loader normalizes an explicit value as a directory. For URL sources without an override, it preserves the final response URL so redirects resolve resources correctly. |
| `fetch` | `(input: RequestInfo \| URL, init?: RequestInit) => Promise<Response>` | No | Custom fetch implementation for URL loading. |
| `loadImages` | `boolean` | No | When true, image payloads are also resolved into `doc.images`. Leave it false if you only want JSON and buffers up front. |
| `onWarning` | `(message: string) => void` | No | Callback for recoverable load warnings. |

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
| `json` | `GltfRoot` | Yes | Parsed glTF JSON root. |
| `buffers` | `ArrayBuffer[]` | Yes | Resolved binary buffers, including the BIN chunk from a GLB when present. |
| `images` | `ArrayBuffer[]` | No | Resolved image payloads when `loadImages` is enabled. |
| `resourceBaseUrl` | `string` | Yes | Base URL used to resolve relative asset references during import. |

For string sources, `.glb` files are parsed as GLB and other paths are treated as glTF JSON. For `ArrayBuffer` sources, WasmGPU auto-detects GLB by magic number and otherwise treats the bytes as UTF-8 JSON text.

`load()` does not create meshes, materials, textures, cameras, lights, or animations. Use [WasmGPU.gltf.import](./wasmgpu-gltf-import.md) after loading when you want runtime scene resources.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const doc = await wgpu.gltf.load("./model.glb", {
    loadImages: true,
    onWarning: (message) => console.warn(message)
});

console.log(doc.json.asset.version, doc.buffers.length, doc.images?.length ?? 0);
```

## See Also
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
- [WasmGPU.gltf.loadAndImport](./wasmgpu-gltf-loadandimport.md)
- [WasmGPU.gltf.parseGLB](./wasmgpu-gltf-parseglb.md)
- [WasmGPU.gltf.readAccessor](./wasmgpu-gltf-readaccessor.md)
- [WasmGPU.gltf.readAccessorAsFloat32](./wasmgpu-gltf-readaccessorasfloat32.md)
- [WasmGPU.gltf.readAccessorAsUint16](./wasmgpu-gltf-readaccessorasuint16.md)
- [WasmGPU.gltf.readIndicesAsUint32](./wasmgpu-gltf-readindicesasuint32.md)
- [resolveUri](./gltf-resolveuri.md)
- [decodeDataUri](./gltf-decodedatauri.md)
