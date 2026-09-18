# geometry.custom

## Summary
geometry.custom constructs a `Geometry` from either CPU positions or a borrowed Wasm position view plus optional attributes, indices, bounds, and morph targets. CPU and Wasm sources are mutually exclusive per channel; positions are required, skin joint/weight channels must be paired, and Wasm positions cannot currently be combined with morph targets.

## Syntax
```ts
WasmGPU.geometry.custom(descriptor: GeometryDescriptor): Geometry
const result = wgpu.geometry.custom(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `GeometryDescriptor` | Yes | CPU or borrowed-Wasm vertex/index sources, optional bounds, retention policy, and morph targets. |

## Returns
`Geometry` - Geometry containing the supplied sources and either explicit or position-derived bounds.

## Type Details
### GeometryDescriptor

```ts
type GeometryDescriptor = {
    positions?: Float32Array;
    normals?: Float32Array;
    tangents?: Float32Array;
    colors?: Float32Array;
    uvs?: Float32Array;
    uvs1?: Float32Array;
    joints?: Uint16Array;
    weights?: Float32Array;
    joints1?: Uint16Array;
    weights1?: Float32Array;
    indices?: Uint32Array;
    wasmPositions?: WasmMemoryView<Float32Array>;
    wasmNormals?: WasmMemoryView<Float32Array>;
    wasmTangents?: WasmMemoryView<Float32Array>;
    wasmColors?: WasmMemoryView<Float32Array>;
    wasmUvs?: WasmMemoryView<Float32Array>;
    wasmUvs1?: WasmMemoryView<Float32Array>;
    wasmJoints?: WasmMemoryView<Uint16Array>;
    wasmWeights?: WasmMemoryView<Float32Array>;
    wasmJoints1?: WasmMemoryView<Uint16Array>;
    wasmWeights1?: WasmMemoryView<Float32Array>;
    wasmIndices?: WasmMemoryView<Uint32Array>;
    vertexCount?: number;
    indexCount?: number;
    wasmVertexCapacity?: number;
    wasmIndexCapacity?: number;
    bounds?: GeometryBoundsDescriptor;
    keepCPUData?: boolean;
    morphTargets?: ReadonlyArray<GeometryMorphTargetDescriptor>;
    authoredNormals?: boolean;
};
```

#### GeometryDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `positions` | `Float32Array` | Conditional | Packed XYZ positions. Either this or `wasmPositions` is required. |
| `normals`, `tangents`, `colors`, `uvs`, `uvs1`, `weights`, `weights1` | `Float32Array` | No | Optional CPU vertex attributes. Colors contain packed RGBA records. |
| `joints`, `joints1` | `Uint16Array` | No | Optional four-influence joint-index sets. |
| `indices` | `Uint32Array` | No | Optional triangle indices. |
| `wasmPositions` through `wasmWeights1`, `wasmIndices` | `WasmMemoryView<...>` | Conditional | Borrowed Wasm attributes, including optional packed RGBA colors, and indices. Each is mutually exclusive with its CPU counterpart. |
| `vertexCount`, `indexCount` | `number` | No | Active record counts for Wasm sources when they cannot or should not be inferred from the complete view. |
| `wasmVertexCapacity`, `wasmIndexCapacity` | `number` | No | Initial grow-only GPU capacity hints. |
| `bounds` | `GeometryBoundsDescriptor` | No | Explicit box and sphere bounds, useful when CPU positions are not retained. |
| `keepCPUData` | `boolean` | No | Retains CPU snapshots of uploaded attributes and indices. |
| `morphTargets` | `ReadonlyArray<GeometryMorphTargetDescriptor>` | No | Morph targets; currently incompatible with `wasmPositions`. |
| `authoredNormals` | `boolean` | No | Marks supplied normals as authored rather than generated. |

## See Also
- [geometry#setWasmAttributes](./geometry-setwasmattributes.md)
- [geometry#refreshFromWasm](./geometry-refreshfromwasm.md)
- [geometry#upload](./geometry-upload.md)
- [geometry#destroy](./geometry-destroy.md)
