# GlyphField.destroy

## Summary
`GlyphField.destroy` releases its transform, uniform buffer, retained records, Wasm-source references, listeners, and instance buffers it owns. Caller-supplied buffers are destroyed only when ownership was transferred with descriptor or setter option `ownBuffers: true`; borrowed buffers are detached.

The glyph geometry reference is not released or destroyed by this method. If the application created a custom `Geometry` solely for this field, manage that geometry's reference-counted lifetime separately.

## Syntax
```ts
GlyphField.destroy(): void
glyphField.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
glyphField.destroy();
console.log(glyphField.positionsBuffer, glyphField.attributesBuffer); // null, null
```

## See Also
- [GlyphField.applyScaleStats](./wasmgpu-objects-glyphfield-applyscalestats.md)
- [GlyphField.colormap](./wasmgpu-objects-glyphfield-colormap.md)
- [GlyphField.colormapStops](./wasmgpu-objects-glyphfield-colormapstops.md)
- [GlyphField.colorMode](./wasmgpu-objects-glyphfield-colormode.md)
- [GlyphField.computeBoundsFromCPUData](./wasmgpu-objects-glyphfield-computeboundsfromcpudata.md)
- [GlyphField.dirtyUniforms](./wasmgpu-objects-glyphfield-dirtyuniforms.md)
- [GlyphField.getAttributeRecord](./wasmgpu-objects-glyphfield-getattributerecord.md)
- [GlyphField.getBounds](./wasmgpu-objects-glyphfield-getbounds.md)
- [GlyphField.getColormapForBinding](./wasmgpu-objects-glyphfield-getcolormapforbinding.md)
- [GlyphField.getColormapKey](./wasmgpu-objects-glyphfield-getcolormapkey.md)
- [GlyphField.getLocalBounds](./wasmgpu-objects-glyphfield-getlocalbounds.md)
- [GlyphField.getScaleSourceDescriptor](./wasmgpu-objects-glyphfield-getscalesourcedescriptor.md)
