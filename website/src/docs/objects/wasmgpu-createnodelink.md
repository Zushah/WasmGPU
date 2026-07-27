# WasmGPU.createNodeLink

## Summary
WasmGPU.createNodeLink creates a graph-style scene object with explicit node and edge data. It supports CPU arrays, external GPU buffers, scalar-driven color mapping, direct RGBA colors, and mixed node/edge geometry modes.

## Syntax
```ts
WasmGPU.createNodeLink(descriptor: NodeLinkDescriptor): NodeLink
const result = wgpu.createNodeLink(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `NodeLinkDescriptor` | Yes | Descriptor object used to configure node data, edge data, color/scale state, bounds, and render behavior. |

## Returns
`NodeLink` - NodeLink runtime object configured for graph-style node and edge rendering.

## Type Details
### NodeLinkDescriptor

```ts
type NodeLinkDescriptor = {
    nodeCount?: number;
    nodePositions?: Float32Array;
    nodePositionsStride?: 3 | 4;
    nodeScalars?: Float32Array;
    nodeColors?: Float32Array;
    nodeRadii?: Float32Array;
    nodeRadiiStride?: 3 | 4;
    nodePositionsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    nodeScalarsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    nodeColorsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    nodeRadiiBuffer?: GPUBuffer | { buffer: GPUBuffer };
    wasmNodePositions?: WasmMemoryView<Float32Array>;
    wasmNodeScalars?: WasmMemoryView<Float32Array>;
    wasmNodeColors?: WasmMemoryView<Float32Array>;
    wasmNodeRadii?: WasmMemoryView<Float32Array>;
    wasmNodeCapacity?: number;
    edgeCount?: number;
    edges?: Uint16Array | Uint32Array;
    edgeScalars?: Float32Array;
    edgeColors?: Float32Array;
    edgesBuffer?: GPUBuffer | { buffer: GPUBuffer };
    edgeScalarsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    edgeColorsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    wasmEdges?: WasmMemoryView<Uint32Array>;
    wasmEdgeScalars?: WasmMemoryView<Float32Array>;
    wasmEdgeColors?: WasmMemoryView<Float32Array>;
    wasmEdgeCapacity?: number;
    nodeGeometryMode?: NodeLinkNodeGeometryMode;
    edgeGeometryMode?: NodeLinkEdgeGeometryMode;
    nodeColorMode?: NodeLinkColorMode;
    edgeColorMode?: NodeLinkColorMode;
    nodeScaleTransform?: ScaleTransformDescriptor;
    edgeScaleTransform?: ScaleTransformDescriptor;
    nodeColormap?: NodeLinkColormap | Colormap;
    edgeColormap?: NodeLinkColormap | Colormap;
    nodeColormapStops?: Color4[];
    edgeColormapStops?: Color4[];
    nodeSolidColor?: Color4;
    edgeSolidColor?: Color4;
    nodeSize?: number;
    minPointSize?: number;
    maxPointSize?: number;
    pointSizeAttenuation?: number;
    edgeSize?: number;
    opacity?: number;
    lit?: boolean;
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    boundsCenter?: [number, number, number];
    boundsRadius?: number;
    visible?: boolean;
    name?: string;
    keepCPUData?: boolean;
    ownBuffers?: boolean;
    ndShape?: number[];
};
```

External node and edge GPU buffers are borrowed by default. `ownBuffers: true` transfers their destruction responsibility to the nodelink. Setter-level `ownBuffer: true` can transfer an individual replacement buffer.

#### Node Data Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `nodePositions` | `Float32Array` | No | CPU-array path for node positions. Data is grouped per node with `nodePositionsStride` 3 or 4. |
| `nodePositionsStride` | `3 \| 4` | No | Tuple width for `nodePositions`. Use `3` for packed XYZ or `4` if your source already includes padding. |
| `nodeScalars` | `Float32Array` | No | One scalar per node for `nodeColorMode: "scalar"` and node legends. |
| `nodeColors` | `Float32Array` | No | Packed per-node RGBA float tuples for `nodeColorMode: "rgba"`. |
| `nodeRadii` | `Float32Array` | No | Packed per-node radii or axis scales. CPU arrays accept stride 3 or 4 through `nodeRadiiStride`. |
| `nodeRadiiStride` | `3 \| 4` | No | Tuple width for `nodeRadii`. |
| `nodePositionsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External GPU buffer for node positions. When this path is used, `nodeCount` is required. Author the buffer as packed vec4 float tuples per node. |
| `nodeScalarsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External GPU buffer with one float scalar per node. |
| `nodeColorsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External GPU buffer with packed RGBA float tuples per node. |
| `nodeRadiiBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External GPU buffer for node radii or axis scales, authored as packed vec4 float tuples per node. |
| `nodeCount` | `number` | No | Node count for external-buffer workflows. It is required when `nodePositionsBuffer` is supplied. |
| `wasmNodePositions`, `wasmNodeScalars`, `wasmNodeColors`, `wasmNodeRadii` | `WasmMemoryView<Float32Array>` | No | Borrowed node channels refreshed explicitly after producer writes. |
| `wasmNodeCapacity` | `number` | No | Initial grow-only GPU capacity hint for Wasm-backed node channels. |

#### Edge Data Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `edges` | `Uint16Array \| Uint32Array` | No | CPU-array path for connectivity. Each edge is a pair of node indices `[src, dst]`. |
| `edgeScalars` | `Float32Array` | No | One scalar per edge for `edgeColorMode: "scalar"` and edge legends. |
| `edgeColors` | `Float32Array` | No | Packed per-edge RGBA float tuples for `edgeColorMode: "rgba"`. |
| `edgesBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External GPU buffer for connectivity. Author it as packed `u32` source/destination pairs. When this path is used, `edgeCount` is required. |
| `edgeScalarsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External GPU buffer with one float scalar per edge. |
| `edgeColorsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External GPU buffer with packed RGBA float tuples per edge. |
| `edgeCount` | `number` | No | Edge count for external-buffer workflows. This counts edge pairs, not raw buffer elements. |
| `wasmEdges` | `WasmMemoryView<Uint32Array>` | No | Borrowed packed source/destination index pairs. |
| `wasmEdgeScalars`, `wasmEdgeColors` | `WasmMemoryView<Float32Array>` | No | Borrowed edge scalar or RGBA channels. |
| `wasmEdgeCapacity` | `number` | No | Initial grow-only GPU capacity hint for Wasm-backed edge channels. |

#### Visual Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `nodeGeometryMode` | `NodeLinkNodeGeometryMode` | No | Node rendering mode: `points`, `spheres`, `ellipsoids`, or `cubes`. |
| `edgeGeometryMode` | `NodeLinkEdgeGeometryMode` | No | Edge rendering mode: `lines` or `cylinders`. |
| `nodeColorMode`, `edgeColorMode` | `NodeLinkColorMode` | No | Per-component color source. Use `"rgba"` for direct colors, `"scalar"` for scale/colormap mapping, or `"solid"` for one uniform color. |
| `nodeScaleTransform`, `edgeScaleTransform` | `ScaleTransformDescriptor` | No | Independent scalar mapping descriptors for nodes and edges. |
| `nodeColormap`, `edgeColormap` | `NodeLinkColormap \| Colormap` | No | Independent node and edge colormaps for scalar color mode. |
| `nodeColormapStops`, `edgeColormapStops` | `Color4[]` | No | Explicit stop lists for custom node and edge colormaps. |
| `nodeSolidColor`, `edgeSolidColor` | `Color4` | No | Uniform colors used by `"solid"` color mode. |
| `nodeSize` | `number` | No | Global node size multiplier. |
| `minPointSize`, `maxPointSize`, `pointSizeAttenuation` | Numbers | No | Point-mode size controls for screen-facing node rendering. |
| `edgeSize` | `number` | No | Edge thickness control. |
| `opacity`, `lit`, `blendMode`, `depthWrite`, `depthTest`, `cullMode` | Render controls | No | Visibility, shading, blending, depth, and culling controls for the whole NodeLink. |

#### Bounds and Metadata Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `boundsMin`, `boundsMax`, `boundsCenter`, `boundsRadius` | Bounds fields | No | Optional explicit bounds. These are especially useful when node positions live only in external GPU buffers or when CPU arrays are dropped after upload. |
| `visible` | `boolean` | No | Scene visibility flag. |
| `name` | `string` | No | Optional scene lookup name. |
| `keepCPUData` | `boolean` | No | Retains CPU-side arrays after upload. This is the simplest way to keep richer picking payloads available for nodes and edges. |
| `ownBuffers` | `boolean` | No | Transfers destruction responsibility for caller-supplied node and edge GPU buffers. Wasm views remain borrowed. |
| `ndShape` | `number[]` | No | Optional multidimensional shape used to decode node picks into `ndIndex` values. Edge hits keep `ndIndex: null`. |

### NodeLinkNodeGeometryMode

```ts
type NodeLinkNodeGeometryMode = "points" | "spheres" | "ellipsoids" | "cubes";
```

### NodeLinkEdgeGeometryMode

```ts
type NodeLinkEdgeGeometryMode = "lines" | "cylinders";
```

### NodeLinkColorMode

```ts
type NodeLinkColorMode = "rgba" | "scalar" | "solid";
```

### NodeLinkColormap

```ts
type NodeLinkColormap = BuiltinColormapName | "custom";
```

### Color4

```ts
type Color4 = [number, number, number, number];
```

### ScaleTransformDescriptor

```ts
type ScaleTransformDescriptor = {
    mode?: ScaleMode;
    clampMode?: ScaleClampMode;
    valueMode?: ScaleValueMode;
    componentCount?: number;
    componentIndex?: number;
    stride?: number;
    offset?: number;
    domainMin?: number;
    domainMax?: number;
    clampMin?: number;
    clampMax?: number;
    percentileLow?: number;
    percentileHigh?: number;
    logBase?: number;
    symlogLinThresh?: number;
    gamma?: number;
    invert?: boolean;
};
```

You can mix CPU arrays and external buffers across categories. The two count fields only become mandatory when the runtime cannot infer counts from CPU arrays.

Picking distinguishes nodes from edges through `attributes.component` and `attributes.componentIndex`. Node scalar/color and edge scalar/color/endpoints/edge positions depend on retained CPU-side records, so `keepCPUData: true` is the most practical setup when you need rich pick payloads.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const graph = wgpu.createNodeLink({
    nodePositions: new Float32Array([
        -0.8, 0.0, 0.0,
         0.0, 0.7, 0.0,
         0.9, -0.1, 0.0,
         0.1, -0.8, 0.0
    ]),
    nodePositionsStride: 3,
    nodeRadii: new Float32Array([
        0.18, 0.18, 0.18,
        0.24, 0.24, 0.24,
        0.16, 0.16, 0.16,
        0.20, 0.20, 0.20
    ]),
    nodeRadiiStride: 3,
    nodeScalars: new Float32Array([0.12, 0.38, 0.71, 0.54]),
    edges: new Uint16Array([
        0, 1,
        1, 2,
        1, 3
    ]),
    edgeScalars: new Float32Array([0.20, 0.65, 0.45]),
    nodeGeometryMode: "spheres",
    edgeGeometryMode: "cylinders",
    nodeColorMode: "scalar",
    edgeColorMode: "solid",
    nodeColormap: "viridis",
    nodeScaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 },
    edgeScaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 },
    edgeSolidColor: [0.80, 0.84, 0.92, 1.0],
    nodeSize: 1.0,
    edgeSize: 0.08,
    lit: true,
    keepCPUData: true,
    ndShape: [2, 2]
});
```

## See Also
- [NodeLink.setNodeData](./wasmgpu-objects-nodelink-setnodedata.md)
- [NodeLink.setEdgeData](./wasmgpu-objects-nodelink-setedgedata.md)
- [NodeLink.refreshFromWasm](./wasmgpu-objects-nodelink-refreshfromwasm.md)
- [NodeLink.count](./wasmgpu-objects-nodelink-count.md)
- [NodeLink.geometryMode](./wasmgpu-objects-nodelink-geometrymode.md)
- [NodeLink.colorMode](./wasmgpu-objects-nodelink-colormode.md)
- [NodeLink.scaleTransform](./wasmgpu-objects-nodelink-scaletransform.md)
- [NodeLink.setNodeData](./wasmgpu-objects-nodelink-setnodedata.md)
- [NodeLink.setEdgeData](./wasmgpu-objects-nodelink-setedgedata.md)
- [NodeLink.getRecord](./wasmgpu-objects-nodelink-getrecord.md)
- [NodeLink.upload](./wasmgpu-objects-nodelink-upload.md)
- [NodeLink.getBounds](./wasmgpu-objects-nodelink-getbounds.md)
- [Scene.add](../world/wasmgpu-world-scene-add.md)
- [Scene.remove](../world/wasmgpu-world-scene-remove.md)
- [Scene.getBounds](../world/wasmgpu-world-scene-getbounds.md)
- [WasmGPU.pick](../interact/wasmgpu-pick.md)
- [WasmGPU.pickRect](../interact/wasmgpu-pickrect.md)
- [WasmGPU.pickLasso](../interact/wasmgpu-picklasso.md)
- [WasmGPU.createPointCloud](./wasmgpu-createpointcloud.md)
- [WasmGPU.createGlyphField](./wasmgpu-createglyphfield.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
- [WasmGPU.createOverlay.legend](../world/wasmgpu-createoverlay-legend.md)
