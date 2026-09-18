# createGlyphField#getLocalBounds

## Summary
createGlyphField#getLocalBounds returns explicit or computed object-space bounds. It computes lazily when retained positions and scales exist; otherwise it returns empty bounds marked partial when instances exist but CPU spatial data is unavailable. Treat the box fields as authoritative: the returned sphere is derived from that box rather than preserving an independently supplied sphere override.

## Syntax
```ts
GlyphField.getLocalBounds(): Bounds3
const result = glyphField.getLocalBounds();
```

## Parameters
This API does not take parameters.

## Returns
`Bounds3` - Bounds structure containing axis-aligned box and bounding-sphere data.

## Type Details
### Bounds3

```ts
type Bounds3 = {

    boxMin: Vec3;

    boxMax: Vec3;

    sphereCenter: Vec3;

    sphereRadius: number;

    empty: boolean;

    partial: boolean;

};
```

#### Bounds3 Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `boxMin` | `Vec3` | Yes | Minimum corner of the axis-aligned bounding box. |
| `boxMax` | `Vec3` | Yes | Maximum corner of the axis-aligned bounding box. |
| `sphereCenter` | `Vec3` | Yes | Center of the associated bounding sphere. |
| `sphereRadius` | `number` | Yes | Radius of the associated bounding sphere. |
| `empty` | `boolean` | Yes | Whether the bounds contain no geometry. |
| `partial` | `boolean` | Yes | Whether the result omits geometry whose bounds could not be determined. |

### Vec3

```ts
type Vec3 = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const result = glyphField.getLocalBounds();
console.log(result);
```

## See Also
- [createGlyphField#applyScaleStats](./createglyphfield-applyscalestats.md)
- [createGlyphField#colormap](./createglyphfield-colormap.md)
- [createGlyphField#colormapStops](./createglyphfield-colormapstops.md)
- [createGlyphField#colorMode](./createglyphfield-colormode.md)
- [createGlyphField#computeBoundsFromCPUData](./createglyphfield-computeboundsfromcpudata.md)
- [createGlyphField#destroy](./createglyphfield-destroy.md)
- [createGlyphField#dirtyUniforms](./createglyphfield-dirtyuniforms.md)
- [createGlyphField#getAttributeRecord](./createglyphfield-getattributerecord.md)
- [createGlyphField#getBounds](./createglyphfield-getbounds.md)
- [createGlyphField#getColormapForBinding](./createglyphfield-getcolormapforbinding.md)
- [createGlyphField#getColormapKey](./createglyphfield-getcolormapkey.md)
- [createGlyphField#getScaleSourceDescriptor](./createglyphfield-getscalesourcedescriptor.md)
