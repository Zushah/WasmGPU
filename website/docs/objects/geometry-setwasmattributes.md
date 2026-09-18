# geometry#setWasmAttributes

## Summary

`geometry#setWasmAttributes()` installs or replaces several borrowed WebAssembly vertex and index sources as one operation. It refreshes the supplied sources immediately, validates their active ranges, and schedules their data for a later `upload()`.

## Syntax

```ts
Geometry.setWasmAttributes(sources: GeometryWasmSources, options?: GeometryWasmAttributeSetOptions): void
```

## Parameters

```ts
type GeometryWasmSources = {
    positions?: WasmMemoryView<Float32Array> | null;
    normals?: WasmMemoryView<Float32Array> | null;
    tangents?: WasmMemoryView<Float32Array> | null;
    colors?: WasmMemoryView<Float32Array> | null;
    uvs?: WasmMemoryView<Float32Array> | null;
    uvs1?: WasmMemoryView<Float32Array> | null;
    joints?: WasmMemoryView<Uint16Array> | null;
    weights?: WasmMemoryView<Float32Array> | null;
    joints1?: WasmMemoryView<Uint16Array> | null;
    weights1?: WasmMemoryView<Float32Array> | null;
    indices?: WasmMemoryView<Uint32Array> | null;
};

type GeometryWasmAttributeSetOptions = {
    vertexCount?: number;
    indexCount?: number;
    capacity?: number;
    vertexCapacity?: number;
    indexCapacity?: number;
    keepCPUData?: boolean;
    recomputeBounds?: boolean;
};
```

An omitted source property preserves that channel. An explicit `null` detaches it and removes its WasmGPU-managed GPU copy. `vertexCapacity` and `indexCapacity` override the shared `capacity` hint for their respective channel families; capacity hints do not change the active counts.

## Data layout and validation

Vertex channels contain one tightly packed record per vertex:

| Channel | View element type | Elements per vertex |
| --- | --- | ---: |
| `positions`, `normals` | `f32` | 3 |
| `tangents`, `colors` | `f32` | 4 |
| `uvs`, `uvs1` | `f32` | 2 |
| `joints`, `joints1` | `u16` | 4 |
| `weights`, `weights1` | `f32` | 4 |
| `indices` | `u32` | 1 per index |

When `vertexCount` is omitted and positions are attached, their complete records determine the active vertex count. Otherwise the current vertex count is retained. When `indexCount` is omitted, the index view length determines it. Every attached channel must cover its active count. Joint and weight channels are supplied as matching pairs; the second pair is optional.

A CPU array and WebAssembly view cannot both supply the same channel. WebAssembly positions are not supported for geometry with morph targets.

## Ownership, refresh, and upload

The geometry borrows each `WasmMemoryView` and never frees its WebAssembly allocation. `keepCPUData` optionally retains copies of active records for CPU access. With `recomputeBounds: true`, non-explicit bounds are recomputed from active positions; explicitly supplied bounds remain unchanged.

After the producer writes new data or changes exported pointer/length metadata, call `refreshFromWasm()` before relying on retained CPU data or bounds. Refreshing does not transfer data to WebGPU. `upload(device)` copies dirty active ranges into buffers owned by the geometry.

## Example

```js
geometry.setWasmAttributes(
    {
        positions: positionsView,
        normals: normalsView,
        indices: indicesView
    },
    {
        vertexCount,
        indexCount,
        vertexCapacity: maximumVertices,
        indexCapacity: maximumIndices,
        keepCPUData: true,
        recomputeBounds: true
    }
);

// After the producer changes the active records:
geometry.refreshFromWasm({ vertexCount: nextVertexCount, indexCount: nextIndexCount, recomputeBounds: true });
geometry.upload(wgpu.gpu.device);
```

## See Also

- [geometry#refreshFromWasm](./geometry-refreshfromwasm.md)
- [geometry#refreshWasmVertices](./geometry-refreshwasmvertices.md)
- [geometry#setWasmIndices](./geometry-setwasmindices.md)
- [geometry#clearWasmSources](./geometry-clearwasmsources.md)
- [geometry#upload](./geometry-upload.md)
