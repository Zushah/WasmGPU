# createGlyphField#mapLinearIndexToNd

## Summary
createGlyphField#mapLinearIndexToNd decodes a non-negative linear instance index against `ndShape` in row-major order, returning `null` when no shape exists or the index is invalid/out of range.

## Syntax
```ts
GlyphField.mapLinearIndexToNd(index: number): number[] | null
const result = glyphField.mapLinearIndexToNd(index);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Zero-based row-major instance index. |

## Returns
The new N-dimensional index array, or `null` when no mapping exists.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 6, ndShape: [2, 3], positions: new Float32Array(24), rotations: new Float32Array(24), scales: new Float32Array(24), attributes: new Float32Array(24), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
console.log(glyphField.mapLinearIndexToNd(4)); // [1, 1]
```

## See Also
- [createGlyphField#ndShape](./createglyphfield-ndshape.md)
