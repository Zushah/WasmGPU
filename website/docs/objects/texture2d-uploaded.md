# Texture2D.uploaded

## Summary
Texture2D.uploaded reads the current `uploaded` value from this Texture2D instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Texture2D.uploaded: boolean
const value = texture.uploaded;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Boolean result indicating whether the queried condition is satisfied.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const texture = wgpu.texture.create2D({ source: { kind: "url", url: "./albedo.png" }, mipmaps: true });
const value = texture.uploaded;
console.log(value);
```

## See Also
- [Texture2D.destroy](./texture2d-destroy.md)
- [Texture2D.ensureUploaded](./texture2d-ensureuploaded.md)
- [Texture2D.getSampler](./texture2d-getsampler.md)
- [Texture2D.getView](./texture2d-getview.md)
- [Texture2D.height](./texture2d-height.md)
- [Texture2D.revision](./texture2d-revision.md)
- [Texture2D.width](./texture2d-width.md)
