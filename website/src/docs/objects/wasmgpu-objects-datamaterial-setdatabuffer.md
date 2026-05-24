# DataMaterial.setDataBuffer

## Summary
DataMaterial.setDataBuffer updates data buffer state on this DataMaterial and marks dependent GPU data for refresh.

## Syntax
```ts
DataMaterial.setDataBuffer(buffer: GPUBuffer): void
material.setDataBuffer(buffer);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `buffer` | `GPUBuffer` | Yes | GPUBuffer handle used as an external data source. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const buffer = someStorageBuffer;
material.setDataBuffer(buffer);
console.log("updated");
```

## See Also
- [DataMaterial.colormap](./wasmgpu-objects-datamaterial-colormap.md)
- [DataMaterial.createBindGroupLayout](./wasmgpu-objects-datamaterial-createbindgrouplayout.md)
- [DataMaterial.destroy](./wasmgpu-objects-datamaterial-destroy.md)
- [DataMaterial.dropCPUData](./wasmgpu-objects-datamaterial-dropcpudata.md)
- [DataMaterial.getColormapForBinding](./wasmgpu-objects-datamaterial-getcolormapforbinding.md)
- [DataMaterial.getColormapKey](./wasmgpu-objects-datamaterial-getcolormapkey.md)
- [DataMaterial.getScaleSourceDescriptor](./wasmgpu-objects-datamaterial-getscalesourcedescriptor.md)
- [DataMaterial.getShaderCode](./wasmgpu-objects-datamaterial-getshadercode.md)
- [DataMaterial.getUniformBufferSize](./wasmgpu-objects-datamaterial-getuniformbuffersize.md)
- [DataMaterial.getUniformData](./wasmgpu-objects-datamaterial-getuniformdata.md)
- [DataMaterial.onVisualChange](./wasmgpu-objects-datamaterial-onvisualchange.md)
- [DataMaterial.opacity](./wasmgpu-objects-datamaterial-opacity.md)
