# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
# WasmGPU Python-in-the-browser helpers for Pyodide/JupyterLite.

This module (`./python/interop.py`) is a Python-side convenience layer
for WasmGPU's JavaScript/TypeScript Python interop API (`pythonInterop`/
`WasmGPU.python`).

## Core idea
The fast path is:
1. NumPy ndarray in Pyodide.
2. JavaScript `PyProxy.getBuffer()`.
3. TypedArray view.
4. Single bulk copy into WasmGPU's WebAssembly memory.

This avoids JSON, Python lists/nested arrays, and elementwise loops.

It does not avoid a copy entirely because Pyodide and WasmGPU are distinct
WebAssembly modules with distinct linear memories.

## Prerequisites
- Runs in Pyodide/JupyterLite (must support `import js`).
- WasmGPU bundle is loaded in JavaScript and its WebAssembly has been initialized.
- NumPy is available.

## Example
```python
import numpy as np
from js import WasmGPU
from interop import WasmGPUInterop

# 0. Optional: create helper and ensure WebAssembly initialized.
interop = WasmGPUInterop(WasmGPU)
# If you are not certain WasmGPU.wasminit has run, uncomment:
# await interop.init_webassembly()

# 1. Create a C-contiguous float32 array (fast-path).
data = np.ascontiguousarray(np.random.rand(1000, 3), dtype=np.float32)

# 2. Send to WasmGPU in one bulk copy to WebAssembly memory.
gpu_handle = interop.send(data) # returns a WasmGPUArray wrapper

# 3. Fast update without reallocation.
new_data = np.ascontiguousarray(data * 2.0, dtype=data.dtype)
gpu_handle.update(new_data) # in-place overwrite of the WebAssembly allocation

# 4. Pull a copy back to Python in one bulk copy.
result = gpu_handle.to_numpy()

# 5. Clean up when you're done if you don't need the allocation anymore.
gpu_handle.free() # frees only heap-allocated handles; arenas require reset()

# If you allocated with an arena:
# arena = interop.create_arena(10_000_000) # example
# gpu_handle = interop.send(data, allocator=arena)
# ... later ...
# arena.reset()   # invalidates all handles from that arena

```

## Notes on memory management
- Heap allocations are reusable after `free`; freed handles reject later memory access.
- Calling `WasmGPUArray.free()` repeatedly is safe and idempotent.
- Prefer allocating once and updating via `copyInto`.
- For batch-style allocations, use `WasmGPUArena` and `reset()` between batches.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Literal, Optional, Tuple, Union
import warnings

class WasmGPUInteropError(RuntimeError):
    """Raised for WasmGPU interop configuration errors."""

DType = Literal["f32", "f64", "i8", "u8", "i16", "u16", "i32", "u32"]
CopyPolicy = Literal["never", "if_needed", "always"]
CastingPolicy = Literal["no", "equiv", "safe", "same_kind", "unsafe"]

def _require_js() -> Any:
    try:
        import js  # type: ignore
    except Exception as e:  # pragma: no cover
        raise WasmGPUInteropError("This module must run in Pyodide/JupyterLite (expected `import js` to work).") from e
    return js

def _require_numpy() -> Any:
    try:
        import numpy as np  # type: ignore
    except Exception as e:  # pragma: no cover
        raise WasmGPUInteropError("NumPy is required. In Pyodide you may need to load it first (e.g. `await pyodide.loadPackage('numpy')`).") from e
    return np

def _is_sequence(x: Any) -> bool:
    return isinstance(x, (list, tuple))

def _as_int_tuple(shape: Any) -> Tuple[int, ...]:
    if shape is None:
        return tuple()
    if hasattr(shape, "to_py"):
        try:
            shape = shape.to_py()
        except Exception:
            pass
    if not _is_sequence(shape):
        raise WasmGPUInteropError(f"Expected shape to be a sequence, got: {type(shape)!r}")
    out = []
    for i, d in enumerate(shape):
        try:
            di = int(d)
        except Exception as e:
            raise WasmGPUInteropError(f"shape[{i}] is not an int: {d!r}") from e
        if di < 0:
            raise WasmGPUInteropError(f"shape[{i}] must be >= 0, got {di}")
        out.append(di)
    return tuple(out)

def _supported_dtypes() -> Tuple[str, ...]:
    return ("f32", "f64", "i8", "u8", "i16", "u16", "i32", "u32")

def _numpy_to_wasmgpu_dtype(np_dtype: Any) -> DType:
    np = _require_numpy()
    dt = np.dtype(np_dtype)
    if dt == np.dtype("float32"):
        return "f32"
    if dt == np.dtype("float64"):
        return "f64"
    if dt == np.dtype("int8"):
        return "i8"
    if dt == np.dtype("uint8"):
        return "u8"
    if dt == np.dtype("int16"):
        return "i16"
    if dt == np.dtype("uint16"):
        return "u16"
    if dt == np.dtype("int32"):
        return "i32"
    if dt == np.dtype("uint32"):
        return "u32"
    raise WasmGPUInteropError(f"Unsupported dtype {dt!r}. Supported dtypes: {', '.join(_supported_dtypes())}.")

def _wasmgpu_to_numpy_dtype(dtype: DType) -> Any:
    np = _require_numpy()
    return {
        "f32": np.dtype("float32"),
        "f64": np.dtype("float64"),
        "i8": np.dtype("int8"),
        "u8": np.dtype("uint8"),
        "i16": np.dtype("int16"),
        "u16": np.dtype("uint16"),
        "i32": np.dtype("int32"),
        "u32": np.dtype("uint32")
    }[dtype]

def _normalize_dtype(dtype: Any) -> Optional[DType]:
    if dtype is None:
        return None
    if isinstance(dtype, str):
        s = dtype.strip().lower()
        if s in _supported_dtypes():
            return s  # type: ignore
        raise WasmGPUInteropError(f"Unsupported dtype string {dtype!r}. Supported: {', '.join(_supported_dtypes())}.")
    return _numpy_to_wasmgpu_dtype(dtype)

def ensure_array(x: Any, *, dtype: Optional[Union[DType, str]] = None, copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe") -> Any:
    np = _require_numpy()
    target_dtype = _normalize_dtype(dtype)
    arr = np.asarray(x)
    if arr.dtype == np.dtype("object"):
        raise WasmGPUInteropError("Object arrays are not supported. Convert to a numeric dtype first.")
    if target_dtype is not None:
        np_target = _wasmgpu_to_numpy_dtype(target_dtype)
        if arr.dtype != np_target:
            if copy == "never":
                raise WasmGPUInteropError(f"dtype mismatch: array is {arr.dtype}, required {np_target} (copy policy is 'never').")
            if not np.can_cast(arr.dtype, np_target, casting=casting):
                raise WasmGPUInteropError(f"Cannot cast dtype {arr.dtype} -> {np_target} with casting='{casting}'.")
            arr = arr.astype(np_target, order="C", casting=casting, copy=True)
    _numpy_to_wasmgpu_dtype(arr.dtype)
    is_c = bool(getattr(arr.flags, "c_contiguous", arr.flags["C_CONTIGUOUS"]))
    if copy == "always":
        arr = np.ascontiguousarray(arr)
    elif not is_c:
        if copy == "never":
            raise WasmGPUInteropError("Array must be C-contiguous. Use np.ascontiguousarray(arr) (copy policy is 'never').")
        arr = np.ascontiguousarray(arr)
    return arr

def _resolve_wasmgpu(wasmgpu: Any = None) -> Any:
    js = _require_js()
    if wasmgpu is not None:
        return wasmgpu
    if hasattr(js, "WasmGPU"):
        return getattr(js, "WasmGPU")
    if hasattr(js, "globalThis") and hasattr(js.globalThis, "WasmGPU"):
        return getattr(js.globalThis, "WasmGPU")
    raise WasmGPUInteropError("Could not find WasmGPU in the JavaScript global namespace. Make sure you loaded the WasmGPU bundle (e.g. via a <script> tag) or pass the module object explicitly: WasmGPUInterop(WasmGPU).")

def _resolve_python_api(wasmgpu: Any) -> Any:
    candidates = []
    if hasattr(wasmgpu, "python"):
        candidates.append(getattr(wasmgpu, "python"))
    if hasattr(wasmgpu, "pythonInterop"):
        candidates.append(getattr(wasmgpu, "pythonInterop"))
    if hasattr(wasmgpu, "WasmGPU"):
        cls = getattr(wasmgpu, "WasmGPU")
        if hasattr(cls, "python"):
            candidates.append(getattr(cls, "python"))
    for c in candidates:
        if c is None:
            continue
        if (hasattr(c, "sendNdarray") and hasattr(c, "copyInto") and hasattr(c, "view") and hasattr(c, "bytes")):
            return c
    raise WasmGPUInteropError(
        "WasmGPU Python interop API not found. Expected one of: WasmGPU.python, WasmGPU.pythonInterop, or WasmGPU.WasmGPU.python, with methods sendNdarray/copyInto/view/bytes/free.")

def _resolve_init_wasm(wasmgpu: Any) -> Optional[Any]:
    if hasattr(wasmgpu, "initWebAssembly"):
        return getattr(wasmgpu, "initWebAssembly")
    return None

def _resolve_create_heap_arena(wasmgpu: Any) -> Optional[Any]:
    if hasattr(wasmgpu, "createHeapArena"):
        return getattr(wasmgpu, "createHeapArena")
    if hasattr(wasmgpu, "driver") and hasattr(wasmgpu.driver, "createHeapArena"):
        return getattr(wasmgpu.driver, "createHeapArena")
    if hasattr(wasmgpu, "WasmGPU") and hasattr(wasmgpu.WasmGPU, "createHeapArena"):
        return getattr(wasmgpu.WasmGPU, "createHeapArena")
    return None

def _resolve_frame_arena(wasmgpu: Any) -> Optional[Any]:
    if hasattr(wasmgpu, "frameArena"):
        return getattr(wasmgpu, "frameArena")
    if hasattr(wasmgpu, "WasmGPU") and hasattr(wasmgpu.WasmGPU, "frameArena"):
        return getattr(wasmgpu.WasmGPU, "frameArena")
    return None

@dataclass(frozen=True)
class HandleInfo:
    kind: str
    dtype: DType
    shape: Tuple[int, ...]
    ptr: int
    length: int
    byte_length: int
    epoch: Optional[int] = None

    @staticmethod
    def from_js(handle: Any) -> "HandleInfo":
        kind = str(getattr(handle, "kind"))
        dtype = str(getattr(handle, "dtype"))
        if dtype not in _supported_dtypes():
            raise WasmGPUInteropError(f"Invalid handle dtype: {dtype!r}")
        shape = _as_int_tuple(getattr(handle, "shape", ()))
        ptr = int(getattr(handle, "ptr"))
        length = int(getattr(handle, "length"))
        byte_length = int(getattr(handle, "byteLength"))
        epoch = getattr(handle, "epoch", None)
        epoch_i = int(epoch) if epoch is not None else None
        return HandleInfo(
            kind=kind,
            dtype=dtype,  # type: ignore
            shape=shape,
            ptr=ptr,
            length=length,
            byte_length=byte_length,
            epoch=epoch_i
        )

class WasmGPUArena:
    def __init__(self, js_arena: Any, *, name: Optional[str] = None):
        self._js_arena = js_arena
        self.name = name

    @property
    def js(self) -> Any:
        return self._js_arena

    def epoch(self) -> int:
        return int(self._js_arena.epoch())

    def used_bytes(self) -> int:
        return int(self._js_arena.usedBytes())

    def reset(self) -> None:
        self._js_arena.reset()

    def destroy(self) -> None:
        self._js_arena.destroy()

    def __enter__(self) -> "WasmGPUArena":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        try:
            self.reset()
        except Exception:
            pass

    def __repr__(self) -> str:
        n = f" name={self.name!r}" if self.name else ""
        try:
            used = self.used_bytes()
            epoch = self.epoch()
        except Exception:
            used = -1
            epoch = -1
        return f"<WasmGPUArena used={used} epoch={epoch}{n}>"

class WasmGPUArray:
    def __init__(self, interop: "WasmGPUInterop", handle: Any, *, arena: Optional[WasmGPUArena] = None):
        self._interop = interop
        self._handle = handle
        self._arena = arena
        self._freed = False

    @property
    def handle(self) -> Any:
        return self._handle

    @property
    def info(self) -> HandleInfo:
        return HandleInfo.from_js(self._handle)

    def to_dict(self) -> dict:
        i = self.info
        d = {
            "kind": i.kind,
            "dtype": i.dtype,
            "shape": list(i.shape),
            "ptr": i.ptr,
            "length": i.length,
            "byteLength": i.byte_length
        }
        if i.epoch is not None:
            d["epoch"] = i.epoch
        return d

    @property
    def dtype(self) -> DType:
        return self.info.dtype

    @property
    def shape(self) -> Tuple[int, ...]:
        return self.info.shape

    @property
    def ptr(self) -> int:
        return self.info.ptr

    @property
    def length(self) -> int:
        return self.info.length

    @property
    def byte_length(self) -> int:
        return self.info.byte_length

    @property
    def kind(self) -> str:
        return self.info.kind

    def _assert_valid(self) -> None:
        if self._freed:
            raise WasmGPUInteropError("This WasmGPUArray has been freed.")
        i = self.info
        if i.kind == "arena" and self._arena is not None and i.epoch is not None:
            cur = self._arena.epoch()
            if cur != i.epoch:
                raise WasmGPUInteropError("This handle was allocated from a WasmGPUArena that has since been reset/destroyed "f"(handle epoch={i.epoch}, current epoch={cur}).")

    def view_js(self) -> Any:
        self._assert_valid()
        return self._interop._python.view(self._handle)

    def bytes_js(self) -> Any:
        self._assert_valid()
        return self._interop._python.bytes(self._handle)

    def update(self, x: Any, *, copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe") -> None:
        self._assert_valid()
        arr = ensure_array(x, dtype=self.dtype, copy=copy, casting=casting)
        if tuple(arr.shape) != self.shape:
            raise WasmGPUInteropError(f"Shape mismatch: handle expects {self.shape}, got {tuple(arr.shape)}")
        self._interop._python.copyInto(self._handle, arr)

    def to_numpy(self) -> Any:
        np = _require_numpy()
        js_view = self.view_js()
        mv = js_view.to_py() if hasattr(js_view, "to_py") else js_view
        out = np.asarray(mv)
        if self.shape:
            out = out.reshape(self.shape)
        return out

    def read_into(self, out: Any) -> None:
        self._assert_valid()
        np = _require_numpy()
        if not isinstance(out, np.ndarray):
            raise WasmGPUInteropError("read_into(out): out must be a numpy.ndarray")
        if _numpy_to_wasmgpu_dtype(out.dtype) != self.dtype:
            raise WasmGPUInteropError(f"read_into: dtype mismatch. out is {out.dtype}, handle is {self.dtype}")
        if tuple(out.shape) != self.shape:
            raise WasmGPUInteropError(f"read_into: shape mismatch. out is {tuple(out.shape)}, handle is {self.shape}")
        src = self.to_numpy()
        np.copyto(out, src)

    def free(self) -> None:
        if self._freed:
            return
        self._assert_valid()
        self._interop._python.free(self._handle)
        self._freed = True

    def __repr__(self) -> str:
        i = self.info
        return (f"<WasmGPUArray dtype={i.dtype} shape={i.shape} ptr=0x{i.ptr:x} "f"bytes={i.byte_length} kind={i.kind}>")

class WasmGPUInterop:
    def __init__(self, wasmgpu: Any = None):
        self._wasmgpu = _resolve_wasmgpu(wasmgpu)
        self._python = _resolve_python_api(self._wasmgpu)
        self._init_wasm = _resolve_init_wasm(self._wasmgpu)
        self._create_heap_arena = _resolve_create_heap_arena(self._wasmgpu)
        self._frame_arena = _resolve_frame_arena(self._wasmgpu)

    @property
    def wasmgpu(self) -> Any:
        return self._wasmgpu

    @property
    def python_api(self) -> Any:
        return self._python

    async def init_webassembly(self, base_url: Optional[str] = None) -> None:
        if self._init_wasm is None:
            return
        if base_url is None:
            await self._init_wasm()
        else:
            await self._init_wasm(base_url)

    def create_arena(self, cap_bytes: int, *, align: int = 16, fallback_align: Optional[int] = 8, name: Optional[str] = None) -> WasmGPUArena:
        if self._create_heap_arena is None:
            raise WasmGPUInteropError("WasmGPU heap arena creation API not found (createHeapArena/driver.createHeapArena).")
        cap = int(cap_bytes)
        if cap <= 0:
            raise WasmGPUInteropError("cap_bytes must be > 0")
        try:
            js_arena = self._create_heap_arena(cap, int(align))
            return WasmGPUArena(js_arena, name=name)
        except Exception as e:
            if fallback_align is None:
                raise
            if int(fallback_align) == int(align):
                raise
            msg = str(e)
            if "aligned" in msg:
                warnings.warn(f"create_arena({cap_bytes}, align={align}) failed due to alignment; retrying with align={fallback_align}.", RuntimeWarning)
                js_arena = self._create_heap_arena(cap, int(fallback_align))
                return WasmGPUArena(js_arena, name=name)
            raise

    def reset_frame_arena(self) -> None:
        if self._frame_arena is None:
            raise WasmGPUInteropError("WasmGPU frameArena not found on the JS object.")
        self._frame_arena.reset()

    def send(self, x: Any, *, dtype: Optional[Union[DType, str]] = None, allocator: Optional[Union[Literal["heap"], Literal["frame"], WasmGPUArena, Any]] = None, copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe", warn_on_copy: bool = True) -> WasmGPUArray:
        np = _require_numpy()
        js = _require_js()
        arr0 = np.asarray(x)
        arr = ensure_array(arr0, dtype=dtype, copy=copy, casting=casting)
        if warn_on_copy and (arr is not arr0):
            warnings.warn("Input array was normalized (dtype cast and/or contiguity fix). For best performance, pass a C-contiguous array of a supported dtype.", RuntimeWarning)
        opts = None
        alloc_kind = allocator
        arena_ref: Optional[WasmGPUArena] = None
        if alloc_kind is None or alloc_kind == "heap":
            alloc_kind = None
        if alloc_kind is not None:
            opts = js.Object.new()
            if alloc_kind == "frame":
                opts.allocator = "frame"
            elif isinstance(alloc_kind, WasmGPUArena):
                arena_ref = alloc_kind
                opts.allocator = alloc_kind.js
            else:
                opts.allocator = alloc_kind
        if opts is None:
            handle = self._python.sendNdarray(arr)
        else:
            handle = self._python.sendNdarray(arr, opts)
        return WasmGPUArray(self, handle, arena=arena_ref)

    def wrap(self, handle: Any) -> WasmGPUArray:
        """Wrap an existing JS handle in a Python WasmGPUArray."""
        return WasmGPUArray(self, handle)

__all__ = ["WasmGPUInterop", "WasmGPUArray", "WasmGPUArena", "HandleInfo", "WasmGPUInteropError", "ensure_array"]
