# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Python interoperability helpers for WasmGPU.

WasmGPUInterop binds to a concrete WasmGPU runtime instance and provides Python-friendly adapters
for transferring NumPy-compatible values to canonical CPUndarray and GPUndarray objects, updating
existing ndarrays, and copying canonical ndarray data back into independent NumPy arrays.

Input values are normalized to supported NumPy dtypes and C-contiguous storage according to the
requested copy and casting policies. The returned CPUndarray and GPUndarray objects are the actual
JavaScript WasmGPU objects and remain caller-owned, as this module does not maintain a separate
Python allocation, handle, or lifetime model.

This module is intended for Python running inside Pyodide/JupyterLite with NumPy available and a
fully created WasmGPU runtime supplied to WasmGPUInterop.
"""

from __future__ import annotations
from typing import Any, Literal, Optional

class WasmGPUInteropError(RuntimeError):
    """Raised when a Python value cannot cross the WasmGPU interop boundary."""

CopyPolicy = Literal["never", "if_needed", "always"]
CastingPolicy = Literal["no", "equiv", "safe", "same_kind", "unsafe"]

def _require_numpy() -> Any:
    try:
        import numpy as np  # type: ignore
    except Exception as error:  # pragma: no cover - only meaningful in Pyodide
        raise WasmGPUInteropError("NumPy is required for WasmGPU Python interop.") from error
    return np

def _dtype_name(dtype: Any) -> str:
    np = _require_numpy()
    value = np.dtype(dtype)
    names = {
        np.dtype("int8"): "i8",
        np.dtype("uint8"): "u8",
        np.dtype("int16"): "i16",
        np.dtype("uint16"): "u16",
        np.dtype("int32"): "i32",
        np.dtype("uint32"): "u32",
        np.dtype("float32"): "f32",
        np.dtype("float64"): "f64",
    }
    try:
        return names[value]
    except KeyError as error:
        raise WasmGPUInteropError(f"Unsupported dtype {value!r}; expected int8, uint8, int16, uint16, int32, uint32, float32, or float64.") from error

def _numpy_dtype(dtype: Any) -> Any:
    np = _require_numpy()
    aliases = {
        "i8": "int8",
        "u8": "uint8",
        "i16": "int16",
        "u16": "uint16",
        "i32": "int32",
        "u32": "uint32",
        "f32": "float32",
        "f64": "float64",
    }
    return np.dtype(aliases.get(dtype, dtype))

def _normalize(x: Any, *, dtype: Any = None, copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe") -> Any:
    np = _require_numpy()
    if copy not in ("never", "if_needed", "always"):
        raise WasmGPUInteropError(f"Unknown copy policy {copy!r}.")
    if casting not in ("no", "equiv", "safe", "same_kind", "unsafe"):
        raise WasmGPUInteropError(f"Unknown NumPy casting policy {casting!r}.")
    arr = np.asarray(x)
    target = _numpy_dtype(dtype) if dtype is not None else arr.dtype
    _dtype_name(target)
    needs_dtype = arr.dtype != target
    is_c = bool(arr.flags.c_contiguous)
    if copy == "never" and (needs_dtype or not is_c):
        reason = "dtype conversion" if needs_dtype else "C-contiguous normalization"
        raise WasmGPUInteropError(f"{reason} requires a copy, but copy='never'.")
    if needs_dtype:
        if not np.can_cast(arr.dtype, target, casting=casting):
            raise WasmGPUInteropError(f"Cannot cast dtype {arr.dtype} to {target} with casting={casting!r}.")
        arr = arr.astype(target, order="C", casting=casting, copy=True)
    elif copy == "always":
        arr = np.array(arr, dtype=target, order="C", copy=True)
    elif not is_c:
        arr = np.ascontiguousarray(arr, dtype=target)
    return arr

def _shape_tuple(value: Any) -> tuple[int, ...]:
    if hasattr(value, "to_py"):
        value = value.to_py()
    return tuple(int(dim) for dim in value)

def _gpu_options(**values: Any) -> Any:
    values = {key: value for key, value in values.items() if value is not None}
    try:
        import js  # type: ignore
        from pyodide.ffi import to_js  # type: ignore
        return to_js(values, dict_converter=js.Object.fromEntries)
    except Exception as error:  # pragma: no cover - only meaningful outside Pyodide
        raise WasmGPUInteropError("GPU transfer options require the Pyodide JavaScript bridge.") from error

class WasmGPUInterop:
    def __init__(self, wgpu: Any):
        if wgpu is None or not hasattr(wgpu, "python"):
            raise WasmGPUInteropError("WasmGPUInterop requires a concrete WasmGPU instance.")
        python = wgpu.python
        if not all(hasattr(python, name) for name in ("toCPU", "toGPU", "copyInto")):
            raise WasmGPUInteropError("The supplied runtime does not expose the canonical PythonInterop API.")
        self._wgpu = wgpu
        self._python = python

    def to_cpu(self, x: Any, *, dtype: Any = None, copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe") -> Any:
        return self._python.toCPU(_normalize(x, dtype=dtype, copy=copy, casting=casting))

    def to_gpu(self, x: Any, *, dtype: Any = None, copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe", copy_src: bool = True, copy_dst: bool = True, usage: Optional[int] = None, label: Optional[str] = None) -> Any:
        arr = _normalize(x, dtype=dtype, copy=copy, casting=casting)
        options = _gpu_options(copySrc=copy_src, copyDst=copy_dst, usage=usage, label=label)
        return self._python.toGPU(arr, options)

    def copy_into(self, dst: Any, x: Any, *, copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe") -> None:
        if not hasattr(dst, "dtype") or not hasattr(dst, "shape"):
            raise WasmGPUInteropError("copy_into() destination must be a canonical WasmGPU ndarray.")
        arr = _normalize(x, dtype=str(dst.dtype), copy=copy, casting=casting)
        expected = _shape_tuple(dst.shape)
        if tuple(arr.shape) != expected:
            raise WasmGPUInteropError(f"Shape mismatch: destination is {expected}, source is {tuple(arr.shape)}.")
        self._python.copyInto(dst, arr)

    def from_cpu(self, src: Any) -> Any:
        np = _require_numpy()
        if not hasattr(src, "data") or not bool(src.isContiguousC):
            raise WasmGPUInteropError("from_cpu() requires a C-contiguous CPUndarray.")
        view = src.data()
        value = view.to_py() if hasattr(view, "to_py") else view
        out = np.array(value, dtype=_numpy_dtype(str(src.dtype)), copy=True)
        return out.reshape(_shape_tuple(src.shape))

    async def from_gpu(self, src: Any) -> Any:
        if not hasattr(src, "readbackToCPU") or not bool(src.isContiguousC):
            raise WasmGPUInteropError("from_gpu() requires a C-contiguous GPUndarray.")
        cpu = await src.readbackToCPU()
        try:
            return self.from_cpu(cpu)
        finally:
            cpu.destroy()
