# Texture2D.uploadError

## Summary
Texture2D.uploadError exposes the terminal error from the most recent asynchronous image decode or GPU upload attempt.

## Syntax
```ts
Texture2D.uploadError: Error | null
```

## Parameters
This read-only property does not take parameters.

## Returns
`Error | null` - Contextual upload failure, or `null` when no terminal failure is stored.

## Type Details
The contextual `Error` identifies the texture and source and retains the original failure in its `cause` field when supported. Upload begins asynchronously after `ensureUploaded()` or `getView()` first requests it, so the property may become non-null after those methods return. `destroy()` clears the stored error and resets upload state.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const texture = wgpu.texture.create2D({
  source: { kind: "url", url: "/missing-texture.png" },
});

texture.ensureUploaded(wgpu.gpu.device, wgpu.gpu.queue);
const reportWhenSettled = () => {
  if (texture.uploadError) console.error(texture.uploadError.message);
  else if (!texture.uploaded) requestAnimationFrame(reportWhenSettled);
};
requestAnimationFrame(reportWhenSettled);
```

## Notes
The value is `null` before a failure and is cleared by `destroy()`. After a failure, `ensureUploaded()` and `getView()` throw the contextual error rather than silently retrying.

## See Also
- [WasmGPU.texture.create2D](./wasmgpu-texture-create2d.md)
- [Texture2D.ensureUploaded](./texture2d-ensureuploaded.md)
- [Texture2D.destroy](./texture2d-destroy.md)
