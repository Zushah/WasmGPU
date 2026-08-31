# WasmGPU.geometry.custom

## Summary
WasmGPU.geometry.custom builds geometry data for a primitive or procedural shape. The returned Geometry can be reused by multiple meshes.

## Syntax
```ts
WasmGPU.geometry.custom(descriptor: GeometryDescriptor): Geometry
const result = wgpu.geometry.custom(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `GeometryDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`Geometry` - Generated Geometry object containing vertex/index data and computed bounds.

## Type Details
### GeometryDescriptor

```ts
type GeometryDescriptor = {
    positions?: Float32Array;
    normals?: Float32Array;
    tangents?: Float32Array;
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
| `normals`, `tangents`, `uvs`, `uvs1`, `weights`, `weights1` | `Float32Array` | No | Optional CPU vertex attributes. |
| `joints`, `joints1` | `Uint16Array` | No | Optional four-influence joint-index sets. |
| `indices` | `Uint32Array` | No | Optional triangle indices. |
| `wasmPositions` through `wasmWeights1`, `wasmIndices` | `WasmMemoryView<...>` | Conditional | Borrowed Wasm attributes and indices. Each is mutually exclusive with its CPU counterpart. |
| `vertexCount`, `indexCount` | `number` | No | Active record counts for Wasm sources when they cannot or should not be inferred from the complete view. |
| `wasmVertexCapacity`, `wasmIndexCapacity` | `number` | No | Initial grow-only GPU capacity hints. |
| `bounds` | `GeometryBoundsDescriptor` | No | Explicit box and sphere bounds, useful when CPU positions are not retained. |
| `keepCPUData` | `boolean` | No | Retains CPU snapshots of uploaded attributes and indices. |
| `morphTargets` | `ReadonlyArray<GeometryMorphTargetDescriptor>` | No | Morph targets; currently incompatible with `wasmPositions`. |
| `authoredNormals` | `boolean` | No | Marks supplied normals as authored rather than generated. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const descriptor = { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), indices: new Uint32Array([0, 1, 2]) };
const result = wgpu.geometry.custom(descriptor);
console.log(result);
result.destroy();
```

## See Also
- [Geometry.morphBaseRevision](./geometry-morphbaserevision.md)
- [Geometry.getMorphBaseChannel](./geometry-getmorphbasechannel.md)
- [Geometry.getMorphIndices](./geometry-getmorphindices.md)
- [Geometry.setWasmAttributes](./geometry-setwasmattributes.md)
- [Geometry.refreshFromWasm](./geometry-refreshfromwasm.md)
- [Geometry.upload](./geometry-upload.md)
- [Geometry.destroy](./geometry-destroy.md)
- [WasmGPU.geometry.box](./wasmgpu-geometry-box.md)
- [WasmGPU.geometry.cartesianCurve](./wasmgpu-geometry-cartesiancurve.md)
- [WasmGPU.geometry.cartesianSurface](./wasmgpu-geometry-cartesiansurface.md)
- [WasmGPU.geometry.circle](./wasmgpu-geometry-circle.md)
- [WasmGPU.geometry.cylinder](./wasmgpu-geometry-cylinder.md)
- [WasmGPU.geometry.ellipse](./wasmgpu-geometry-ellipse.md)
- [WasmGPU.geometry.line](./wasmgpu-geometry-line.md)
- [WasmGPU.geometry.parametricCurve](./wasmgpu-geometry-parametriccurve.md)
- [WasmGPU.geometry.parametricSurface](./wasmgpu-geometry-parametricsurface.md)
- [WasmGPU.geometry.plane](./wasmgpu-geometry-plane.md)
- [WasmGPU.geometry.point](./wasmgpu-geometry-point.md)
- [WasmGPU.geometry.prism](./wasmgpu-geometry-prism.md)
