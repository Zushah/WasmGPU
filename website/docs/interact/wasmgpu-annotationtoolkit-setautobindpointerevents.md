# WasmGPU.createAnnotation.toolkit().setAutoBindPointerEvents

## Summary
WasmGPU.createAnnotation.toolkit().setAutoBindPointerEvents enables or disables automatic pointer event binding.
When disabled, bound handlers are removed immediately; when enabled, handlers are attached if a pointer target exists.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().setAutoBindPointerEvents(enabled: boolean): this
toolkit.setAutoBindPointerEvents(enabled);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | Yes | Whether toolkit-managed pointer event binding should be active. |

## Returns
`this` - Returns the same toolkit.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas, autoBindPointerEvents: true });

toolkit.setAutoBindPointerEvents(false);
toolkit.bindPointerTarget(canvas);
toolkit.setAutoBindPointerEvents(true);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().bindPointerTarget](./wasmgpu-annotationtoolkit-bindpointertarget.md)
- [WasmGPU.createAnnotation.toolkit().attach](./wasmgpu-annotationtoolkit-attach.md)
