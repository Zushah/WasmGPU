# WasmGPU.webassembly.fromMemory

## Summary
WasmGPU.webassembly.fromMemory wraps a bare `WebAssembly.Memory` and returns a `WasmModule`.
Use it when there is no exports object to inspect, or when you only need typed views, byte reads, UTF-8 reads, or `DataView` regions over the supplied external memory.
This API does not allocate WasmGPU internal driver memory.

## Syntax
```ts
WasmGPU.webassembly.fromMemory(memory: WebAssembly.Memory, options?: Omit<WasmModuleOptions, "memory">): WasmModule

const moduleRef = WasmGPU.webassembly.fromMemory(memory, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `memory` | `WebAssembly.Memory` | Yes | External linear memory to wrap directly. |
| `options` | `Omit<WasmModuleOptions, "memory">` | No | Optional wrapper configuration. In practice this is mainly the `name` label used in diagnostics. |

## Returns
`WasmModule` - Memory-only wrapper around the supplied `WebAssembly.Memory`.

## Type Details
```ts
type WasmModuleOptions = {
    name?: string;
    memory?: WebAssembly.Memory | string | null | undefined;
};
```

`WasmGPU.webassembly.fromMemory` supplies the memory directly, so you do not pass `options.memory` here.

## Notes
- The returned `WasmModule` is mainly for `view(...)`, `readBytes(...)`, `readUtf8(...)`, and `dataView(...)`.
- Because this wrapper is built from memory alone, it does not provide functions or globals unless you wrap an exports object through [WasmGPU.webassembly.fromExports](./wasmgpu-webassembly-fromexports.md) or an instance through [WasmGPU.webassembly.fromInstance](./wasmgpu-webassembly-frominstance.md) instead.
- `WasmMemoryView.array()`, `bytes()`, and `dataView()` expose live external memory views rather than copies. Use `WasmMemoryView.copy()` when you need an owned JavaScript copy.
- If the external memory grows, call `WasmMemoryView.refresh()` on cached views before reusing them.
- Range bounds and typed-array alignment are validated by the wrapper.
- External module memory may or may not be shared. This wrapper does not require `SharedArrayBuffer`-backed memory.
- This API is separate from [WasmGPU.python](./wasmgpu-python.md), which focuses on ndarray-oriented Python-JS data transfer instead of reading foreign module memory directly.

## Example
```js
const memory = new WebAssembly.Memory({ initial: 1 });
new Uint32Array(memory.buffer, 0, 4).set([10, 20, 30, 40]);

const moduleRef = WasmGPU.webassembly.fromMemory(memory, { name: "scratch" });
const values = moduleRef.view({
    ptr: 0,
    length: 4,
    dtype: "u32",
    name: "scratch-values"
});

console.log(values.array()[1]);
```

## See Also
- [WasmGPU.webassembly](./wasmgpu-webassembly.md)
- [WasmGPU.webassembly.fromInstance](./wasmgpu-webassembly-frominstance.md)
- [WasmGPU.webassembly.fromExports](./wasmgpu-webassembly-fromexports.md)
- [WasmGPU.driver](./wasmgpu-driver.md)
