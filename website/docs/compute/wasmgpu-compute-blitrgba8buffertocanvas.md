# WasmGPU.compute.blitRGBA8BufferToCanvas

## Summary
WasmGPU.compute.blitRGBA8BufferToCanvas draws a packed `RGBA8` pixel buffer to a canvas.
The source contains one `u32` per pixel in row-major order (`r | g<<8 | b<<16 | a<<24`).
This is a fast visualization path for compute output without building a separate render pipeline.
The method records commands into the caller-provided command encoder.

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
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.dispatch2D](./wasmgpu-compute-dispatch2d.md)
- [WasmGPU.compute.dispatch3D](./wasmgpu-compute-dispatch3d.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
- [WasmGPU.render](../render/wasmgpu-render.md)
