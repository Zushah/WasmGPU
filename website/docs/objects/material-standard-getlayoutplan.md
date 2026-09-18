# material.standard#getLayoutPlan

## Summary
material.standard#getLayoutPlan returns the immutable texture/sampler binding plan derived from the material's active texture features.

## Syntax
```ts
StandardMaterial.getLayoutPlan(): StandardMaterialLayoutPlan
```

## Parameters
This method does not take parameters.

## Returns
```ts
type StandardMaterialLayoutPlan = Readonly<{
    featureKey: string;
    bindings: readonly StandardMaterialLayoutBinding[];
    sampledTextureCount: number;
    samplerCount: number;
    usesTransmission: boolean;
}>;

type StandardMaterialLayoutBinding = Readonly<{
    slot: StandardMaterialTextureSlot;
    samplerBinding: number;
    textureBinding: number;
    colorSpace: "srgb" | "linear";
}>;
```

The plan is validated against device sampling limits before layout creation. Numeric binding assignments are intended only for direct integration with the material shader contract and should not be persisted as general material metadata.

## Type Details
The plan is derived from the material's active texture features. `featureKey` identifies that layout feature set, `bindings` maps texture slots to group-1 sampler and texture bindings, the count fields support device-limit validation, and `usesTransmission` signals the extra transmission-source path.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const material = wgpu.material.standard();

const plan = material.getLayoutPlan();
console.log(plan.featureKey, plan.sampledTextureCount);
for (const binding of plan.bindings) {
  console.log(binding.slot, binding.samplerBinding, binding.textureBinding);
}
```

## See Also
- [material.standard](./material-standard.md)
- [material.standard#createBindGroupLayout](./material-standard-createbindgrouplayout.md)
