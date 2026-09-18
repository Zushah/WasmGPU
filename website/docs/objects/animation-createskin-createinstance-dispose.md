# animation.createSkin#createInstance#dispose

## Summary
animation.createSkin#createInstance#dispose destroys the instance's GPU bone buffer and clears its bind group. It does not dispose the referenced mesh transform or free its world-matrix record. The call is idempotent.

The parent `Skin` has a separate lifetime and must be disposed independently. After instance disposal, guarded members such as `meshWorldMatrixPtr` and `jointCount` throw.

## Syntax
```ts
SkinInstance.dispose(): void
instance.dispose();
```

## Returns
`void`

## See Also
- [animation.createSkin#createInstance#disposed](./animation-createskin-createinstance-disposed.md)
- [animation.createSkin#createInstance#meshWorldMatrixPtr](./animation-createskin-createinstance-meshworldmatrixptr.md)
- [animation.createSkin#dispose](./animation-createskin-dispose.md)
