# material.data#setData

## Summary
material.data#setData selects a non-empty CPU `Float32Array` as the scalar/vector source, recomputes the record count from the active scale transform's stride and offset, and marks GPU data for upload. The array is retained by reference until upload; unless `keepCPUData` is true, it is dropped after upload succeeds.

## Syntax
```ts
DataMaterial.setData(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void
material.setData(data, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Float32Array` | Yes | Nonempty packed records interpreted using the active transform's `offset`, `stride`, and component settings. The material retains this array by reference until it is dropped. |
| `opts` | `{ keepCPUData?: boolean }` | No | Optional retention setting; omission preserves the material's current policy. |

## Type Details
### SetDataopts

```ts
type SetDataopts = {

    keepCPUData?: boolean;

};
```

#### SetDataopts Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `keepCPUData` | `boolean` | No | When true, CPU arrays are retained after upload. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const data = new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]);
const opts = { keepCPUData: true };
material.setData(data, opts);
material.upload(wgpu.gpu.device, wgpu.gpu.queue);
```

## See Also
- [material.data#dropCPUData](./material-data-dropcpudata.md)
- [material.data#getScaleSourceDescriptor](./material-data-getscalesourcedescriptor.md)
- [material.data#setDataBuffer](./material-data-setdatabuffer.md)
- [material.data#upload](./material-data-upload.md)
