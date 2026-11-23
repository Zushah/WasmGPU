# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Python interoperability helpers for WasmGPU.

WasmGPUInterop binds to a concrete WasmGPU runtime instance and moves NumPy-compatible arrays in both
directions between Python and canonical CPUndarray and GPUndarray objects: imports (to_cpu, to_gpu)
return new owning ndarrays, copy_into updates an existing ndarray or view in place, and exports
(from_cpu, await from_gpu) copy canonical ndarray data into new or caller-supplied NumPy arrays.

Every transfer either preserves dtype, shape, strides, and layout, or materializes them intentionally:
- order selects the result layout with NumPy's vocabulary: "K" (the default) keeps the source's memory
  order with dense positive strides, "C" and "F" request row- and column-major layouts, "A" picks F for
  F-contiguous sources and C otherwise, and "preserve" keeps the exact strides (including negative and
  zero strides) and offset within the source's byte extent. Non-C results need order="C" or
  compute.ndarray.contiguous() before CPUndarray.data().
- copy="never" raises before anything is allocated or written when a transfer needs a materialization
  (a layout change, a dtype conversion including byte-order normalization, or a staging temporary);
  copy="if_needed" and copy="always" materialize when needed and are identical, because results never
  alias Python memory and no extra copy is ever made.
- casting follows numpy.can_cast, and complex to real casts are always rejected (pass x.real or x.imag).
  Safe casts that WasmGPU performs bit-identically to NumPy run after transferring the narrow dtype;
  every other conversion, byte-order normalization, and unsupported dtype is handled by NumPy.

The returned CPUndarray and GPUndarray objects are the actual JavaScript WasmGPU objects and remain
caller-owned: destroy them with x.destroy(), as Python garbage collection never frees WasmGPU memory.
from_gpu() snapshots its source when it is called and returns an awaitable for the NumPy result, so the
source may be modified or destroyed as soon as from_gpu() returns; its Python-side validation errors
raise at call time, while errors from the TypeScript side surface when the awaitable is awaited. Every
error raised by this module, including errors reported by the JavaScript runtime, is a
WasmGPUInteropError (JavaScript errors keep their message and are chained as the cause). This module
keeps no Python allocation, handle, or lifetime model.

This module is intended for Python running inside Pyodide/JupyterLite with NumPy available and a
fully created WasmGPU runtime supplied to WasmGPUInterop.
"""

from __future__ import annotations
from typing import Any, Literal, Optional

class WasmGPUInteropError(RuntimeError):
    """Raised when a Python value cannot cross the WasmGPU interop boundary."""

Order = Literal["K", "C", "F", "A", "preserve"]
CopyPolicy = Literal["never", "if_needed", "always"]
CastingPolicy = Literal["no", "equiv", "safe", "same_kind", "unsafe"]

_ORDERS = ("K", "C", "F", "A", "preserve")
_COPIES = ("never", "if_needed", "always")
_CASTINGS = ("no", "equiv", "safe", "same_kind", "unsafe")
_NAMES = {"int8": "i8", "uint8": "u8", "int16": "i16", "uint16": "u16", "int32": "i32", "uint32": "u32", "float32": "f32", "float64": "f64", "complex64": "c64", "complex128": "c128"}
_ALIASES = {short: name for name, short in _NAMES.items()}
_SUPPORTED = "int8, uint8, int16, uint16, int32, uint32, float32, float64, complex64, or complex128"
_SPARSE_GAP = 2.0
_SPARSE_GAP_REORDER = 8.0
_ROW_RUN_MIN_BYTES = 1024
_GPU_SMALL_BYTES = 65536
_CPU_SMALL_BYTES = 16384
_SAFE_PAIRS = frozenset([
    ("i8", "i16"), ("i8", "i32"), ("i8", "f32"), ("i8", "f64"), ("i8", "c64"), ("i8", "c128"),
    ("u8", "i16"), ("u8", "u16"), ("u8", "i32"), ("u8", "u32"), ("u8", "f32"), ("u8", "f64"), ("u8", "c64"), ("u8", "c128"),
    ("i16", "i32"), ("i16", "f32"), ("i16", "f64"), ("i16", "c64"), ("i16", "c128"),
    ("u16", "i32"), ("u16", "u32"), ("u16", "f32"), ("u16", "f64"), ("u16", "c64"), ("u16", "c128"),
    ("i32", "f64"), ("i32", "c128"), ("u32", "f64"), ("u32", "c128"),
    ("f32", "f64"), ("f32", "c64"), ("f32", "c128"), ("f64", "c128"), ("c64", "c128"),
])
_WASM_CASTS_CPU = _SAFE_PAIRS
_WASM_CASTS_GPU = frozenset((src, dst) for src, dst in _SAFE_PAIRS if not (dst in ("f64", "c128") and src in ("i8", "u8", "i16", "u16", "i32", "u32")))

try:
    from pyodide.ffi import JsProxy as _JsProxy  # type: ignore
except Exception:  # pragma: no cover - only meaningful outside Pyodide
    _JsProxy = None

try:
    from pyodide.ffi import JsException as _JsException  # type: ignore
except Exception:  # pragma: no cover - only meaningful outside Pyodide
    _JsException = None

_SHORT_CACHE: dict[Any, Optional[str]] = {}

def _require_numpy() -> Any:
    try:
        import numpy as np  # type: ignore
    except Exception as error:  # pragma: no cover - only meaningful in Pyodide
        raise WasmGPUInteropError("NumPy is required for WasmGPU Python interop.") from error
    return np

def _short(dtype: Any) -> Optional[str]:
    try:
        return _SHORT_CACHE[dtype]
    except (KeyError, TypeError):
        pass
    short = None if dtype.fields is not None or dtype.subdtype is not None else _NAMES.get(dtype.name)
    try:
        _SHORT_CACHE[dtype] = short
    except TypeError:  # pragma: no cover - unhashable dtypes
        pass
    return short

def _native(dtype: Any) -> Optional[str]:
    return _short(dtype) if dtype.isnative else None

_NUMPY_CACHE: dict[str, Any] = {}

def _numpy_dtype(dtype: Any) -> Any:
    if isinstance(dtype, str) and dtype in _NUMPY_CACHE:
        return _NUMPY_CACHE[dtype]
    np = _require_numpy()
    try:
        value = np.dtype(_ALIASES.get(dtype, dtype) if isinstance(dtype, str) else dtype)
    except TypeError as error:
        raise WasmGPUInteropError(f"Unknown dtype {dtype!r}; expected {_SUPPORTED} (or i8, u8, i16, u16, i32, u32, f32, f64, c64, c128).") from error
    short = _short(value)
    if short is None:
        raise WasmGPUInteropError(f"Unsupported target dtype {value}; expected {_SUPPORTED}.")
    result = np.dtype(_ALIASES[short])
    if isinstance(dtype, str):
        _NUMPY_CACHE[dtype] = result
    return result

def _export_dtype(dtype: Any) -> Any:
    np = _require_numpy()
    try:
        return np.dtype(_ALIASES.get(dtype, dtype) if isinstance(dtype, str) else dtype)
    except TypeError as error:
        raise WasmGPUInteropError(f"Unknown dtype {dtype!r}.") from error

def _target_dtype(source: Any, dtype: Any) -> Any:
    np = _require_numpy()
    if dtype is not None:
        return _numpy_dtype(dtype)
    short = _short(source)
    if short is None:
        raise WasmGPUInteropError(f"Unsupported dtype {source}; WasmGPU supports {_SUPPORTED}. Pass dtype= (for example dtype=\"u8\" or dtype=\"f32\") to convert it.")
    return np.dtype(_ALIASES[short])

def _check_policies(*, order: Any = "K", copy: Any = "if_needed", casting: Any = "safe") -> None:
    if order not in _ORDERS:
        raise WasmGPUInteropError(f"Unknown layout order {order!r}; expected 'K', 'C', 'F', 'A', or 'preserve'.")
    if copy not in _COPIES:
        raise WasmGPUInteropError(f"Unknown copy policy {copy!r}.")
    if casting not in _CASTINGS:
        raise WasmGPUInteropError(f"Unknown NumPy casting policy {casting!r}.")

def _check_cast(source: Any, target: Any, casting: str) -> None:
    np = _require_numpy()
    if source == target:
        return
    if source.kind == "c" and target.kind != "c":
        raise WasmGPUInteropError(f"Cannot cast complex {source} to real {target}: it would discard imaginary parts (rejected even with casting='unsafe'); pass x.real or x.imag instead.")
    if not np.can_cast(source, target, casting=casting):
        hint = " (byte-order normalization needs casting='equiv' or wider)" if source.newbyteorder("=") == target else ""
        raise WasmGPUInteropError(f"Cannot cast dtype {source} to {target} with casting={casting!r}{hint}.")

def _js_error(error: BaseException) -> WasmGPUInteropError:
    return WasmGPUInteropError(getattr(error, "message", None) or str(error))

def _js(fn: Any, *args: Any) -> Any:
    try:
        return fn(*args)
    except Exception as error:
        if _JsException is not None and isinstance(error, _JsException):
            raise _js_error(error) from error
        raise

async def _settle(promise: Any, finish: Any) -> Any:
    try:
        await promise
    except Exception as error:
        if _JsException is not None and isinstance(error, _JsException):
            raise _js_error(error) from error
        raise
    return finish()

def _never(copy: str, reason: str) -> None:
    if copy == "never":
        raise WasmGPUInteropError(f"{reason} requires a copy, but copy='never'; use copy='if_needed'.")

def _as_array(x: Any) -> Any:
    np = _require_numpy()
    if _JsProxy is not None and isinstance(x, _JsProxy):
        raise WasmGPUInteropError("Expected a NumPy-compatible value, got a JavaScript object (for example a WasmGPU ndarray); export WasmGPU ndarrays with from_cpu() or await from_gpu(), and slice them with view().")
    return np.asarray(x)

def _extent(arr: Any) -> tuple[int, int]:
    if arr.size == 0:
        return 0, 0
    lo = sum((d - 1) * s for d, s in zip(arr.shape, arr.strides) if s < 0)
    hi = sum((d - 1) * s for d, s in zip(arr.shape, arr.strides) if s > 0)
    return hi - lo + arr.itemsize, arr.size * arr.itemsize

def _representable(arr: Any) -> bool:
    if not arr.dtype.isnative or _short(arr.dtype) is None:
        return False
    if any(d > 1 and (s % arr.itemsize != 0 or not -2**31 <= s < 2**31) for d, s in zip(arr.shape, arr.strides)):
        return False
    return _extent(arr)[0] <= 0xFFFFFFFF

def _memory_perm(shape: Any, strides: Any) -> list[int]:
    return [a for a in sorted(range(len(shape)), key=lambda i: (-abs(strides[i]), i)) if shape[a] > 1]

def _target_perm(arr: Any, order: str) -> list[int]:
    axes = list(range(arr.ndim))
    if arr.size == 0:
        return axes
    if order == "F" or (order == "A" and not arr.flags.c_contiguous and arr.flags.f_contiguous):
        return axes[::-1]
    if order == "K" and not arr.flags.c_contiguous:
        return sorted(axes, key=lambda i: (-abs(arr.strides[i]), i))
    return axes

def _run_bytes(arr: Any, perm: list[int]) -> int:
    run = arr.itemsize
    for axis in reversed([a for a in perm if arr.shape[a] > 1]):
        if arr.strides[axis] != run:
            break
        run *= arr.shape[axis]
    return run

def _dense_strides(shape: Any, perm: list[int], itemsize: int) -> list[int]:
    strides = [0] * len(shape)
    for axis in reversed(perm):
        strides[axis] = itemsize
        itemsize *= shape[axis]
    return strides

def _precompact(arr: Any, perm: list[int], residency: str, *, runs: bool) -> bool:
    if arr.size == 0:
        return False
    extent, logical = _extent(arr)
    fastest = [a for a in perm if arr.shape[a] > 1]
    if extent < logical or any(arr.strides[a] == 0 for a in fastest):
        return False
    if extent == logical:
        return residency == "cpu" and logical <= _CPU_SMALL_BYTES and not _matches(arr, perm)
    if runs and _run_bytes(arr, perm) >= _ROW_RUN_MIN_BYTES:
        return False
    reorders = fastest != _memory_perm(arr.shape, arr.strides)
    if residency == "cpu":
        return not reorders or extent / logical > _SPARSE_GAP_REORDER
    return extent / logical > (_SPARSE_GAP_REORDER if reorders else _SPARSE_GAP)

def _assign(src: Any, dst: Any, options: dict[str, Any]) -> bool:
    np = _require_numpy()
    if options.get("extent"):
        _js(src.backingBytes).assign_to(dst)
        return True
    if dst.size == 0:
        return False
    strides = _shape_tuple(src.stridesBytes)
    lo = sum((d - 1) * s for d, s in zip(dst.shape, strides) if s < 0)
    hi = sum((d - 1) * s for d, s in zip(dst.shape, strides) if s > 0)
    if lo != 0 or hi + dst.itemsize != dst.nbytes or any(d > 1 and s != t for d, s, t in zip(dst.shape, strides, dst.strides)):
        return False
    offset = int(src.offsetBytes)
    _js(_js(src.backingBytes).subarray, offset, offset + dst.nbytes).assign_to(dst.ravel(order="K").view(np.uint8))
    return True

def _wasm_cast(source: str, target: str, residency: str) -> bool:
    return (source, target) in (_WASM_CASTS_GPU if residency == "gpu" else _WASM_CASTS_CPU)

def _matches(arr: Any, perm: list[int]) -> bool:
    target = _dense_strides(arr.shape, perm, arr.itemsize)
    return arr.size == 0 or all(d <= 1 or s == t for d, s, t in zip(arr.shape, arr.strides, target))

def _shape_tuple(value: Any) -> tuple[int, ...]:
    if hasattr(value, "to_py"):
        value = value.to_py()
    return tuple(int(dim) for dim in value)

_DEFAULTS = {"order": "K", "copy": "if_needed", "copySrc": True, "copyDst": True, "cast": False, "extent": False}

def _call(fn: Any, *args: Any, **values: Any) -> Any:
    values = {key: value for key, value in values.items() if value is not None and _DEFAULTS.get(key, ...) != value}
    return _js(fn, *args, _js_options(**values)) if values else _js(fn, *args)

def _js_options(**values: Any) -> Any:
    values = {key: value for key, value in values.items() if value is not None}
    try:
        import js  # type: ignore
        from pyodide.ffi import to_js  # type: ignore
        return to_js(values, dict_converter=js.Object.fromEntries)
    except Exception as error:  # pragma: no cover - only meaningful outside Pyodide
        raise WasmGPUInteropError("Transfer options require the Pyodide JavaScript bridge.") from error

def _index_item(item: Any) -> str:
    np = _require_numpy()
    def bound(value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, (bool, np.bool_)) or not isinstance(value, (int, np.integer)):
            raise WasmGPUInteropError(f"view() slice bounds must be integers or None, got {value!r}.")
        return str(int(value))
    if item is None:
        return "None"
    if item is Ellipsis:
        return "..."
    if isinstance(item, slice):
        text = f"{bound(item.start)}:{bound(item.stop)}"
        return text if item.step is None else f"{text}:{bound(item.step)}"
    if isinstance(item, (int, np.integer)) and not isinstance(item, (bool, np.bool_)):
        return str(int(item))
    raise WasmGPUInteropError(f"view() supports basic indexing only (integers, slices, None/np.newaxis, and ...), got {item!r}; advanced indexing would copy, so use from_cpu()/from_gpu() and NumPy instead.")

class WasmGPUInterop:
    def __init__(self, wgpu: Any):
        if wgpu is None or not hasattr(wgpu, "python"):
            raise WasmGPUInteropError("WasmGPUInterop requires a concrete WasmGPU instance.")
        python = wgpu.python
        if not all(hasattr(python, name) for name in ("toCPU", "toGPU", "copyInto", "copyOut")):
            raise WasmGPUInteropError("The supplied runtime does not expose the canonical PythonInterop API.")
        self._wgpu = wgpu
        self._python = python
        self._readback = getattr(getattr(wgpu, "compute", None), "readback", None)

    def _describe(self, a: Any, what: str) -> tuple[str, Any, tuple[int, ...]]:
        if not all(hasattr(a, name) for name in ("dtype", "shape", "residency")):
            raise WasmGPUInteropError(f"{what} must be a canonical WasmGPU ndarray.")
        return str(a.residency), _numpy_dtype(str(a.dtype)), _shape_tuple(a.shape)

    def _prepare_import(self, x: Any, dtype: Any, order: str, copy: str, casting: str, residency: str) -> tuple[Any, dict[str, Any]]:
        np = _require_numpy()
        _check_policies(order=order, copy=copy, casting=casting)
        arr = _as_array(x)
        if dtype is None and order != "F" and arr.flags.c_contiguous and _native(arr.dtype) is not None:
            return arr, {"order": order, "copy": copy}
        target = _target_dtype(arr.dtype, dtype)
        _check_cast(arr.dtype, target, casting)
        convert = arr.dtype != target
        if convert and order == "preserve":
            raise WasmGPUInteropError(f"order='preserve' keeps the source bytes exactly and cannot be combined with a dtype conversion ({arr.dtype} to {target}); use order='K' or convert after importing.")
        if convert:
            _never(copy, f"Converting {arr.dtype} to {target}")
        layout = "K" if order == "preserve" else order
        source = _native(arr.dtype)
        representable = _representable(arr)
        perm = _target_perm(arr, layout)
        small = residency == "gpu" and arr.size * target.itemsize <= _GPU_SMALL_BYTES
        wasm = convert and source is not None and representable and not small and _wasm_cast(source, _NAMES[target.name], residency)
        if convert and not wasm:
            arr = arr.astype(target, order=layout, casting=casting)
        elif not representable:
            if order == "preserve":
                raise WasmGPUInteropError(f"order='preserve' cannot keep strides {arr.strides} of a {arr.dtype} array (strides must be multiples of the itemsize and fit in i32); use order='K'.")
            _never(copy, "Compacting a layout WasmGPU cannot represent")
            arr = np.array(arr, order=layout, copy=True)
        elif order != "preserve" and ((small and not _matches(arr, perm)) or _precompact(arr, perm, residency, runs=not wasm)):
            _never(copy, "Changing the layout")
            arr = np.array(arr, order=layout, copy=True)
        return arr, {"order": order, "copy": copy, "dtype": _NAMES[target.name] if wasm else None}

    def to_cpu(self, x: Any, *, dtype: Any = None, order: Order = "K", copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe") -> Any:
        arr, options = self._prepare_import(x, dtype, order, copy, casting, "cpu")
        return _call(self._python.toCPU, arr, **options)

    def to_gpu(self, x: Any, *, dtype: Any = None, order: Order = "K", copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe", copy_src: bool = True, copy_dst: bool = True, usage: Optional[int] = None, label: Optional[str] = None) -> Any:
        arr, options = self._prepare_import(x, dtype, order, copy, casting, "gpu")
        return _call(self._python.toGPU, arr, **options, copySrc=copy_src, copyDst=copy_dst, usage=usage, label=label)

    def copy_into(self, dst: Any, x: Any, *, copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe") -> None:
        np = _require_numpy()
        _check_policies(copy=copy, casting=casting)
        residency, target, expected = self._describe(dst, "copy_into() destination")
        arr = _as_array(x)
        if arr.dtype == target and arr.shape == expected and arr.flags.c_contiguous:
            return _call(self._python.copyInto, dst, arr, copy=copy)
        try:
            broadcast = tuple(np.broadcast_shapes(arr.shape, expected))
        except ValueError:
            broadcast = None
        if broadcast != expected:
            raise WasmGPUInteropError(f"Shape mismatch: cannot broadcast source {tuple(arr.shape)} to destination {expected}.")
        _check_cast(arr.dtype, target, casting)
        convert = arr.dtype != target
        if convert:
            _never(copy, f"Converting {arr.dtype} to {target}")
        source = _native(arr.dtype)
        small = residency == "gpu" and arr.size * target.itemsize <= _GPU_SMALL_BYTES
        wasm = convert and source is not None and _representable(arr) and not small and _wasm_cast(source, _NAMES[target.name], residency)
        if convert and not wasm:
            arr = arr.astype(target, order="K", casting=casting)
        elif not _representable(arr):
            _never(copy, "Compacting a layout WasmGPU cannot represent")
            arr = np.array(arr, order="K", copy=True)
        else:
            perm = _memory_perm(expected, _shape_tuple(dst.stridesBytes)) if arr.shape == expected else _target_perm(arr, "K")
            if _precompact(arr, perm, residency, runs=False):
                _never(copy, "Compacting a sparse layout")
                arr = np.array(arr, order="K", copy=True)
        _call(self._python.copyInto, dst, arr, copy=copy, cast=True if wasm else None)

    def _prepare_export(self, src: Any, residency: str, dtype: Any, order: str, out: Any, copy: str, casting: str) -> tuple[Any, dict[str, Any], Any]:
        np = _require_numpy()
        _check_policies(order=order, copy=copy, casting=casting)
        actual, source, shape = self._describe(src, f"from_{residency}() source")
        if actual != residency:
            raise WasmGPUInteropError(f"from_{residency}() requires a {residency.upper()}ndarray; use {'await from_gpu()' if actual == 'gpu' else 'from_cpu()'} for {actual.upper()} arrays.")
        strides = _shape_tuple(src.stridesBytes)
        def like(dt: Any, layout: str) -> Any:
            return np.empty_like(np.lib.stride_tricks.as_strided(np.empty(1, source), shape, strides), dtype=dt, order=layout)
        def broadcast(dst: Any) -> tuple[Any, dict[str, Any], Any]:
            _never(copy, "Exporting a broadcast (overlapping) layout")
            raw = np.empty(int(src.byteLength), np.uint8)
            offset = int(src.offsetBytes)
            def into() -> Any:
                np.copyto(dst, np.ndarray(shape, source, buffer=raw, offset=offset, strides=strides), casting=casting)
                return dst
            return raw, {"copy": copy, "extent": True}, into
        overlapping = any(d > 1 and s == 0 for d, s in zip(shape, strides))
        if out is not None:
            if dtype is not None or order != "K":
                raise WasmGPUInteropError("Pass either out= or dtype=/order=, not both.")
            if not isinstance(out, np.ndarray):
                raise WasmGPUInteropError("out= must be a NumPy array.")
            if not out.flags.writeable:
                raise WasmGPUInteropError("out= must be a writable NumPy array.")
            if tuple(out.shape) != shape:
                raise WasmGPUInteropError(f"Shape mismatch: out= is {tuple(out.shape)}, source is {shape}.")
            _check_cast(source, out.dtype, casting)
            if overlapping:
                return broadcast(out)
            if out.dtype == source and (out.flags.c_contiguous or out.flags.f_contiguous):
                return out, {"copy": copy}, lambda: out
            _never(copy, "Exporting into an out= array with another dtype or a non-contiguous layout")
            tmp = like(source, "K")
            def copied() -> Any:
                np.copyto(out, tmp, casting=casting)
                return out
            return tmp, {"copy": copy}, copied
        target = source if dtype is None else _export_dtype(dtype)
        _check_cast(source, target, casting)
        if target != source:
            if order == "preserve":
                raise WasmGPUInteropError(f"order='preserve' keeps the source bytes exactly and cannot be combined with a dtype conversion ({source} to {target}).")
            _never(copy, f"Converting {source} to {target}")
        if order == "preserve":
            raw = np.empty(int(src.byteLength), np.uint8)
            offset = int(src.offsetBytes)
            return raw, {"copy": copy, "extent": True}, lambda: np.ndarray(shape, source, buffer=raw, offset=offset, strides=strides)
        if overlapping:
            return broadcast(like(target, order))
        dst = like(source, order)
        return dst, {"copy": copy}, (lambda: dst) if target == source else (lambda: dst.astype(target, casting=casting))

    def from_cpu(self, src: Any, *, dtype: Any = None, order: Order = "K", out: Any = None, copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe") -> Any:
        dst, options, finish = self._prepare_export(src, "cpu", dtype, order, out, copy, casting)
        if self._readback is not None and self._readback.isDestroyed:
            raise WasmGPUInteropError("PythonInterop.copyOut(): compute.ndarray has been destroyed")
        if not _assign(src, dst, options):
            _call(self._python.copyOut, dst, src, **options)
        return finish()

    def from_gpu(self, src: Any, *, dtype: Any = None, order: Order = "K", out: Any = None, copy: CopyPolicy = "if_needed", casting: CastingPolicy = "safe") -> Any:
        dst, options, finish = self._prepare_export(src, "gpu", dtype, order, out, copy, casting)
        return _settle(_call(self._python.copyOut, dst, src, **options), finish)

    def view(self, x: Any, index: Any) -> Any:
        items = index if isinstance(index, tuple) else (index,)
        spec = ", ".join(_index_item(item) for item in items)
        return _js(self._wgpu.compute.ndarray.slice, x, spec if spec else "...")
