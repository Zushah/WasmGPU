# AxisTriadLayer.id

## Summary
AxisTriadLayer.id is the unique identifier used by OverlaySystem layer registration/removal APIs. Provide stable IDs when you plan to remove or replace layers programmatically.

## Syntax
```ts
AxisTriadLayer.id: string
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

const layer = wgpu.createOverlay.axisTriad({ id: "triad-01" });
console.log(layer.id);
```

## See Also
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
- [OverlaySystem.removeLayer](./overlaysystem-removelayer.md)
- [AxisTriadLayer.attach](./axistriadlayer-attach.md)
