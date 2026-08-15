/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export class AssertionError extends Error {
    constructor(message, actual, expected, operator) {
        super(message ?? `Expected ${format(actual)} ${operator} ${format(expected)}`);
        this.name = "AssertionError";
        this.actual = actual;
        this.expected = expected;
        this.operator = operator;
    }
}

const format = (value) => {
    if (typeof value === "string") return JSON.stringify(value);
    try { return JSON.stringify(value); } catch { return String(value); }
};

const fail = (message, actual, expected, operator) => { throw new AssertionError(message, actual, expected, operator); };

const enumerableKeys = (value) => Reflect.ownKeys(value).filter((key) => Object.prototype.propertyIsEnumerable.call(value, key));

const deepStrictEqualValue = (actual, expected, seen = new WeakMap()) => {
    if (Object.is(actual, expected)) return true;
    if (typeof actual !== "object" || actual === null || typeof expected !== "object" || expected === null) return false;
    if (Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected)) return false;
    if (seen.get(actual) === expected) return true;
    seen.set(actual, expected);
    if (actual instanceof Date) return actual.getTime() === expected.getTime();
    if (actual instanceof RegExp) return actual.source === expected.source && actual.flags === expected.flags;
    if (actual instanceof ArrayBuffer) {
        if (actual.byteLength !== expected.byteLength) return false;
        const actualBytes = new Uint8Array(actual);
        const expectedBytes = new Uint8Array(expected);
        for (let i = 0; i < actualBytes.length; i++) if (actualBytes[i] !== expectedBytes[i]) return false;
        return true;
    }
    if (ArrayBuffer.isView(actual)) {
        if (actual.constructor !== expected.constructor || actual.byteLength !== expected.byteLength) return false;
        const actualBytes = new Uint8Array(actual.buffer, actual.byteOffset, actual.byteLength);
        const expectedBytes = new Uint8Array(expected.buffer, expected.byteOffset, expected.byteLength);
        for (let i = 0; i < actualBytes.length; i++) if (actualBytes[i] !== expectedBytes[i]) return false;
        return true;
    }
    if (actual instanceof Map) {
        if (actual.size !== expected.size) return false;
        for (const [key, value] of actual) if (!expected.has(key) || !deepStrictEqualValue(value, expected.get(key), seen)) return false;
        return true;
    }
    if (actual instanceof Set) {
        if (actual.size !== expected.size) return false;
        for (const value of actual) if (!expected.has(value)) return false;
        return true;
    }
    const actualKeys = enumerableKeys(actual);
    const expectedKeys = enumerableKeys(expected);
    if (actualKeys.length !== expectedKeys.length) return false;
    for (const key of actualKeys) if (!expectedKeys.includes(key) || !deepStrictEqualValue(actual[key], expected[key], seen)) return false;
    return true;
};

const matchExpectedError = (error, expected) => {
    if (expected === undefined) return true;
    if (expected instanceof RegExp) return expected.test(String(error?.message ?? error));
    if (typeof expected === "function") return error instanceof expected;
    return deepStrictEqualValue(error, expected);
};

const ok = (value, message) => { if (!value) fail(message, value, true, "to be truthy"); };

const equal = (actual, expected, message) => { if (actual != expected) fail(message, actual, expected, "=="); };

const notEqual = (actual, expected, message) => { if (actual == expected) fail(message, actual, expected, "!="); };

const strictEqual = (actual, expected, message) => { if (!Object.is(actual, expected)) fail(message, actual, expected, "strictly equals"); };

const notStrictEqual = (actual, expected, message) => { if (Object.is(actual, expected)) fail(message, actual, expected, "not strictly equals"); };

const deepStrictEqual = (actual, expected, message) => { if (!deepStrictEqualValue(actual, expected)) fail(message, actual, expected, "deeply strictly equals"); };

const notDeepStrictEqual = (actual, expected, message) => { if (deepStrictEqualValue(actual, expected)) fail(message, actual, expected, "not deeply strictly equals"); };

const throws = (run, expected, message) => { try { run(); } catch (error) { if (!matchExpectedError(error, expected)) fail(message ?? `The thrown error did not match ${expected}.`, error, expected, "throws"); return error; } fail(message ?? "Expected the function to throw.", undefined, expected, "throws"); };

const doesNotThrow = (run, message) => { try { return run(); } catch (error) { fail(message ?? `Expected the function not to throw: ${error?.message ?? error}`, error, undefined, "does not throw"); } };

const rejects = async (run, expected, message) => { try { await (typeof run === "function" ? run() : run); } catch (error) { if (!matchExpectedError(error, expected)) fail(message ?? `The rejection did not match ${expected}.`, error, expected, "rejects"); return error; } fail(message ?? "Expected the promise to reject.", undefined, expected, "rejects"); };

const doesNotReject = async (run, message) => { try { return await (typeof run === "function" ? run() : run); } catch (error) { fail(message ?? `Expected the promise not to reject: ${error?.message ?? error}`, error, undefined, "does not reject"); } };

const assert = {
    AssertionError,
    deepEqual: deepStrictEqual,
    deepStrictEqual,
    doesNotReject,
    doesNotThrow,
    equal,
    notDeepStrictEqual,
    notEqual,
    notStrictEqual,
    ok,
    rejects,
    strictEqual,
    throws
};

export default assert;
