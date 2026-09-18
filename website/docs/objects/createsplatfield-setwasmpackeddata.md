# createSplatField#setWasmPackedData

## Summary

`createSplatField#setWasmPackedData()` installs or replaces a coherent set of borrowed WebAssembly data sources. Use it to enter the WebAssembly source family or to change several channels together. The call refreshes every attached source, validates the active record ranges, and schedules their active data for a later `upload()`.

## Syntax

```ts
SplatField.setWasmPackedData(sources: SplatFieldWasmSources, options?: SplatFieldWasmPackedDataOptions): void
```

## Parameters

```ts
type SplatFieldWasmSources = {
    centerOpacity?: WasmMemoryView<Float32Array> | null;
    rotation?: WasmMemoryView<Float32Array> | null;
    scale?: WasmMemoryView<Float32Array> | null;
    color?: WasmMemoryView<Float32Array> | null;
    sphericalHarmonics?: WasmMemoryView<Float32Array> | null;
};

type SplatFieldWasmPackedDataOptions = {
    splatCount?: number;
    capacity?: number;
    keepCPUData?: boolean;
    recomputeBounds?: boolean;
    shDegree?: 0 | 1 | 2 | 3;
};
```

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `sources` | `SplatFieldWasmSources` | Yes | Channels to replace. An omitted property preserves its current source; an explicit `null` removes that channel and its WasmGPU-managed GPU copy. |
| `options.splatCount` | `number` | No | Active record count. If omitted, the first active source determines the count from its complete records; all other active channels must cover the same count. |
| `options.capacity` | `number` | No | Non-negative record-capacity hint applied to each channel supplied in this call. It can reserve reusable GPU capacity but does not change `splatCount`. |
| `options.keepCPUData` | `boolean` | No | Whether refreshed active records are copied into retained CPU arrays for record inspection and CPU-derived operations. |
| `options.recomputeBounds` | `boolean` | No | Recompute non-explicit bounds from center/opacity and scale data during refresh. Explicit bounds are preserved. |
| `options.shDegree` | `0 \| 1 \| 2 \| 3` | Conditional | Required when installing spherical-harmonic data unless the field already has an active SH degree. |

## Data layout and validation

All sources must be `WasmMemoryView<Float32Array>` values. `centerOpacity`, `rotation`, `scale`, and direct `color` each contain one packed `vec4<f32>` per splat:

- center/opacity: `[x, y, z, opacity]`;
- rotation: quaternion `[x, y, z, w]`;
- scale: `[sx, sy, sz, unused]`;
- color: `[r, g, b, a]`.

Spherical-harmonic data contains RGB triples for every coefficient: 3, 12, 27, or 48 floats per splat for degrees 0 through 3. Direct color and spherical harmonics are mutually exclusive. Every nonempty WebAssembly-backed field requires center/opacity, rotation, and scale sources; use this grouped method to establish those core channels together.

## Ownership, refresh, and upload

The field borrows each `WasmMemoryView` and never frees the producer's WebAssembly allocation. `setWasmPackedData()` reads the current view metadata and active records immediately. After producer writes or any change to exported pointer/length metadata, call `refreshFromWasm()` (or the relevant channel refresh method) before relying on retained CPU records or bounds.

Refresh does not copy data to WebGPU. `upload(device, queue)` performs the transfer into buffers owned by the field; rendering also uploads dirty sources as needed. With `keepCPUData: false`, per-splat record getters return `null` for WebAssembly-backed data. `clearWasmSources()` detaches all borrowed views and removes their managed GPU copies.

## See Also

- [createSplatField#refreshFromWasm](./createsplatfield-refreshfromwasm.md)
- [createSplatField#upload](./createsplatfield-upload.md)
- [createSplatField#clearWasmSources](./createsplatfield-clearwasmsources.md)
