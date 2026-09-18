# WasmGPU.gltf

## Summary
WasmGPU.gltf is the engine's glTF loading, decoding, and import facade. It can load a document and its external resources, decode GLB containers and accessors, and import supported glTF content into WasmGPU scenes, meshes, materials, textures, cameras, lights, skins, and animations.

## Syntax
```ts
const result = await wgpu.gltf.loadAndImport("scene.glb");
```

## Available APIs
- [gltf.load](./gltf-load.md) loads a glTF document and its resources.
- [gltf.import](./gltf-import.md) imports an already loaded document.
- [gltf.loadAndImport](./gltf-loadandimport.md) performs both steps.
- [gltf.parseGLB](./gltf-parseglb.md) decodes a binary GLB container.
- [gltf.readAccessor](./gltf-readaccessor.md) and typed variants expose accessor data.

The package also exports standalone URI helpers such as [resolveUri](./resolveuri.md); they are not members of `wgpu.gltf`.

## See Also
- [WasmGPU.createScene](../world/wasmgpu-createscene.md)
- [WasmGPU.animation](./wasmgpu-animation.md)
- [WasmGPU.material](./wasmgpu-material.md)
