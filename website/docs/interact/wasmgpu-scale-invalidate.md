# WasmGPU.scale.invalidate

## Summary
WasmGPU.scale.invalidate removes cached stats entries for a specific source buffer.
Call this after writing new values into a buffer when you reuse the same cache identity.
Invalidation can target either a raw `GPUBuffer` source or a full `ScaleSourceDescriptor`.

## Syntax
```ts
WasmGPU.scale.invalidate(sourceOrDescriptor: ScaleBufferSource | ScaleSourceDescriptor): void
wgpu.scale.invalidate(sourceOrDescriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `sourceOrDescriptor` | `ScaleBufferSource \| ScaleSourceDescriptor` | Yes | Source identity whose cached stats should be removed. |

## Returns
`void` - No value is returned.

## Type Details
```ts
type ScaleBufferSource = GPUBuffer | { buffer: GPUBuffer; byteLength?: number };

type ScaleSourceDescriptor = {
    buffer: ScaleBufferSource;
    count: number;
    componentCount?: number;
    componentIndex?: number;
    valueMode?: "component" | "magnitude";
    stride?: number;
    offset?: number;
    revision?: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const data = new Float32Array([1, 2, 3, 4, 5, 6]);
const storage = wgpu.compute.createStorageBuffer({ data, copySrc: true });

await wgpu.scale.requestStats({ source: { buffer: storage, count: data.length, revision: 0 } });
wgpu.scale.invalidate({ buffer: storage, count: data.length, revision: 0 });
const fresh = await wgpu.scale.requestStats({ source: { buffer: storage, count: data.length, revision: 1 } });
console.log(fresh.finiteCount);
```

## See Also
- [WasmGPU.scale.requestStats](./wasmgpu-scale-requeststats.md)
- [WasmGPU.scale.clearCache](./wasmgpu-scale-clearcache.md)
