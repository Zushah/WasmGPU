# geometry.pyramid

## Summary
geometry.pyramid creates a closed, flat-shaded square pyramid whose base lies on Y=0 and apex is at the requested positive Y height. Base width, base depth, and height each default to `1`.

## Syntax
```ts
WasmGPU.geometry.pyramid(baseWidth?: number, baseDepth?: number, height?: number): Geometry
const result = wgpu.geometry.pyramid(baseWidth, baseDepth, height);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `baseWidth` | `number` | No | X-axis base width; default `1`. |
| `baseDepth` | `number` | No | Z-axis base depth; default `1`. |
| `height` | `number` | No | Apex height above the Y=0 base; default `1`. |

## Returns
`Geometry` - Indexed closed square-pyramid geometry with flat faces, normals, UVs, and computed bounds.

## See Also
- [geometry.box](./geometry-box.md)
- [geometry.custom](./geometry-custom.md)
- [geometry.prism](./geometry-prism.md)
