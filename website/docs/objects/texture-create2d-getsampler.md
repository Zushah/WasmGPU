# texture.create2D#getSampler

## Summary
texture.create2D#getSampler returns a sampler created from the descriptor captured at construction. Repeated successful calls return the same sampler. If creation throws, the optional fallback is returned for that call; without a fallback the original error propagates.

## Syntax
```ts
Texture2D.getSampler(device: GPUDevice, fallback?: GPUSampler): GPUSampler
const result = texture.getSampler(device, fallback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device on which to create the sampler. |
| `fallback` | `GPUSampler` | No | Fallback sampler returned when preferred sampler creation fails. |

## Returns
`GPUSampler` - The sampler for this texture, or the supplied fallback after a creation failure.

## See Also
- [texture.create2D#getView](./texture-create2d-getview.md)
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
