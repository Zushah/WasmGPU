# compute.blitRGBA8BufferToCanvas

## Summary
compute.blitRGBA8BufferToCanvas draws a packed `RGBA8` pixel buffer to a canvas.
The source contains one `u32` per pixel in row-major order (`r | g<<8 | b<<16 | a<<24`).
This is a fast visualization path for compute output without building a separate render pipeline.
The method records commands into the caller-provided command encoder.
`outWidth` and `outHeight` must be non-negative integers. If either is zero, the method records nothing; otherwise `src` must expose storage-buffer data for at least `outWidth * outHeight` pixels.

## Syntax
```ts
WasmGPU.compute.blitRGBA8BufferToCanvas(encoder: GPUCommandEncoder, canvas: HTMLCanvasElement, src: RGBA8BufferSource, outWidth: number, outHeight: number, opts?: BlitRGBA8BufferToCanvasOptions): void
wgpu.compute.blitRGBA8BufferToCanvas(encoder, canvas, src, outWidth, outHeight, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `encoder` | `GPUCommandEncoder` | Yes | Encoder that receives the blit render pass. |
| `canvas` | `HTMLCanvasElement` | Yes | Destination canvas for display. |
| `src` | `RGBA8BufferSource` | Yes | Source pixel buffer (`GPUBuffer` or `StorageBuffer`). |
| `outWidth` | `number` | Yes | Source image width in pixels. |
| `outHeight` | `number` | Yes | Source image height in pixels. |
| `opts` | `BlitRGBA8BufferToCanvasOptions` | No | Optional canvas format, alpha, clear/load/store, flip, and resize settings. |

By default, the canvas backing size tracks its CSS size at the device pixel ratio, the alpha mode is `"opaque"`, and the render pass uses `loadOp: "load"` and `storeOp: "store"`. Pass `autoResize: false` to retain the current canvas width and height. When `navigator.gpu` is unavailable, provide `opts.format` explicitly.

## Returns
`void` - This method does not return a value.

## Type Details
```ts
type RGBA8BufferSource = GPUBuffer | StorageBuffer;

type BlitRGBA8BufferToCanvasOptions = {
    label?: string;
    format?: GPUTextureFormat;
    alphaMode?: GPUCanvasAlphaMode;
    loadOp?: GPULoadOp;
    storeOp?: GPUStoreOp;
    clearColor?: GPUColor;
    flipY?: boolean;
    autoResize?: boolean;
    dpr?: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const width = 4;
const height = 4;
const pixels = new Uint32Array([
    0xff0000ff, 0xff00ff00, 0xffff0000, 0xffffffff,
    0xff0000ff, 0xff00ff00, 0xffff0000, 0xffffffff,
    0xff0000ff, 0xff00ff00, 0xffff0000, 0xffffffff,
    0xff0000ff, 0xff00ff00, 0xffff0000, 0xffffffff
]);
const src = wgpu.compute.createStorageBuffer({ data: pixels, copySrc: true });

const encoder = wgpu.gpu.device.createCommandEncoder();
wgpu.compute.blitRGBA8BufferToCanvas(encoder, canvas, src, width, height, { flipY: true, autoResize: true });
wgpu.gpu.queue.submit([encoder.finish()]);
```

## See Also
- [compute.createStorageBuffer](./compute-createstoragebuffer.md)
- [compute.dispatch2D](./compute-dispatch2d.md)
- [compute.dispatch3D](./compute-dispatch3d.md)
- [compute.encodeDispatch](./compute-encodedispatch.md)
- [WasmGPU.render](../render/wasmgpu-render.md)
