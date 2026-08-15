# Texture2D.width

## Summary
Texture2D.width reads the current `width` value from this Texture2D instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Texture2D.width: number
const value = texture.width;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Numeric scalar result produced by this operation.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const texture = wgpu.texture.create2D({ source: { kind: "url", url: "./albedo.png" }, mipmaps: true });
const value = texture.width;
console.log(value);
```

## See Also
- [Texture2D.destroy](./texture2d-destroy.md)
- [Texture2D.ensureUploaded](./texture2d-ensureuploaded.md)
- [Texture2D.getSampler](./texture2d-getsampler.md)
- [Texture2D.getView](./texture2d-getview.md)
- [Texture2D.height](./texture2d-height.md)
- [Texture2D.revision](./texture2d-revision.md)
- [Texture2D.uploaded](./texture2d-uploaded.md)
