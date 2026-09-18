# gltf.load

## Summary
gltf.load reads a `.gltf` or `.glb` source into a `GltfDocument`. It resolves buffer payloads, optionally preloads image bytes, and leaves scene conversion for [gltf.import](./gltf-import.md).

## Syntax
```ts
WasmGPU.gltf.load(source: string | ArrayBuffer, options?: LoadGltfOptions): Promise<GltfDocument>
const result = await wgpu.gltf.load(source, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `string \| ArrayBuffer` | Yes | glTF JSON or GLB binary source. URL strings can reference either format; the fetched bytes, not the filename extension, determine whether the source is a GLB. |
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
| `resourceBaseUrl` | `string` | No | Base URL for external buffers and images. The loader normalizes an explicit value as a directory. For URL sources without an override, it uses the final response URL, so relative references resolve beside the redirected document. |
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
| `resourceBaseUrl` | `string` | Yes | URL or directory base used to resolve relative buffer and image references. For a fetched source without an override, this is the final document response URL. |

For both URL and `ArrayBuffer` sources, WasmGPU detects GLB by its magic number and otherwise treats the bytes as UTF-8 glTF JSON. Buffer payloads are always loaded. Image payloads are loaded only when `loadImages` is true.

`load()` does not create meshes, materials, textures, cameras, lights, or animations. Use [gltf.import](./gltf-import.md) after loading when you want runtime scene resources.

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
- [gltf.import](./gltf-import.md)
- [gltf.loadAndImport](./gltf-loadandimport.md)
- [gltf.parseGLB](./gltf-parseglb.md)
- [gltf.readAccessor](./gltf-readaccessor.md)
- [gltf.readAccessorAsFloat32](./gltf-readaccessorasfloat32.md)
- [gltf.readAccessorAsUint16](./gltf-readaccessorasuint16.md)
- [gltf.readIndicesAsUint32](./gltf-readindicesasuint32.md)
- [resolveUri](./resolveuri.md)
- [decodeDataUri](./decodedatauri.md)
