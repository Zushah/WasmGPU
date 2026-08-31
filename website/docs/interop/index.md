# Interoperability

The interoperability subsystems cover three different memory workflows:
WasmGPU's built-in Rust/WebAssembly driver memory, caller-managed frame and heap arenas inside that memory, and typed access to foreign WebAssembly modules or Python-owned array data.

## In This Section

- Built-in driver memory views and shared-memory checks
- Frame arena scratch allocation and epoch-based lifetime rules
- Heap arena allocation with deterministic backing-block release
- External WebAssembly module memory access through `WasmModule` and `WasmMemoryView`
- Borrowed `WasmMemoryView` upload sources for geometry and scientific objects
- Python-to-CPU/GPU ndarray transfers with validated C-contiguous metadata and deterministic proxy release
- Declarative WebGPU layout and binding-resource normalization

## Suggested Starting Points

- [WasmGPU.driver](./wasmgpu-driver.md)
- [WasmGPU.frameArena](./wasmgpu-framearena.md)
- [WasmGPU.createHeapArena](./wasmgpu-createheaparena.md)
- [WasmGPU.webassembly](./wasmgpu-webassembly.md)
- [WasmGPU.python](./wasmgpu-python.md)
- [WasmGPU.webgpu](./wasmgpu-webgpu.md)

Use the sidebar for the complete interop API reference.
