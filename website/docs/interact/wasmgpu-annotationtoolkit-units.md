# WasmGPU.createAnnotation.toolkit().units

## Summary
WasmGPU.createAnnotation.toolkit().units returns the resolved measurement-unit configuration used by label formatting.
It includes defaults and normalized values derived from `setUnits`/constructor input.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().units: ResolvedAnnotationUnits
const units = toolkit.units;
```

## Parameters
This accessor does not take parameters.

## Returns
`ResolvedAnnotationUnits` - Current normalized unit settings for distance and angle labels.

## Type Details
```ts
type ResolvedAnnotationUnits = {
    worldUnitsPerUnit: number;
    symbol: string;
    decimals: number;
    autoMetric: boolean;
    angleUnit: "deg" | "rad";
    angleDecimals: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas, units: { symbol: "m", decimals: 3, angleUnit: "deg" } });

console.log(toolkit.units.symbol, toolkit.units.decimals);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().setUnits](./wasmgpu-annotationtoolkit-setunits.md)
- [WasmGPU.createAnnotation.toolkit().createDistance](./wasmgpu-annotationtoolkit-createdistance.md)
