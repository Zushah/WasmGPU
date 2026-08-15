# GridLayer.id

## Summary
GridLayer.id is the unique key OverlaySystem uses to register and remove the grid layer. Use deterministic IDs to make layer replacement predictable.

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
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
- [OverlaySystem.removeLayer](./overlaysystem-removelayer.md)
- [GridLayer.update](./gridlayer-update.md)
