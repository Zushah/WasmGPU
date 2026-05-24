# Light.type

## Summary
Light.type identifies the concrete light category and is read-only. Values are `"ambient"`, `"directional"`, `"point"`, or `"spot"`. Use this for light-type branching in tooling and diagnostics.

## Syntax
```ts
Light.type: "ambient" | "directional" | "point" | "spot"
const type = light.type;
```

## Parameters
This property does not take parameters.

## Returns
`"ambient" | "directional" | "point" | "spot"` - Type discriminator for the light instance.

## Type Details
```ts
type LightType = "ambient" | "directional" | "point" | "spot";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.ambient({ intensity: 0.2 });
if (light.type === "ambient") {
    console.log("ambient baseline enabled");
}
```

## See Also
- [WasmGPU.createLight.ambient](./wasmgpu-createlight-ambient.md)
- [WasmGPU.createLight.directional](./wasmgpu-createlight-directional.md)
- [WasmGPU.createLight.point](./wasmgpu-createlight-point.md)
- [WasmGPU.createLight.spot](./wasmgpu-createlight-spot.md)
