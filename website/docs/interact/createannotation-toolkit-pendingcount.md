# createAnnotation.toolkit#pendingCount

## Summary
createAnnotation.toolkit#pendingCount reports how many anchors are waiting for a later hit. After a commit call returns, distance mode therefore has `0` or `1` pending anchor and angle mode has `0`, `1`, or `2`; the completing hit creates the record and clears the buffer synchronously.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().pendingCount: number
const count = toolkit.pendingCount;
```

## Parameters
This accessor does not take parameters.

## Returns
`number` - Number of currently staged anchors.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas });

toolkit.setMode("distance");
console.log(toolkit.pendingCount);
```

## See Also
- [createAnnotation.toolkit#setMode](./createannotation-toolkit-setmode.md)
- [createAnnotation.toolkit#onStagingChange](./createannotation-toolkit-onstagingchange.md)
