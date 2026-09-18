# createLatticeSpace#setData

## Summary

This page documents the three methods that supply packed cell values from CPU or WebAssembly memory. `setData()` copies a JavaScript array, `setWasmData()` borrows a WebAssembly view and refreshes it immediately, and `refreshWasmData()` re-reads the attached view after producer changes.

## Syntax

```ts
LatticeSpace.setData(data: Float32Array, options?: { keepCPUData?: boolean }): void
LatticeSpace.setWasmData(source: WasmMemoryView<Float32Array> | null, options?: LatticeSpaceWasmSourceOptions): void
LatticeSpace.refreshWasmData(options?: LatticeSpaceWasmRefreshOptions): void
```

## Data layout

Cell values use X-fastest order. For dimensions `[width, height, depth]`, the linear cell index is `x + width * (y + height * z)`; omit the depth term for a 2D lattice. Each cell contributes exactly `componentCount` consecutive `f32` values, so every complete data source has exactly `cellCount * componentCount` elements.

In scalar color mode, `scaleTransform` chooses a component or vector magnitude from each record. RGBA mode requires `componentCount === 4` and interprets each record as `[r, g, b, a]`. Solid mode does not use cell values for color, though installed data remains available for later mode changes.

## Method behavior

- `setData(data, options)` validates the exact length and stores a copy, so later changes to `data` are not observed. It detaches any WebAssembly data source and replaces an external GPU-buffer source on the next upload.
- `setWasmData(source, options)` requires an `f32` `WasmMemoryView`. A non-null source is borrowed, refreshed immediately, and must expose the exact required element count. Passing `null` detaches the view; already uploaded GPU data remains available.
- `refreshWasmData(options)` does nothing when no WebAssembly data source is attached. Otherwise it refreshes the view, revalidates its dtype and exact length, updates an optional retained CPU snapshot, and marks the data for upload.

```ts
type LatticeSpaceWasmSourceOptions = {
    capacity?: number;
    keepCPUData?: boolean;
};

type LatticeSpaceWasmRefreshOptions = {
    keepCPUData?: boolean;
};
```

`capacity` is a non-negative cell-record capacity hint for the GPU allocation used by this WebAssembly channel. It does not change the immutable lattice dimensions or active `cellCount`.

## Ownership, retention, and upload

CPU arrays are copied; WebAssembly memory is borrowed and never freed by the lattice. These APIs replace the data source family, which is mutually exclusive with `setDataBuffer()`.

`keepCPUData` controls whether a CPU snapshot remains available for `getCellRecord()` and `updateData()`. Without retention, `upload(device, queue)` may discard the CPU copy after transfer. Upload copies dirty CPU or WebAssembly values into lattice-owned WebGPU storage; calling a setter or refresh method alone does not perform that transfer. After a WebAssembly producer writes new values or changes exported pointer/length metadata, refresh before inspecting CPU records or relying on the next upload.

## See Also

- [createLatticeSpace#updateData](./createlatticespace-updatedata.md)
- [createLatticeSpace#setDataBuffer](./createlatticespace-setdatabuffer.md)
- [createLatticeSpace#refreshFromWasm](./createlatticespace-refreshfromwasm.md)
