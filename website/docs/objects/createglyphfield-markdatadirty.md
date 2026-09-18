# createGlyphField#markDataDirty

## Summary
createGlyphField#markDataDirty schedules re-upload of CPU or raw-pointer channels after the caller changes their contents. It has no upload effect for borrowed external GPU-buffer channels, whose writes are already visible to WebGPU.

## Syntax
```ts
GlyphField.markDataDirty(): void
glyphField.markDataDirty();
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const positions = new Float32Array([0, 0, 0, 0]);
const glyphField = wgpu.createGlyphField({
    instanceCount: 1,
    positions,
    rotations: new Float32Array([0, 0, 0, 1]),
    scales: new Float32Array([1, 1, 1, 0]),
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 },
    keepCPUData: true
});

glyphField.upload(wgpu.gpu.device, wgpu.gpu.queue);
positions[0] = 2;
glyphField.markDataDirty();
glyphField.upload(wgpu.gpu.device, wgpu.gpu.queue);
```

## See Also
- [createGlyphField#setCPUData](./createglyphfield-setcpudata.md)
- [createGlyphField#upload](./createglyphfield-upload.md)
- [createGlyphField#refreshFromWasm](./createglyphfield-refreshfromwasm.md)
