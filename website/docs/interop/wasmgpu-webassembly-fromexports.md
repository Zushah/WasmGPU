# WasmGPU.webassembly.fromExports

## Summary
WasmGPU.webassembly.fromExports wraps a raw exports object and returns a `WasmModule`.
Use it when a framework, loader, or host only gives you `instance.exports`, or when you want to wrap a manually assembled exports-like object without carrying around the full `WebAssembly.Instance`.
This API is for external WebAssembly modules, not WasmGPU's built-in driver memory.

## Syntax
```ts
WasmGPU.webassembly.fromExports(exportsObject: WasmExportsLike, options?: WasmModuleOptions): WasmModule

const moduleRef = WasmGPU.webassembly.fromExports(exportsObject, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `exportsObject` | `WasmExportsLike` | Yes | Raw exports object to wrap. It must be an object. |
| `options` | `WasmModuleOptions` | No | Optional wrapper configuration, including a diagnostic name and default memory resolution source. |

## Returns
`WasmModule` - Wrapper around the supplied exports object and its memory resolution rules.

## Type Details
```ts
type WasmExportsLike = Record<string, unknown>;

type WasmModuleOptions = {
    name?: string;
    memory?: WebAssembly.Memory | string | null | undefined;
};
```

#### Descriptor Inputs
When you later create views or reads from the returned `WasmModule`, pointer and length inputs can be:

- numbers or bigints
- export-name strings
- callbacks
- descriptor objects that select functions, globals, or exports explicitly

#### Memory Resolution
- Pass an explicit `WebAssembly.Memory` through `options.memory` when memory is not itself an export.
- Pass a memory export name when the exports object exposes several memories or when you want a specific one.
- Omit `options.memory` only when the exports object contains exactly one memory export.

## Notes
- This is usually the most direct factory when you already have `instance.exports`.
- `WasmMemoryView.array()`, `bytes()`, and `dataView()` expose live external memory views rather than copies. Use `WasmMemoryView.copy()` when you need an owned JavaScript copy.
- If the foreign memory grows or an exported pointer/length changes, call `WasmMemoryView.refresh()` on cached views before reusing them.
- Range bounds and typed-array alignment are validated by the wrapper.
- External module memory may or may not be shared. These wrappers do not require `SharedArrayBuffer`-backed memory.
- This API is separate from [WasmGPU.python](./wasmgpu-python.md), which focuses on ndarray-oriented Python-JS data transfer instead of reading foreign module memory directly.

## Example
```js
const moduleRef = WasmGPU.webassembly.fromExports(instance.exports, {
    memory: "memory",
    name: "example-exports"
});

const values = moduleRef.view({
    ptr: "values_ptr",
    length: "values_len",
    dtype: "f32",
    name: "values"
}).array();

console.log(values[0]);
```

## See Also
- [WasmGPU.webassembly](./wasmgpu-webassembly.md)
- [WasmGPU.webassembly.fromInstance](./wasmgpu-webassembly-frominstance.md)
- [WasmGPU.webassembly.fromMemory](./wasmgpu-webassembly-frommemory.md)
- [WasmGPU.driver](./wasmgpu-driver.md)
