# createOverlay.grid#id

## Summary
createOverlay.grid#id is the unique key OverlaySystem uses to register and remove the grid layer. Use deterministic IDs to make layer replacement predictable.

## Syntax
```ts
GridLayer.id: string
const id = layer.id;
```

## Parameters
This property does not take parameters.

## Returns
`string` - Layer identifier.

## Type Details
```ts
// Read-only string property.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const layer = wgpu.createOverlay.grid({ id: "grid-main" });
console.log(layer.id);
```

## See Also
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
- [createOverlay.system#removeLayer](./createoverlay-system-removelayer.md)
- [createOverlay.grid#update](./createoverlay-grid-update.md)
