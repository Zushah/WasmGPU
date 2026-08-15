# WasmGPU.scale.clearCache

## Summary
WasmGPU.scale.clearCache clears all memoized scale-statistics computations.
Use it when you want to force recomputation for every source, such as after a global data refresh.
This is broader than `invalidate`, which targets one source identity.

## Syntax
```ts
WasmGPU.scale.clearCache(): void
wgpu.scale.clearCache();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.createStorageBuffer({ data: new Float32Array([0, 1, 2, 3]), copySrc: true });
const b = wgpu.compute.createStorageBuffer({ data: new Float32Array([5, 8, 13, 21]), copySrc: true });

await wgpu.scale.requestStats({ source: { buffer: a, count: 4, revision: 0 } });
await wgpu.scale.requestStats({ source: { buffer: b, count: 4, revision: 0 } });
wgpu.scale.clearCache();
```

## See Also
- [WasmGPU.scale.invalidate](./wasmgpu-scale-invalidate.md)
- [WasmGPU.scale.requestStats](./wasmgpu-scale-requeststats.md)
