# WasmGPU.createSelectionStore

## Summary
WasmGPU.createSelectionStore creates an in-memory selection container keyed by `(objectId, elementIndex)`.
It supports replace/add/remove/toggle operations and is designed to pair with `pick`, `pickRect`, and `pickLasso`.
Use it as the canonical selection state for interaction and annotation tools.

## Syntax
```ts
WasmGPU.createSelectionStore(): SelectionStore
const selection = wgpu.createSelectionStore();
```

## Parameters
This API does not take parameters.

## Returns
`SelectionStore` - Mutable selection container with fluent update methods.

## Type Details
```ts
type SelectionStore = {
    readonly size: number;
    has(objectId: number, elementIndex: number): boolean;
    values(): SelectionEntry[];
    clear(): this;
    replace(hit: PickHit | PickHit[] | null | undefined): this;
    add(hit: PickHit | PickHit[] | null | undefined): this;
    remove(hit: PickHit | PickHit[] | null | undefined): this;
    toggle(hit: PickHit | PickHit[] | null | undefined): this;
    apply(mode: "replace" | "add" | "toggle" | "remove", hit: PickHit | PickHit[] | null | undefined): this;
};

type SelectionEntry = PickHit & { key: string }; // key format: "<objectId>:<elementIndex>"
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const selection = wgpu.createSelectionStore();

canvas.addEventListener("click", async (event) => {
    const rect = canvas.getBoundingClientRect();
    const hit = await wgpu.pick(scene, camera, event.clientX - rect.left, event.clientY - rect.top);
    selection.apply(event.shiftKey ? "add" : "replace", hit);
    console.log(selection.size, selection.values().map((x) => x.key));
});
```

## See Also
- [WasmGPU.pick](./wasmgpu-pick.md)
- [WasmGPU.pickRect](./wasmgpu-pickrect.md)
- [WasmGPU.pickLasso](./wasmgpu-picklasso.md)
- [WasmGPU.createSelectionStore().apply](./wasmgpu-createselectionstore-apply.md)
- [WasmGPU.createSelectionStore().values](./wasmgpu-createselectionstore-values.md)
