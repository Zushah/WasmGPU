/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export { initWebAssembly, WasmHeapArena, WasmSlice, driver, wasm, frameArena, accessorf, animf, boundsf, cullf, frustumf, mat4f, mat4d, meshf, ndarrayf, quatf, quatd, transformf, vec3f, vec3d, mat4, quat, vec3 } from "./driver";
export type { WasmPtr, WasmTypedArrayConstructor, WasmSliceDType, WasmSliceHandle, WasmSliceKind } from "./driver";
export { webassemblyInterop, WasmModule, WasmMemoryView, assertWasmMemoryView, assertWasmViewDType, assertWasmF32View, assertWasmF64View, assertWasmU16View, assertWasmU32View, assertWasmRecordCount, assertWasmCapacity, resolveWasmRecordCount, validateWasmRecordRange, growWasmCapacity } from "./interop";
export type { WasmBytesDescriptor, WasmCallArg, WasmDataViewDescriptor, WasmExportsLike, WasmInstanceLike, WasmMemorySource, WasmModuleOptions, WasmUtf8Descriptor, WasmValueDescriptor, WasmViewDescriptor } from "./interop";
