# createGlyphField#setCPUData

## Summary
`createGlyphField#setCPUData()` installs packed vec4 CPU channels. For a nonzero count, positions, rotations, and scales are all required; attributes are optional. Count is explicit or derived from the first non-null channel, and every supplied channel must match it. The arrays themselves are retained until upload and remain afterward only when `keepCPUData` is true. The call clears Wasm, raw-pointer, and external-buffer modes and computed bounds.

`setWasmInstances()` is the memory-safe mixed-channel counterpart: only properties present in `sources` are replaced, explicit `null` detaches a channel, and all attached channels are refreshed together.

## Syntax
```ts
GlyphField.setCPUData(positions: Float32Array | null, rotations: Float32Array | null, scales: Float32Array | null, attributes: Float32Array | null, opts?: { keepCPUData?: boolean; instanceCount?: number }): void
GlyphField.setWasmInstances(sources: GlyphFieldWasmSources, options?: GlyphFieldWasmInstancesOptions): void
glyphField.setCPUData(positions, rotations, scales, attributes, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `positions` | `Float32Array \| null` | Yes | Packed `[x, y, z, unused]` records. Required when the resolved count is nonzero. |
| `rotations` | `Float32Array \| null` | Yes | Packed quaternion `[x, y, z, w]` records. Required when the resolved count is nonzero. |
| `scales` | `Float32Array \| null` | Yes | Packed `[sx, sy, sz, unused]` records. Required when the resolved count is nonzero. |
| `attributes` | `Float32Array \| null` | Yes | Optional packed attribute `vec4` records. |
| `opts` | `{ keepCPUData?: boolean; instanceCount?: number }` | No | Controls post-upload CPU retention and optionally fixes the active count. |
| `sources` | `GlyphFieldWasmSources` | Yes | Optional `positions`, `rotations`, `scales`, and `attributes` views; explicit `null` detaches a channel. |
| `options` | `GlyphFieldWasmInstancesOptions` | No | Active count, capacity hint, CPU retention, and bounds-recomputation controls. |

## Type Details
### SetCPUDataopts

```ts
type SetCPUDataopts = {

    keepCPUData?: boolean;

    instanceCount?: number;

};
```

#### SetCPUDataopts Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `keepCPUData` | `boolean` | No | When true, CPU arrays are retained after upload. |
| `instanceCount` | `number` | No | Number of instances represented by supplied data inputs. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }
});
const positions = new Float32Array([0, 0, 0, 0]);
const rotations = new Float32Array([0, 0, 0, 1]);
const scales = new Float32Array([1, 1, 1, 0]);
const attributes = new Float32Array([0.5, 0, 0, 0]);
const opts = { keepCPUData: true, instanceCount: 1 };
glyphField.setCPUData(positions, rotations, scales, attributes, opts);
glyphField.upload(wgpu.gpu.device, wgpu.gpu.queue);
```

## See Also
- [createGlyphField#upload](./createglyphfield-upload.md)
- [createGlyphField#setWasmSoA](./createglyphfield-setwasmsoa.md)
- [createGlyphField#refreshFromWasm](./createglyphfield-refreshfromwasm.md)
- [createGlyphField#clearWasmSources](./createglyphfield-clearwasmsources.md)
- [createGlyphField#getAttributeRecord](./createglyphfield-getattributerecord.md)
- [createGlyphField#computeBoundsFromCPUData](./createglyphfield-computeboundsfromcpudata.md)
- [createGlyphField#destroy](./createglyphfield-destroy.md)
