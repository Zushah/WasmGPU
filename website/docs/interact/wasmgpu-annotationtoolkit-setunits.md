# WasmGPU.createAnnotation.toolkit().setUnits

## Summary
WasmGPU.createAnnotation.toolkit().setUnits updates distance and angle display formatting rules.
Changing units triggers label refresh so existing annotations reflect new formatting immediately.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().setUnits(units: AnnotationUnitsDescriptor): this
toolkit.setUnits(units);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `units` | `AnnotationUnitsDescriptor` | Yes | Unit conversion and display formatting configuration. |

## Returns
`this` - Returns the same toolkit.

## Type Details
```ts
type AnnotationUnitsDescriptor = {
    worldUnitsPerUnit?: number;
    symbol?: string;
    decimals?: number;
    autoMetric?: boolean;
    angleUnit?: "deg" | "rad";
    angleDecimals?: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas });

toolkit.setUnits({
    worldUnitsPerUnit: 0.001,
    symbol: "mm",
    decimals: 2,
    autoMetric: false,
    angleUnit: "deg",
    angleDecimals: 1
});
```

## See Also
- [WasmGPU.createAnnotation.toolkit().units](./wasmgpu-annotationtoolkit-units.md)
- [WasmGPU.createAnnotation.toolkit().createDistance](./wasmgpu-annotationtoolkit-createdistance.md)
- [WasmGPU.createAnnotation.toolkit().createAngle](./wasmgpu-annotationtoolkit-createangle.md)
