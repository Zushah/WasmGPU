# createSelectionStore#clear

## Summary
createSelectionStore#clear removes all current selection entries.
Use it for explicit deselect actions or before replacing selection state from another source.

## Syntax
```ts
WasmGPU.createSelectionStore().clear(): this
selection.clear();
```

## Parameters
This API does not take parameters.

## Returns
`this` - Returns the same store for chaining.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const selection = wgpu.createSelectionStore();

document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "escape") return;
    selection.clear();
    console.log("selection cleared");
});
```

## See Also
- [createSelectionStore#replace](./createselectionstore-replace.md)
- [createSelectionStore#size](./createselectionstore-size.md)
