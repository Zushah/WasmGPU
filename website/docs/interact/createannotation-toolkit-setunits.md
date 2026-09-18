# createAnnotation.toolkit#setUnits

## Summary
createAnnotation.toolkit#setUnits updates distance and angle display formatting rules.
Changing units triggers label refresh so existing annotations reflect new formatting immediately.
It does not change stored world distances, angles, or the store revision, but it does notify annotation-change listeners as part of the refresh.

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
    worldUnitsPerUnit?: number; // default: 1; nonpositive/nonfinite values become 1
    symbol?: string; // default: "wu"
    decimals?: number; // default: 3, clamped to 0..12
    autoMetric?: boolean; // default: false
    angleUnit?: "deg" | "rad"; // default: "deg"
    angleDecimals?: number; // default: 2, clamped to 0..12
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
- [createAnnotation.toolkit#units](./createannotation-toolkit-units.md)
- [createAnnotation.toolkit#createDistance](./createannotation-toolkit-createdistance.md)
- [createAnnotation.toolkit#createAngle](./createannotation-toolkit-createangle.md)
