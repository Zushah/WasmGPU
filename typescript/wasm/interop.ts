/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert } from "../utils";
import { dtypeInfo, type DType, type NumberTypedArray } from "../compute/ndarray";

export type WasmExportsLike = Record<string, unknown>;

export type WasmInstanceLike = WebAssembly.Instance | { exports: WasmExportsLike; };

export type WasmMemorySource = WebAssembly.Memory | string | null | undefined;

export type WasmCallArg = number | bigint;

export type WasmModuleOptions = { name?: string; memory?: WasmMemorySource; };

export type WasmValueDescriptor = number | bigint | string | (() => number | bigint) | WasmFunctionValueDescriptor | WasmGlobalValueDescriptor | WasmExportValueDescriptor;

type WasmFunctionValueDescriptor = {
    function: (...args: WasmCallArg[]) => unknown;
    args?: ReadonlyArray<WasmCallArg>;
    name?: string;
};

type WasmGlobalValueDescriptor = {
    global: WebAssembly.Global;
    name?: string;
};

type WasmExportValueDescriptor = {
    export: string;
    kind?: "function" | "global";
    args?: ReadonlyArray<WasmCallArg>;
    name?: string;
};

export type WasmViewDescriptor = {
    memory?: WasmMemorySource;
    ptr: WasmValueDescriptor;
    length: WasmValueDescriptor;
    dtype: DType;
    byteOffset?: number;
    name?: string;
};

export type WasmBytesDescriptor = {
    memory?: WasmMemorySource;
    ptr: WasmValueDescriptor;
    byteLength: WasmValueDescriptor;
    byteOffset?: number;
    name?: string;
};

export type WasmUtf8Descriptor = {
    memory?: WasmMemorySource;
    byteOffset?: number;
    name?: string;
    fatal?: boolean;
    ignoreBOM?: boolean;
};

export type WasmDataViewDescriptor = {
    memory?: WasmMemorySource;
    ptr: WasmValueDescriptor;
    byteLength: WasmValueDescriptor;
    byteOffset?: number;
    name?: string;
};

export const assertWasmMemoryView = <T extends NumberTypedArray = NumberTypedArray>(source: unknown, label: string): WasmMemoryView<T> => {
    assert(source instanceof WasmMemoryView, `${label} must be a WasmMemoryView.`);
    return source as WasmMemoryView<T>;
};

export const assertWasmViewDType = <T extends NumberTypedArray = NumberTypedArray>(source: unknown, dtype: DType, label: string): WasmMemoryView<T> => {
    const view = assertWasmMemoryView<T>(source, label);
    assert(view.dtype === dtype, `${label} dtype must be '${dtype}'.`);
    return view;
};

export const assertWasmF32View = (source: unknown, label: string): WasmMemoryView<Float32Array> => assertWasmViewDType<Float32Array>(source, "f32", label);

export const assertWasmU16View = (source: unknown, label: string): WasmMemoryView<Uint16Array> => assertWasmViewDType<Uint16Array>(source, "u16", label);

export const assertWasmU32View = (source: unknown, label: string): WasmMemoryView<Uint32Array> => assertWasmViewDType<Uint32Array>(source, "u32", label);

export const assertWasmRecordCount = (value: number, label: string = "record count"): number => {
    assert(typeof value === "number" && Number.isFinite(value), `${label} must be a finite number.`);
    assert(Number.isInteger(value) && value >= 0, `${label} must be an integer >= 0.`);
    assert(Number.isSafeInteger(value), `${label} must be a safe integer.`);
    return value;
};

export const assertWasmCapacity = (value: number | undefined, label: string = "wasmCapacity"): number => {
    if (value === undefined) return 0;
    assert(typeof value === "number" && Number.isFinite(value), `${label} must be a finite number.`);
    assert(Number.isInteger(value) && value >= 0, `${label} must be an integer >= 0.`);
    assert(Number.isSafeInteger(value), `${label} must be a safe integer.`);
    return value;
};

export const validateWasmRecordRange = (source: WasmMemoryView, count: number, componentsPerRecord: number, sourceLabel: string, countTerm: string = "count"): void => {
    const safeCount = assertWasmRecordCount(count, countTerm);
    assert(typeof componentsPerRecord === "number" && Number.isFinite(componentsPerRecord), `${sourceLabel} componentsPerRecord must be finite.`);
    assert(Number.isInteger(componentsPerRecord) && componentsPerRecord > 0, `${sourceLabel} componentsPerRecord must be an integer > 0.`);
    assert(Number.isSafeInteger(componentsPerRecord), `${sourceLabel} componentsPerRecord must be a safe integer.`);
    assert(safeCount <= Math.floor(Number.MAX_SAFE_INTEGER / componentsPerRecord), `${sourceLabel} ${countTerm}*${componentsPerRecord} exceeds Number.MAX_SAFE_INTEGER.`);
    const requiredLength = safeCount * componentsPerRecord;
    assert(source.length >= requiredLength, `${sourceLabel} length must be at least ${countTerm}*${componentsPerRecord}.`);
};

export const resolveWasmRecordCount = (source: WasmMemoryView, explicitCount: number | undefined, componentsPerRecord: number, sourceLabel: string, countLabel: string = "record count", countTerm: string = "count"): number => {
    assert(Number.isInteger(componentsPerRecord) && componentsPerRecord > 0, `${sourceLabel} componentsPerRecord must be an integer > 0.`);
    if (explicitCount !== undefined) {
        const count = assertWasmRecordCount(explicitCount, countLabel);
        validateWasmRecordRange(source, count, componentsPerRecord, sourceLabel, countTerm);
        return count;
    }
    assert((source.length % componentsPerRecord) === 0, `${sourceLabel} length must be a multiple of ${componentsPerRecord} when ${countTerm} is not provided.`);
    return source.length / componentsPerRecord;
};

export const growWasmCapacity = (requiredCount: number, currentCapacity: number = 0): number => {
    const required = assertWasmRecordCount(requiredCount, "wasm required capacity");
    const current = assertWasmCapacity(currentCapacity, "wasm current capacity");
    if (required <= current) return current;
    let capacity = current > 0 ? current : 1;
    while (capacity < required) {
        const next = capacity * 2;
        assert(Number.isSafeInteger(next) && next <= Number.MAX_SAFE_INTEGER, "wasm capacity growth exceeds Number.MAX_SAFE_INTEGER.");
        capacity = next;
    }
    return capacity;
};

type ResolvedByteRange = {
    memory: WebAssembly.Memory;
    ptr: number;
    byteLength: number;
};

type ResolvedViewState = {
    memory: WebAssembly.Memory;
    ptr: number;
    length: number;
    byteLength: number;
    dtype: DType;
    name: string | null;
};

const isWebAssemblyMemory = (x: unknown): x is WebAssembly.Memory => (typeof WebAssembly !== "undefined") && (typeof WebAssembly.Memory !== "undefined") && (x instanceof WebAssembly.Memory);

const isWebAssemblyGlobal = (x: unknown): x is WebAssembly.Global => (typeof WebAssembly !== "undefined") && (typeof WebAssembly.Global !== "undefined") && (x instanceof WebAssembly.Global);

const describeLabel = (label: string, name?: string | null): string => name ? `${label} '${name}'` : label;

const normalizeName = (name: string | undefined): string | null => { if (!name) return null; return name; };

const assertNonNegativeInteger = (value: unknown, label: string): number => {
    if (typeof value === "bigint") {
        assert(value >= 0n, `${label} must be >= 0 (got ${value.toString()})`);
        assert(value <= BigInt(Number.MAX_SAFE_INTEGER), `${label} exceeds Number.MAX_SAFE_INTEGER (got ${value.toString()})`);
        return Number(value);
    }
    assert(typeof value === "number", `${label} must be a number or bigint (got ${typeof value})`);
    assert(Number.isFinite(value), `${label} must be finite (got ${value})`);
    assert(Number.isInteger(value), `${label} must be an integer (got ${value})`);
    assert(value >= 0, `${label} must be >= 0 (got ${value})`);
    assert(Number.isSafeInteger(value), `${label} must be a safe integer (got ${value})`);
    return value;
};

const assertCallArg = (arg: WasmCallArg, label: string): WasmCallArg => {
    if (typeof arg === "bigint") return arg;
    assert(typeof arg === "number", `${label} must be a number or bigint (got ${typeof arg})`);
    assert(Number.isFinite(arg), `${label} must be finite (got ${arg})`);
    return arg;
};

const resolveCallArgs = (args: ReadonlyArray<WasmCallArg> | undefined, label: string): WasmCallArg[] => {
    if (args === undefined) return [];
    assert(Array.isArray(args), `${label} args must be an array when provided.`);
    if (args.length === 0) return [];
    const out: WasmCallArg[] = new Array(args.length);
    for (let i = 0; i < args.length; i++) out[i] = assertCallArg(args[i]!, `${label} args[${i}]`);
    return out;
};

const assertByteOffset = (byteOffset: number | undefined, label: string): number => {
    if (byteOffset === undefined) return 0;
    assert(Number.isFinite(byteOffset), `${label} byteOffset must be finite (got ${byteOffset})`);
    assert(Number.isInteger(byteOffset), `${label} byteOffset must be an integer (got ${byteOffset})`);
    assert(byteOffset >= 0, `${label} byteOffset must be >= 0 (got ${byteOffset})`);
    assert(Number.isSafeInteger(byteOffset), `${label} byteOffset must be a safe integer (got ${byteOffset})`);
    return byteOffset;
};

const checkedAdd = (a: number, b: number, label: string): number => {
    const out = a + b;
    assert(Number.isSafeInteger(out), `${label} overflowed Number.MAX_SAFE_INTEGER`);
    return out;
};

const checkedMul = (a: number, b: number, label: string): number => {
    const out = a * b;
    assert(Number.isSafeInteger(out), `${label} overflowed Number.MAX_SAFE_INTEGER`);
    return out;
};

const resolveTypedArrayCtor = (dtype: DType): (new(buffer: ArrayBufferLike, byteOffset: number, length: number) => NumberTypedArray) => {
    const info = dtypeInfo(dtype);
    return info.ctor as unknown as (new(buffer: ArrayBufferLike, byteOffset: number, length: number) => NumberTypedArray);
};

export class WasmModule {
    private readonly exportsObject: WasmExportsLike;
    private readonly defaultMemorySource: WasmMemorySource;
    readonly name: string | null;

    constructor(exportsObject: WasmExportsLike = {}, options: WasmModuleOptions = {}) {
        this.exportsObject = exportsObject;
        this.defaultMemorySource = options.memory;
        this.name = normalizeName(options.name);
    }

    static fromInstance(instance: WasmInstanceLike, options: WasmModuleOptions = {}): WasmModule {
        assert((typeof instance === "object") && (instance !== null), "WasmModule.fromInstance(): instance must be an object with an exports field.");
        const exportsObject = (instance as { exports?: WasmExportsLike }).exports;
        assert((typeof exportsObject === "object") && (exportsObject !== null), "WasmModule.fromInstance(): instance.exports must be an object.");
        return new WasmModule(exportsObject, options);
    }

    static fromExports(exportsObject: WasmExportsLike, options: WasmModuleOptions = {}): WasmModule {
        assert((typeof exportsObject === "object") && (exportsObject !== null), "WasmModule.fromExports(): exports must be an object.");
        return new WasmModule(exportsObject, options);
    }

    static fromMemory(memory: WebAssembly.Memory, options: Omit<WasmModuleOptions, "memory"> = {}): WasmModule {
        assert(isWebAssemblyMemory(memory), "WasmModule.fromMemory(): memory must be a WebAssembly.Memory.");
        return new WasmModule({}, { ...options, memory });
    }

    getExport(name: string): unknown {
        assert(typeof name === "string" && name.length > 0, "WasmModule.getExport(): name must be a non-empty string.");
        assert(Object.prototype.hasOwnProperty.call(this.exportsObject, name), `${describeLabel("WasmModule export", this.name)} does not contain export '${name}'.`);
        return this.exportsObject[name];
    }

    getFunction(name: string): (...args: WasmCallArg[]) => unknown {
        const value = this.getExport(name);
        assert(typeof value === "function", `${describeLabel("WasmModule export", this.name)} '${name}' is not a function.`);
        return value as (...args: WasmCallArg[]) => unknown;
    }

    getGlobal(name: string): WebAssembly.Global {
        const value = this.getExport(name);
        assert(isWebAssemblyGlobal(value), `${describeLabel("WasmModule export", this.name)} '${name}' is not a WebAssembly.Global.`);
        return value;
    }

    memory(nameOrMemory?: WasmMemorySource): WebAssembly.Memory {
        const source = (nameOrMemory !== undefined) ? nameOrMemory : this.defaultMemorySource;
        if (isWebAssemblyMemory(source)) return source;
        if (typeof source === "string") {
            const value = this.getExport(source);
            assert(isWebAssemblyMemory(value), `${describeLabel("WasmModule export", this.name)} '${source}' is not a WebAssembly.Memory.`);
            return value;
        }
        if ((source !== undefined) && (source !== null)) throw new Error(`${describeLabel("WasmModule", this.name)} received an invalid memory source. Expected a WebAssembly.Memory or memory export name.`);
        const memoryExports = this.memoryExportNames();
        if (memoryExports.length === 1) return this.memory(memoryExports[0]!);
        if (memoryExports.length === 0) throw new Error(`${describeLabel("WasmModule", this.name)} could not resolve a WebAssembly.Memory. Pass memory explicitly or export one memory.`);
        throw new Error(`${describeLabel("WasmModule", this.name)} has multiple memory exports (${memoryExports.join(", ")}). Pass memory explicitly.`);
    }

    view<T extends NumberTypedArray = NumberTypedArray>(descriptor: WasmViewDescriptor): WasmMemoryView<T> {
        return new WasmMemoryView<T>(this, descriptor);
    }

    readBytes(descriptor: WasmBytesDescriptor): Uint8Array<ArrayBufferLike> {
        const resolved = this._resolveBytes(descriptor);
        return new Uint8Array(resolved.memory.buffer as ArrayBufferLike, resolved.ptr >>> 0, resolved.byteLength >>> 0) as Uint8Array<ArrayBufferLike>;
    }

    readUtf8(ptr: WasmValueDescriptor, length: WasmValueDescriptor, options: WasmUtf8Descriptor = {}): string {
        const name = normalizeName(options.name);
        const resolved = this._resolveBytes({
            memory: options.memory,
            ptr,
            byteLength: length,
            byteOffset: options.byteOffset,
            name: name ?? undefined
        });
        const decoder = new TextDecoder("utf-8", {
            fatal: options.fatal ?? false,
            ignoreBOM: options.ignoreBOM ?? false
        });
        return decoder.decode(new Uint8Array(resolved.memory.buffer as ArrayBufferLike, resolved.ptr >>> 0, resolved.byteLength >>> 0));
    }

    dataView(descriptor: WasmDataViewDescriptor): DataView {
        const resolved = this._resolveBytes(descriptor);
        return new DataView(resolved.memory.buffer as ArrayBufferLike, resolved.ptr >>> 0, resolved.byteLength >>> 0);
    }

    _resolveView(descriptor: WasmViewDescriptor): ResolvedViewState {
        const name = normalizeName(descriptor.name);
        const label = describeLabel("WasmMemoryView", name);
        const dtype = descriptor.dtype;
        const bytesPerElement = dtypeInfo(dtype).bytesPerElement >>> 0;
        const length = this.resolveValue(descriptor.length, `${label} length`);
        const byteLength = checkedMul(length, bytesPerElement, `${label} byteLength`);
        const resolved = this.resolveByteRange(descriptor.memory, descriptor.ptr, descriptor.byteOffset, byteLength, label);
        assert((resolved.ptr % bytesPerElement) === 0, `${label} ptr ${resolved.ptr} is not aligned for dtype '${dtype}' (${bytesPerElement} bytes).`);
        return { memory: resolved.memory, ptr: resolved.ptr >>> 0, length: length >>> 0, byteLength: byteLength >>> 0, dtype, name };
    }

    _resolveBytes(descriptor: WasmBytesDescriptor | WasmDataViewDescriptor): ResolvedByteRange {
        const name = normalizeName(descriptor.name);
        const label = describeLabel("external WebAssembly memory range", name);
        const byteLength = this.resolveValue(descriptor.byteLength, `${label} byteLength`);
        return this.resolveByteRange(descriptor.memory, descriptor.ptr, descriptor.byteOffset, byteLength, label);
    }

    private memoryExportNames(): string[] {
        const names: string[] = [];
        for (const [name, value] of Object.entries(this.exportsObject)) if (isWebAssemblyMemory(value)) names.push(name);
        return names;
    }

    private resolveByteRange(memorySource: WasmMemorySource, ptrDescriptor: WasmValueDescriptor, byteOffset: number | undefined, byteLength: number, label: string): ResolvedByteRange {
        const memory = this.memory(memorySource);
        assert(isWebAssemblyMemory(memory), `${label} requires a valid WebAssembly.Memory.`);
        const basePtr = this.resolveValue(ptrDescriptor, `${label} ptr`);
        const extraOffset = assertByteOffset(byteOffset, label);
        const ptr = checkedAdd(basePtr, extraOffset, `${label} ptr + byteOffset`);
        const end = checkedAdd(ptr, byteLength, `${label} ptr + byteLength`);
        const bufferByteLength = memory.buffer.byteLength >>> 0;
        assert(end <= bufferByteLength, `${label} range [${ptr}, ${end}) is out of bounds for memory byteLength ${bufferByteLength}.`);
        return { memory, ptr: ptr >>> 0, byteLength: byteLength >>> 0 };
    }

    private resolveValue(descriptor: WasmValueDescriptor, label: string): number {
        if ((typeof descriptor === "number") || (typeof descriptor === "bigint")) return assertNonNegativeInteger(descriptor, label);
        if (typeof descriptor === "string") {
            const value = this.getExport(descriptor);
            if (typeof value === "function") return assertNonNegativeInteger((value as (...args: WasmCallArg[]) => unknown)(), `${label} export '${descriptor}' result`);
            if (isWebAssemblyGlobal(value)) return assertNonNegativeInteger(value.value as number | bigint, `${label} export '${descriptor}' value`);
            throw new Error(`${label} export '${descriptor}' must be a function or WebAssembly.Global.`);
        }
        if (typeof descriptor === "function") return assertNonNegativeInteger(descriptor(), `${label} callback result`);
        assert((typeof descriptor === "object") && (descriptor !== null), `${label} descriptor must be a number, bigint, export name string, callback, or descriptor object.`);
        if (Object.prototype.hasOwnProperty.call(descriptor, "function")) {
            const functionDescriptor = descriptor as Partial<WasmFunctionValueDescriptor>;
            assert(typeof functionDescriptor.function === "function", `${label} function descriptor must contain a callable function.`);
            const args = resolveCallArgs(functionDescriptor.args, label);
            return assertNonNegativeInteger(functionDescriptor.function(...args), `${label} function result`);
        }
        if (Object.prototype.hasOwnProperty.call(descriptor, "global")) {
            const globalDescriptor = descriptor as Partial<WasmGlobalValueDescriptor>;
            assert(isWebAssemblyGlobal(globalDescriptor.global), `${label} global descriptor must contain a WebAssembly.Global.`);
            return assertNonNegativeInteger(globalDescriptor.global.value as number | bigint, `${label} global value`);
        }
        assert(Object.prototype.hasOwnProperty.call(descriptor, "export"), `${label} descriptor object requires one of 'function', 'global', or 'export'.`);
        const exportDescriptor = descriptor as Partial<WasmExportValueDescriptor>;
        assert(typeof exportDescriptor.export === "string" && exportDescriptor.export.length > 0, `${label} export descriptor requires a non-empty export name.`);
        assert((exportDescriptor.kind === undefined) || (exportDescriptor.kind === "function") || (exportDescriptor.kind === "global"), `${label} export descriptor kind must be 'function' or 'global' when provided.`);
        if (exportDescriptor.kind === "global") return assertNonNegativeInteger(this.getGlobal(exportDescriptor.export).value as number | bigint, `${label} export '${exportDescriptor.export}' value`);
        if (exportDescriptor.kind === "function") return assertNonNegativeInteger(this.getFunction(exportDescriptor.export)(...resolveCallArgs(exportDescriptor.args, label)), `${label} export '${exportDescriptor.export}' result`);
        const value = this.getExport(exportDescriptor.export);
        if (typeof value === "function") return assertNonNegativeInteger((value as (...args: WasmCallArg[]) => unknown)(...resolveCallArgs(exportDescriptor.args, label)), `${label} export '${exportDescriptor.export}' result`);
        if (isWebAssemblyGlobal(value)) {
            assert(resolveCallArgs(exportDescriptor.args, label).length === 0, `${label} export '${exportDescriptor.export}' is a global and does not accept args.`);
            return assertNonNegativeInteger(value.value as number | bigint, `${label} export '${exportDescriptor.export}' value`);
        }
        throw new Error(`${label} export '${exportDescriptor.export}' must be a function or WebAssembly.Global.`);
    }
}

export class WasmMemoryView<T extends NumberTypedArray = NumberTypedArray> {
    private readonly moduleRef: WasmModule;
    private readonly descriptor: WasmViewDescriptor;
    private state: ResolvedViewState;
    private cachedBuffer: ArrayBufferLike | null = null;
    private cachedArray: T | null = null;
    private cachedBytes: Uint8Array<ArrayBufferLike> | null = null;
    private cachedDataView: DataView | null = null;

    constructor(moduleRef: WasmModule, descriptor: WasmViewDescriptor) {
        this.moduleRef = moduleRef;
        this.descriptor = descriptor;
        this.state = this.moduleRef._resolveView(this.descriptor);
    }

    get memory(): WebAssembly.Memory {
        return this.state.memory;
    }

    get ptr(): number {
        return this.state.ptr >>> 0;
    }

    get length(): number {
        return this.state.length >>> 0;
    }

    get byteLength(): number {
        return this.state.byteLength >>> 0;
    }

    get dtype(): DType {
        return this.state.dtype;
    }

    get name(): string | null {
        return this.state.name;
    }

    refresh(): WasmMemoryView<T> {
        this.state = this.moduleRef._resolveView(this.descriptor);
        this.cachedBuffer = null;
        this.cachedArray = null;
        this.cachedBytes = null;
        this.cachedDataView = null;
        return this;
    }

    array(): T {
        this.ensureCachedViews();
        return this.cachedArray!;
    }

    bytes(): Uint8Array<ArrayBufferLike> {
        this.ensureCachedViews();
        return this.cachedBytes!;
    }

    dataView(): DataView {
        this.ensureCachedViews();
        return this.cachedDataView!;
    }

    copy(): T {
        const src = this.array();
        const ctor = resolveTypedArrayCtor(this.dtype);
        const out = new ctor(new ArrayBuffer(this.byteLength >>> 0), 0, this.length >>> 0) as T;
        out.set(src);
        return out;
    }

    copyInto(target: NumberTypedArray): void {
        const label = describeLabel("WasmMemoryView", this.name);
        assert(ArrayBuffer.isView(target) && !(target instanceof DataView), `${label} copyInto target must be a numeric TypedArray.`);
        if ((target instanceof Uint8Array) || (target instanceof Int8Array)) {
            assert((target.byteLength >>> 0) >= (this.byteLength >>> 0), `${label} copyInto target is too small for ${this.byteLength} bytes.`);
            new Uint8Array(target.buffer as ArrayBufferLike, target.byteOffset >>> 0, this.byteLength >>> 0).set(this.bytes());
            return;
        }
        const expectedCtor = resolveTypedArrayCtor(this.dtype);
        assert((target as { constructor: unknown; }).constructor === expectedCtor, `${label} copyInto target must be dtype-compatible with '${this.dtype}'. Use Uint8Array or Int8Array for raw byte copies.`);
        assert((target.length >>> 0) >= (this.length >>> 0), `${label} copyInto target is too small for ${this.length} elements.`);
        const dst = target as NumberTypedArray & { set: (src: NumberTypedArray, offset?: number) => void; };
        dst.set(this.array(), 0);
    }

    private ensureCachedViews(): void {
        const buffer = this.state.memory.buffer as ArrayBufferLike;
        if (this.cachedBuffer === buffer && this.cachedArray && this.cachedBytes && this.cachedDataView) return;
        const ctor = resolveTypedArrayCtor(this.state.dtype);
        this.cachedBuffer = buffer;
        this.cachedArray = new ctor(buffer, this.state.ptr >>> 0, this.state.length >>> 0) as T;
        this.cachedBytes = new Uint8Array(buffer, this.state.ptr >>> 0, this.state.byteLength >>> 0) as Uint8Array<ArrayBufferLike>;
        this.cachedDataView = new DataView(buffer, this.state.ptr >>> 0, this.state.byteLength >>> 0);
    }
}

export const webassemblyInterop = {
    fromInstance: (instance: WasmInstanceLike, options: WasmModuleOptions = {}): WasmModule => WasmModule.fromInstance(instance, options),
    fromExports: (exportsObject: WasmExportsLike, options: WasmModuleOptions = {}): WasmModule => WasmModule.fromExports(exportsObject, options),
    fromMemory: (memory: WebAssembly.Memory, options: Omit<WasmModuleOptions, "memory"> = {}): WasmModule => WasmModule.fromMemory(memory, options)
};
