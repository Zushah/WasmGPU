# animation.createSkin

## Summary
animation.createSkin creates a runtime skin, copying joint transform indices and inverse-bind matrices into owned Wasm allocations.

## Syntax
```ts
WasmGPU.animation.createSkin(name: string, joints: Transform[], inverseBindMatrices: Float32Array | null): Skin
const result = wgpu.animation.createSkin(name, joints, inverseBindMatrices);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Human-readable identifier used for labels, debugging, or lookup keys. |
| `joints` | `Transform[]` | Yes | Joint transforms in skin order. |
| `inverseBindMatrices` | `Float32Array \| null` | Yes | Optional packed inverse bind matrices (`jointCount * 16`) or `null`. |

When `inverseBindMatrices` is `null` or does not contain exactly `jointCount * 16` values, the skin initializes identity inverse-bind matrices.

## Returns
`Skin` - Skin owning copied joint indices and inverse-bind matrices in Wasm memory.

## See Also
- [animation.createClip](./animation-createclip.md)
- [animation.createSkin#dispose](./animation-createskin-dispose.md)
