# WasmGPU.material.standard

## Summary
WasmGPU.material.standard creates a physically based surface material for lit meshes. Use it for the core metallic-roughness workflow, optional texture transforms, and the glTF-oriented extension blocks that cover clearcoat, transmission, sheen, iridescence, anisotropy, and related effects.

## Syntax
```ts
WasmGPU.material.standard(options?: StandardMaterialDescriptor): StandardMaterial
const result = wgpu.material.standard(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `StandardMaterialDescriptor` | No | Optional material descriptor for base PBR properties, textures, texture transforms, render-state overrides, and extension blocks. |

## Returns
`StandardMaterial` - New `StandardMaterial` runtime material instance.

## Type Details
### StandardMaterialDescriptor

```ts
type StandardMaterialDescriptor = MaterialDescriptor & {
    color?: Color;
    opacity?: number;
    metallic?: number;
    roughness?: number;
    emissive?: Color;
    emissiveIntensity?: number;
    baseColorTexture?: Texture2D | null;
    metallicRoughnessTexture?: Texture2D | null;
    normalTexture?: Texture2D | null;
    occlusionTexture?: Texture2D | null;
    emissiveTexture?: Texture2D | null;
    baseColorTextureTransform?: TextureTransformDescriptor | null;
    metallicRoughnessTextureTransform?: TextureTransformDescriptor | null;
    normalTextureTransform?: TextureTransformDescriptor | null;
    occlusionTextureTransform?: TextureTransformDescriptor | null;
    emissiveTextureTransform?: TextureTransformDescriptor | null;
    normalScale?: number;
    occlusionStrength?: number;
    alphaCutoff?: number;
    extensions?: StandardMaterialExtensionsDescriptor;
};
```

#### StandardMaterialDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `color` | `Color` | No | Base RGB surface color. This combines with `baseColorTexture` when both are present. |
| `opacity` | `number` | No | Base alpha. When you leave `blendMode` unset, values below `1` default the material to transparent blending. |
| `metallic` | `number` | No | Metallic factor for the core PBR workflow. |
| `roughness` | `number` | No | Roughness factor for the core PBR workflow. |
| `emissive` | `Color` | No | Emissive RGB contribution before `emissiveIntensity` or `emissiveStrength` are applied. |
| `emissiveIntensity` | `number` | No | Scalar multiplier for `emissive`. |
| `baseColorTexture` | `Texture2D \| null` | No | Albedo/base-color texture. |
| `metallicRoughnessTexture` | `Texture2D \| null` | No | Packed metallic-roughness texture. |
| `normalTexture` | `Texture2D \| null` | No | Normal map texture. |
| `occlusionTexture` | `Texture2D \| null` | No | Ambient-occlusion texture. |
| `emissiveTexture` | `Texture2D \| null` | No | Emissive texture. |
| `baseColorTextureTransform` | `TextureTransformDescriptor \| null` | No | UV transform for `baseColorTexture`. |
| `metallicRoughnessTextureTransform` | `TextureTransformDescriptor \| null` | No | UV transform for `metallicRoughnessTexture`. |
| `normalTextureTransform` | `TextureTransformDescriptor \| null` | No | UV transform for `normalTexture`. |
| `occlusionTextureTransform` | `TextureTransformDescriptor \| null` | No | UV transform for `occlusionTexture`. |
| `emissiveTextureTransform` | `TextureTransformDescriptor \| null` | No | UV transform for `emissiveTexture`. |
| `normalScale` | `number` | No | Normal-map strength. It only affects authored normal-map textures. |
| `occlusionStrength` | `number` | No | Occlusion-map strength. |
| `alphaCutoff` | `number` | No | Alpha-test cutoff for masked materials. |
| `extensions` | `StandardMaterialExtensionsDescriptor` | No | Optional glTF-style extension blocks for layered surface features. |

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
| `blendMode` | `BlendMode` | No | Render blend mode override. Leave this unset to keep the standard opaque-versus-transparent default from `opacity`. |
| `label` | `string` | No | Optional diagnostic label retained by the material. |
| `cullMode` | `CullMode` | No | Face-culling mode. |
| `depthWrite` | `boolean` | No | Whether the material writes to depth. |
| `depthTest` | `boolean` | No | Whether the material tests against depth. |

### TextureTransformDescriptor

```ts
type TextureTransformDescriptor = {
    offset?: [number, number];
    rotation?: number;
    scale?: [number, number];
    texCoord?: 0 | 1;
};
```

#### TextureTransformDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `offset` | `[number, number]` | No | UV translation. |
| `rotation` | `number` | No | UV rotation in radians. |
| `scale` | `[number, number]` | No | UV scale. |
| `texCoord` | `0 \| 1` | No | Selects `TEXCOORD_0` or `TEXCOORD_1`. WasmGPU supports both when the source geometry provides them. |

Texture transforms are user-facing UV remaps. You do not need to manage shader math yourself. For imported glTF assets, the importer maps `KHR_texture_transform` into these descriptor fields. When you set `texCoord: 1`, the mesh must provide a second UV set.

### StandardMaterialExtensionsDescriptor

```ts
type StandardMaterialExtensionsDescriptor = {
    clearcoat?: {
        factor?: number;
        texture?: Texture2D | null;
        textureTransform?: TextureTransformDescriptor | null;
        roughness?: number;
        roughnessTexture?: Texture2D | null;
        roughnessTextureTransform?: TextureTransformDescriptor | null;
        normalTexture?: Texture2D | null;
        normalTextureTransform?: TextureTransformDescriptor | null;
        normalScale?: number;
    } | null;
    transmission?: {
        factor?: number;
        texture?: Texture2D | null;
        textureTransform?: TextureTransformDescriptor | null;
    } | null;
    volume?: {
        thicknessFactor?: number;
        thicknessTexture?: Texture2D | null;
        thicknessTextureTransform?: TextureTransformDescriptor | null;
        attenuationDistance?: number;
        attenuationColor?: Color;
    } | null;
    specular?: {
        factor?: number;
        texture?: Texture2D | null;
        textureTransform?: TextureTransformDescriptor | null;
        color?: Color;
        colorTexture?: Texture2D | null;
        colorTextureTransform?: TextureTransformDescriptor | null;
    } | null;
    sheen?: {
        color?: Color;
        colorTexture?: Texture2D | null;
        colorTextureTransform?: TextureTransformDescriptor | null;
        roughness?: number;
        roughnessTexture?: Texture2D | null;
        roughnessTextureTransform?: TextureTransformDescriptor | null;
    } | null;
    iridescence?: {
        factor?: number;
        texture?: Texture2D | null;
        textureTransform?: TextureTransformDescriptor | null;
        ior?: number;
        thicknessMinimum?: number;
        thicknessMaximum?: number;
        thicknessTexture?: Texture2D | null;
        thicknessTextureTransform?: TextureTransformDescriptor | null;
    } | null;
    anisotropy?: {
        strength?: number;
        rotation?: number;
        texture?: Texture2D | null;
        textureTransform?: TextureTransformDescriptor | null;
    } | null;
    diffuseTransmission?: {
        factor?: number;
        texture?: Texture2D | null;
        textureTransform?: TextureTransformDescriptor | null;
        color?: Color;
        colorTexture?: Texture2D | null;
        colorTextureTransform?: TextureTransformDescriptor | null;
    } | null;
    dispersion?: {
        dispersion?: number;
    } | null;
    ior?: {
        ior?: number;
    } | null;
    emissiveStrength?: {
        strength?: number;
    } | null;
};
```

Extension textures can use their own texture transforms wherever the descriptor exposes a `*TextureTransform` field.

#### clearcoat
Use `clearcoat` to add a second specular layer. `factor` enables the layer, `texture` and `roughnessTexture` modulate it, and `normalTexture` plus `normalScale` give the coat its own normal detail.

#### transmission, volume, diffuseTransmission, and dispersion
Use `transmission` for specular transmission and `diffuseTransmission` for tinted diffuse-through-surface behavior. Either one selects the transmission material path, which means the renderer may need its internal scene-color source or copy path when those materials are visible. `volume` adds thickness and attenuation controls for transmitted light, and `dispersion` adds a dispersion scalar on top of that path. This is a practical real-time transmission model, not a claim of physically exact refraction.

#### specular
Use `specular` to control additional specular intensity and tint with `factor`, `texture`, `color`, and `colorTexture`.

#### sheen
Use `sheen` for cloth-like grazing highlights. `color` and `colorTexture` define the sheen tint, while `roughness` and `roughnessTexture` control how broad the layer appears.

#### iridescence
Use `iridescence` for thin-film color shifts. `factor` enables it, `ior` controls the film index of refraction, and the thickness fields define the supported film range. `texture` and `thicknessTexture` can vary those values across the surface.

#### anisotropy
Use `anisotropy` for directionally stretched highlights. `strength` controls the amount, `rotation` controls the tangent-space direction, and `texture` can vary the effect spatially.

#### ior
Use `ior` to override the base index of refraction used by the standard and transmission paths.

#### emissiveStrength
Use `emissiveStrength` when you want emissive output above the base `emissiveIntensity` path, especially for glTF assets that use `KHR_materials_emissive_strength`.

### Color

```ts
type Color = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const baseColor = wgpu.texture.create2D({
    source: { kind: "url", url: "./painted-panel.png" },
    mipmaps: true
});

const normal = wgpu.texture.create2D({
    source: { kind: "url", url: "./painted-panel-normal.png" },
    mipmaps: true
});

const result = wgpu.material.standard({
    color: [0.95, 0.97, 1.0],
    roughness: 0.18,
    metallic: 0.0,
    baseColorTexture: baseColor,
    baseColorTextureTransform: {
        scale: [2, 2],
        texCoord: 1
    },
    normalTexture: normal,
    normalTextureTransform: {
        texCoord: 1
    },
    extensions: {
        transmission: { factor: 0.85 },
        volume: {
            thicknessFactor: 0.2,
            attenuationColor: [0.86, 0.94, 1.0]
        },
        ior: { ior: 1.45 }
    }
});
```

## See Also
- [StandardMaterial.getLayoutPlan](./standardmaterial-getlayoutplan.md)
- [Material.label](./material-label.md)
- [WasmGPU.material.unlit](./wasmgpu-material-unlit.md)
- [WasmGPU.material.data](./wasmgpu-material-data.md)
- [WasmGPU.material.custom](./wasmgpu-material-custom.md)
- [WasmGPU.texture.create2D](./wasmgpu-texture-create2d.md)
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
