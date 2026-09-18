# createGlyphField#getAttributeRecord

## Summary
createGlyphField#getAttributeRecord returns a copied retained CPU attribute tuple, or `null` when attributes are not retained or the index is not an in-range integer. It does not read back GPU-only data.

## Syntax
```ts
GlyphField.getAttributeRecord(index: number): [number, number, number, number] | null
const result = glyphField.getAttributeRecord(index);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Zero-based instance index. |

## Returns
The copied four-component attribute tuple, or `null` when unavailable.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
console.log(glyphField.getAttributeRecord(0)); // [0.5, 0, 0, 0]
```

## See Also
- [createGlyphField#setCPUData](./createglyphfield-setcpudata.md)
- [createGlyphField#upload](./createglyphfield-upload.md)
