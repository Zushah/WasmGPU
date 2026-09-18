# animation.createSkin#createInstance#disposed

## Summary
animation.createSkin#createInstance#disposed reports whether `dispose()` has released the instance's GPU bone buffer and bind group. Disposing the parent `Skin` invalidates guarded instance operations but does not change this property; dispose the instance separately.

## Syntax
```ts
SkinInstance.disposed: boolean
```

## Returns
`boolean`

## See Also
- [animation.createSkin#createInstance#dispose](./animation-createskin-createinstance-dispose.md)
- [animation.createSkin#createInstance#meshWorldMatrixPtr](./animation-createskin-createinstance-meshworldmatrixptr.md)
