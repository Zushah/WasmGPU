# WasmGPU.createAnnotation.toolkit().bindPointerTarget

## Summary
WasmGPU.createAnnotation.toolkit().bindPointerTarget changes the DOM element that receives annotation pointer events.
Existing bindings are removed before the new target is applied.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().bindPointerTarget(target: HTMLElement | null): this
toolkit.bindPointerTarget(target);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | `HTMLElement \| null` | Yes | New pointer event source, or `null` to disable target binding. |

## Returns
`this` - Returns the same toolkit.

## Example
```js
const canvas = document.querySelector("canvas");
const hud = document.getElementById("interaction-layer");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas, autoBindPointerEvents: true });

toolkit.bindPointerTarget(hud);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().setAutoBindPointerEvents](./wasmgpu-annotationtoolkit-setautobindpointerevents.md)
- [WasmGPU.createAnnotation.toolkit().attach](./wasmgpu-annotationtoolkit-attach.md)
