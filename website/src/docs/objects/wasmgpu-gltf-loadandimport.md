# WasmGPU.gltf.loadAndImport

## Summary
WasmGPU.gltf.loadAndImport combines [WasmGPU.gltf.load](./wasmgpu-gltf-load.md) and [WasmGPU.gltf.import](./wasmgpu-gltf-import.md) into one call. It loads a `.gltf` or `.glb` source, resolves buffers and optional image payloads, then converts the document into WasmGPU scene resources and import metadata.

Use `loadAndImport()` when you want the imported WasmGPU objects immediately. Use `load()` and `import()` separately when you need to inspect or modify the loaded document before conversion.

## Syntax
```ts
WasmGPU.gltf.loadAndImport(source: string | ArrayBuffer, options?: {
    load?: LoadGltfOptions;
    import?: ImportGltfOptions;
}): Promise<GltfImportResult>

const result = await wgpu.gltf.loadAndImport(source, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `string \| ArrayBuffer` | Yes | glTF JSON or GLB binary source. URL strings can reference `.gltf` or `.glb` files. |
| `options` | `{ load?: LoadGltfOptions; import?: ImportGltfOptions; }` | No | Optional loading and import controls. `options.load` is passed to `load()`, and `options.import` is passed to `import()`. |

## Returns
`Promise<GltfImportResult>` - Promise that resolves to the same import result you would get from calling `load()` and then `import()` yourself.

## Type Details
### LoadAndImport Options

```ts
type LoadAndImportOptions = {
    load?: LoadGltfOptions;
    import?: ImportGltfOptions;
};
```

#### LoadAndImport Options Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `load` | `LoadGltfOptions` | No | Loading options for URI resolution, fetch overrides, image preloading, and warnings. |
| `import` | `ImportGltfOptions` | No | Import options for scene selection, destination scene ownership, normal generation, optional camera or light import, and warnings. |

### LoadGltfOptions

```ts
type LoadGltfOptions = {
    baseUrl?: string;
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    loadImages?: boolean;
    onWarning?: (message: string) => void;
};
```

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

### GltfImportResult

```ts
type GltfImportResult = {
    scene: Scene;
    meshes: Mesh[];
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

`result.nodes` exposes the imported hierarchy, visibility state, and attached meshes, lights, or cameras. `result.metadata` preserves names, `extras`, extensions, XMP metadata, extension support states, and material variants from the source asset. `result.destroy()` releases imported runtime resources and removes imported meshes or lights from the destination scene when they were added during import.

For the full `LoadGltfOptions`, `ImportGltfOptions`, `GltfImportedNode`, `GltfImportMetadata`, material-variant controls, and extension-support details, use the dedicated [WasmGPU.gltf.load](./wasmgpu-gltf-load.md) and [WasmGPU.gltf.import](./wasmgpu-gltf-import.md) pages.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();

const result = await wgpu.gltf.loadAndImport("./model.glb", {
    load: { loadImages: true },
    import: {
        targetScene: scene,
        importCameras: true,
        importLights: true
    }
});

console.log(result.nodes.map((node) => node.name));
console.log(result.metadata.variants.names);

const clip = result.clips[0];
if (clip) {
    clip.sample(0.5);
}
```

## See Also
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
- [WasmGPU.gltf.parseGLB](./wasmgpu-gltf-parseglb.md)
- [WasmGPU.gltf.readAccessor](./wasmgpu-gltf-readaccessor.md)
- [WasmGPU.gltf.readAccessorAsFloat32](./wasmgpu-gltf-readaccessorasfloat32.md)
- [WasmGPU.gltf.readAccessorAsUint16](./wasmgpu-gltf-readaccessorasuint16.md)
- [WasmGPU.gltf.readIndicesAsUint32](./wasmgpu-gltf-readindicesasuint32.md)
