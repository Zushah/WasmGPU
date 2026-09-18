# material#label

## Summary
material#label is the optional diagnostic label supplied when a material is created.

## Syntax
```ts
Material.label: string | undefined
```

## Parameters
This read-only property does not take parameters. Supply `label` in the material descriptor at construction time.

## Returns
`string | undefined` - The configured diagnostic label, or `undefined` when none was provided.

## Type Details
`label` is available on standard, unlit, data, and custom materials through their shared `Material` base class. It is retained verbatim and is not used to select shaders, pipelines, or bind groups.

## Example
```js
const material = wgpu.material.standard({
  label: "polished aluminum",
  metallic: 1,
  roughness: 0.2,
});

console.log(material.label); // polished aluminum
```

## Notes
The label is read-only after construction. It does not affect rendering or pipeline identity.

## See Also
- [material.standard](./material-standard.md)
- [material.custom](./material-custom.md)
- [material#destroy](./material-destroy.md)
