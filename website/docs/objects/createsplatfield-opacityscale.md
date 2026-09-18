# createSplatField#opacityScale

## Summary

`createSplatField#opacityScale` is the global multiplier for stored opacity. Assignment clamps negative values to zero; rendering additionally clamps the effective value to `[0, 1]`, so stored values above one do not amplify opacity.

## Syntax

```ts
SplatField.opacityScale: number
splatField.opacityScale = 0.75;
```

## See Also

- [createSplatField#dirtyUniforms](./createsplatfield-dirtyuniforms.md)
- [createSplatField#getUniformData](./createsplatfield-getuniformdata.md)
