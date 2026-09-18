# WasmGPU.webassembly

## Summary
WasmGPU.webassembly wraps foreign WebAssembly instances, exports objects, or memory objects so you can read typed arrays, byte ranges, UTF-8 strings, and `DataView` regions from external linear memory.
Use this when your data lives in another WebAssembly module.
It does not expose WasmGPU's own internal Rust/WebAssembly driver memory.
Its factory methods return `WasmModule` wrappers for those foreign memory sources.

## Syntax
```ts
WasmGPU.webassembly: WebAssemblyInterop
const webassembly = wgpu.webassembly;
```

## Parameters
This accessor does not take parameters.

## Returns
`WebAssemblyInterop` - Factory helpers for `WasmModule`.

## Type Details
```ts
type WebAssemblyInterop = {
    fromInstance(instance: WebAssembly.Instance | { exports: Record<string, unknown> }, options?: WasmModuleOptions): WasmModule;
    fromExports(exportsObject: Record<string, unknown>, options?: WasmModuleOptions): WasmModule;
    fromMemory(memory: WebAssembly.Memory, options?: Omit<WasmModuleOptions, "memory">): WasmModule;
};

type WasmModuleOptions = {
    name?: string;
    memory?: WebAssembly.Memory | string | null | undefined;
};
```

#### Factory Methods
- [`WasmGPU.webassembly.fromInstance(instance, options?)`](./webassembly-frominstance.md) wraps a `WebAssembly.Instance` or any object with an `exports` field.
- [`WasmGPU.webassembly.fromExports(exportsObject, options?)`](./webassembly-fromexports.md) wraps an exports object directly.
- [`WasmGPU.webassembly.fromMemory(memory, options?)`](./webassembly-frommemory.md) wraps a standalone `WebAssembly.Memory` when you only need memory access.

#### WasmModule
`WasmModule` resolves pointers and lengths against a foreign module and creates typed memory views.

```ts
type WasmModule = {
    getExport(name: string): unknown;
    getFunction(name: string): (...args: unknown[]) => unknown;
    getGlobal(name: string): WebAssembly.Global;
    memory(nameOrMemory?: string | WebAssembly.Memory | null): WebAssembly.Memory;
    view(descriptor: WasmViewDescriptor): WasmMemoryView;
    readBytes(descriptor: WasmBytesDescriptor): Uint8Array;
    readUtf8(ptr: WasmValueDescriptor, length: WasmValueDescriptor, options?: WasmUtf8Descriptor): string;
    dataView(descriptor: WasmDataViewDescriptor): DataView;
};
```

#### WasmModule Notes
- `getExport(name)` returns the raw export value when you need direct access.
- `getFunction(name)` and `getGlobal(name)` enforce the expected export kind instead of returning a loosely typed value.
- `view(...)` returns a refreshable `WasmMemoryView`.
- `readBytes(...)` and `dataView(...)` return live views over external memory for the requested byte range.
- `readUtf8(...)` decodes a byte range as UTF-8 text without requiring you to create a view first.

#### Pointer and Length Descriptors
Pointer and length fields accept several user-facing forms:

- Numbers or bigints when you already know the address or element count.
- Export-name strings when the module exposes a function or global that yields the value.
- Callbacks when the current value should be computed lazily.
- Descriptor objects that explicitly select a function, global, or export by name.

#### Memory Resolution
- Pass an explicit `WebAssembly.Memory` when you already know which memory to use.
- Pass a memory export name when the module exposes more than one memory and you want a specific one.
- If you omit `memory`, WasmGPU auto-selects it only when exactly one memory export exists.
- When no memory is available, or several memory exports exist without an explicit choice, WasmGPU throws instead of guessing.

#### WasmMemoryView
`module.view(...)` returns `WasmMemoryView`, a refreshable wrapper around live external memory.

```ts
type WasmMemoryView<T extends ArrayBufferView = ArrayBufferView> = {
    readonly memory: WebAssembly.Memory;
    readonly ptr: number;
    readonly length: number;
    readonly byteLength: number;
    readonly dtype: string;
    readonly name?: string;
    refresh(): WasmMemoryView<T>;
    array(): T;
    bytes(): Uint8Array;
    dataView(): DataView;
    copy(): T;
    copyInto(target: T | Uint8Array | Int8Array): void;
};
```

#### WasmMemoryView Notes
- `array()`, `bytes()`, and `dataView()` are live views over external memory, not copies.
- `copy()` returns an owned JavaScript typed-array copy of the current range.
- `copyInto(target)` writes the current contents into a caller-provided typed array.
- Call `refresh()` when an exported pointer, length, dtype, byte offset, or selected memory may have changed. Memory growth alone does not require it: `array()`, `bytes()`, and `dataView()` detect a replacement `memory.buffer` and rebuild their cached views automatically.

## Notes
- `view(...)`, `readBytes(...)`, `readUtf8(...)`, and `dataView(...)` bounds-check the requested range.
- Unlike `WasmMemoryView`, the raw views returned directly by `readBytes(...)` and `dataView(...)` do not self-refresh after memory growth; call the method again to obtain a view over the new buffer.
- Typed views are alignment-checked against the requested dtype.
- `readUtf8(ptr, length, options?)` is useful when a foreign module exposes UTF-8 strings through pointer/length exports.
- External WebAssembly interop is separate from [WasmGPU.python](./wasmgpu-python.md). Python helpers move ndarray-like data into WasmGPU-managed memory; `WasmGPU.webassembly` reads directly from a foreign module's memory.

## Example
```js
const memory = new WebAssembly.Memory({ initial: 1 });
new Uint32Array(memory.buffer, 0, 4).set([10, 20, 30, 40]);

const foreign = WasmGPU.webassembly.fromMemory(memory, { name: "external-memory" });
const values = foreign.view({ ptr: 0, length: 4, dtype: "u32", name: "values" });

console.log(values.array()[1]); // live view into external memory
const copy = values.copy();
console.log(copy);
```

## See Also
- [geometry#setWasmAttributes](../objects/geometry-setwasmattributes.md)
- [createPointCloud#setData](../objects/createpointcloud-setdata.md)
- [createGlyphField#setWasmPositions](../objects/createglyphfield-setwasmpositions.md)
- [createNodeLink#setNodeData](../objects/createnodelink-setnodedata.md)
- [createSplatField#setWasmPackedData](../objects/createsplatfield-setwasmpackeddata.md)
- [createLatticeSpace#setData](../objects/createlatticespace-setdata.md)
- [webassembly.fromInstance](./webassembly-frominstance.md)
- [webassembly.fromExports](./webassembly-fromexports.md)
- [webassembly.fromMemory](./webassembly-frommemory.md)
- [WasmGPU.driver](./wasmgpu-driver.md)
- [WasmGPU.frameArena](./wasmgpu-framearena.md)
- [WasmGPU.python](./wasmgpu-python.md)
