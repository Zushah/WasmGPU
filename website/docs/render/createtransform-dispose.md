# createTransform#dispose

## Summary
createTransform#dispose releases the transform's slot in the global transform store.
Before release, its children are detached to root-level so the hierarchy remains valid.
After disposal, most transform operations throw a use-after-dispose error.
Use this when you permanently remove objects and want to reclaim transform capacity.

## Syntax
```ts
WasmGPU.createTransform().dispose(): void
transform.dispose();
```

## Parameters
This API does not take parameters.

## Returns
`void` - This method does not return a value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform().setPosition(1, 2, 3);
console.log(t.disposed);

t.dispose();
console.log(t.disposed);
```

## See Also
- [createTransform#disposed](./createtransform-disposed.md)
- [createTransform#removeFromParent](./createtransform-removefromparent.md)
- [createTransform#addChild](./createtransform-addchild.md)
- [createTransform#reset](./createtransform-reset.md)
- [createTransform#clone](./createtransform-clone.md)
