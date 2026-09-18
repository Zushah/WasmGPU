# material.unlit

## Summary
material.unlit creates a material that bypasses lighting and uses direct base color output. It is useful for flat-shaded assets, sprites, UI-style meshes, and glTF materials that import through `KHR_materials_unlit`.

## Syntax
```ts
WasmGPU.material.unlit(options?: UnlitMaterialDescriptor): UnlitMaterial
const result = wgpu.material.unlit(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `UnlitMaterialDescriptor` | No | Optional material descriptor for base color, alpha handling, texture usage, texture transforms, and render-state overrides. |

## Returns
`UnlitMaterial` - New `UnlitMaterial` runtime material instance.

## Type Details
### UnlitMaterialDescriptor

```ts
type UnlitMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
    baseColorTexture?: Texture2D | null;
    baseColorTextureTransform?: TextureTransformDescriptor | null;
    alphaCutoff?: number;
};
```

#### UnlitMaterialDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `color` | `Color` | No | Base RGB color. |
| `opacity` | `number` | No | Base alpha. When you leave `blendMode` unset, values below `1` default the material to transparent blending. |
| `baseColorTexture` | `Texture2D \| null` | No | Base-color texture. |
| `baseColorTextureTransform` | `TextureTransformDescriptor \| null` | No | UV transform for `baseColorTexture`. |
| `alphaCutoff` | `number` | No | Alpha-test cutoff for masked unlit materials. |

### MaterialDescriptor

```ts
type MaterialDescriptor = {
    label?: string;
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
};
```

#### MaterialDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `label` | `string` | No | Debug label propagated to material GPU resources. |
| `blendMode` | `BlendMode` | No | Render blend mode override. |
| `cullMode` | `CullMode` | No | Face-culling mode. |
| `depthWrite` | `boolean` | No | Whether the material writes to depth. |
| `depthTest` | `boolean` | No | Whether the material tests against depth. |

### Color

```ts
type Color = [number, number, number];
```

`baseColorTextureTransform` uses the same `{ offset, rotation, scale, texCoord }` descriptor as `StandardMaterial`. WasmGPU supports `TEXCOORD_0` and `TEXCOORD_1` when the source geometry provides them.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const decal = wgpu.texture.create2D({
    source: { kind: "url", url: "./marker.png" },
    mipmaps: true
});

const result = wgpu.material.unlit({
    color: [1.0, 1.0, 1.0],
    baseColorTexture: decal,
    baseColorTextureTransform: {
        offset: [0.1, 0.0],
        scale: [0.5, 0.5]
    },
    alphaCutoff: 0.2
});
```

## See Also
- [material.standard](./material-standard.md)
- [material.data](./material-data.md)
- [material.custom](./material-custom.md)
- [texture.create2D](./texture-create2d.md)
