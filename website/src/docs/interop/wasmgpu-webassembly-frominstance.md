# WasmGPU.webassembly.fromInstance

## Summary
WasmGPU.webassembly.fromInstance wraps a foreign `WebAssembly.Instance`, or any object with an `exports` field, and returns a `WasmModule`.
Use it when a loader gives you the instantiated module object and you want WasmGPU to resolve exports, memory, typed views, byte ranges, UTF-8 strings, or `DataView` regions from that foreign module.
This API is for external WebAssembly modules, not WasmGPU's built-in driver memory.

## Syntax
```ts
WasmGPU.webassembly.fromInstance(instance: WasmInstanceLike, options?: WasmModuleOptions): WasmModule

const moduleRef = WasmGPU.webassembly.fromInstance(instance, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `instance` | `WasmInstanceLike` | Yes | Foreign `WebAssembly.Instance` or any object whose `exports` field is an object. |
| `options` | `WasmModuleOptions` | No | Optional wrapper configuration, including a diagnostic name and default memory resolution source. |

## Returns
`WasmModule` - Wrapper around the foreign module's exports and memory resolution rules.

## Type Details
```ts
type WasmInstanceLike = WebAssembly.Instance | { exports: Record<string, unknown> };

type WasmModuleOptions = {
    name?: string;
    memory?: WebAssembly.Memory | string | null | undefined;
};
```

#### Memory Resolution
- Pass an explicit `WebAssembly.Memory` through `options.memory` when you already know which memory to use.
- Pass a memory export name such as `"memory"` when the instance exports more than one memory or when you want a specific one.
- Omit `options.memory` only when the instance exports exactly one memory.

## Notes
- The returned `WasmModule` can resolve exports, functions, globals, memory, typed views, byte ranges, UTF-8 strings, and `DataView` regions through the documented `WasmModule` methods on [WasmGPU.webassembly](./wasmgpu-webassembly.md).
- `options.name` labels diagnostics and wrapper-generated error messages.
- `WasmMemoryView.array()`, `bytes()`, and `dataView()` expose live external memory views rather than copies. Use `WasmMemoryView.copy()` when you need an owned JavaScript copy.
- If the foreign memory grows or an exported pointer/length changes, call `WasmMemoryView.refresh()` on cached views before reusing them.
- Range bounds and typed-array alignment are validated by the wrapper.
- External module memory may or may not be shared. These wrappers do not require `SharedArrayBuffer`-backed memory.
- This API is separate from [WasmGPU.python](./wasmgpu-python.md), which focuses on ndarray-oriented Python-JS data transfer instead of reading foreign module memory directly.

## Example
```js
const instantiated = await WebAssembly.instantiateStreaming(fetch("/example.wasm"));
const moduleRef = WasmGPU.webassembly.fromInstance(instantiated.instance ?? instantiated, {
    memory: "memory",
    name: "example"
});

const values = moduleRef.view({
    ptr: "values_ptr",
    length: "values_len",
    dtype: "u32",
    name: "values"
});

console.log(values.array()[0]);
```

## See Also
- [WasmGPU.webassembly](./wasmgpu-webassembly.md)
- [WasmGPU.webassembly.fromExports](./wasmgpu-webassembly-fromexports.md)
- [WasmGPU.webassembly.fromMemory](./wasmgpu-webassembly-frommemory.md)
- [WasmGPU.driver](./wasmgpu-driver.md)
