/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { GltfBuffer, GltfImage, GltfRoot, GltfDocument } from "./types";
import { decodeGltfJson, validateGltfCompatibility } from "./compatibility";
import { parseGLB } from "./glb";
import { decodeDataUri, isDataUri, normalizeDirectoryUrl, resolveUri } from "./uri";

export type LoadGltfOptions = {
    resourceBaseUrl?: string;
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    loadImages?: boolean;
    onWarning?: (message: string) => void;
};

const warn = (opts: LoadGltfOptions | undefined, msg: string): void => opts?.onWarning?.(msg);

type FetchedArrayBuffer = {
    bytes: ArrayBuffer;
    responseUrl: string;
};

const getFetch = (opts?: LoadGltfOptions): ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) => {
    const f = opts?.fetch ?? (globalThis.fetch as unknown as typeof fetch | undefined);
    if (!f) throw new Error("loadGltf(): fetch() is not available. Pass LoadGltfOptions.fetch or provide an ArrayBuffer source.");
    return f;
};

const fetchArrayBuffer = async (url: string, opts?: LoadGltfOptions): Promise<FetchedArrayBuffer> => {
    const f = getFetch(opts);
    const res = await f(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    const bytes = await res.arrayBuffer();
    return { bytes, responseUrl: typeof res.url === "string" && res.url.length > 0 ? res.url : url };
};

const isGLB = (bytes: ArrayBuffer): boolean => bytes.byteLength >= 4 && new DataView(bytes).getUint32(0, true) === 0x46546c67;

const requireBufferLength = (value: number, context: string): number => {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${context} must be a non-negative safe integer, got ${String(value)}.`);
    return value;
};

const restrictBufferToDeclaredLength = (bytes: ArrayBuffer, length: number, context: string): ArrayBuffer => {
    if (bytes.byteLength < length) throw new Error(`${context} contains ${bytes.byteLength} bytes, but ${length} were declared.`);
    return bytes.slice(0, length);
};

const resolveBuffers = async (json: GltfRoot, resourceBaseUrl: string, opts?: LoadGltfOptions, glbBinChunk?: ArrayBuffer | null): Promise<ArrayBuffer[]> => {
    const buffers: GltfBuffer[] = json.buffers ?? [];
    const out: ArrayBuffer[] = new Array(buffers.length);
    for (let i = 0; i < buffers.length; i++) {
        const b = buffers[i]!;
        const length = requireBufferLength(b.byteLength, `buffers[${i}].byteLength`);
        if (b.uri === undefined) {
            if (glbBinChunk === null || glbBinChunk === undefined) throw new Error(`buffers[${i}] has no uri but no GLB BIN chunk was provided`);
            out[i] = restrictBufferToDeclaredLength(glbBinChunk, length, `buffers[${i}] GLB BIN chunk`);
            continue;
        }
        if (isDataUri(b.uri)) {
            out[i] = restrictBufferToDeclaredLength(decodeDataUri(b.uri).data, length, `buffers[${i}] data URI`);
            continue;
        }
        const url = resolveUri(resourceBaseUrl, b.uri);
        out[i] = restrictBufferToDeclaredLength((await fetchArrayBuffer(url, opts)).bytes, length, `buffers[${i}] resource`);
    }
    return out;
};

const resolveImages = async (json: GltfRoot, buffers: ArrayBuffer[], resourceBaseUrl: string, opts?: LoadGltfOptions): Promise<ArrayBuffer[]> => {
    const images: GltfImage[] = json.images ?? [];
    const out: ArrayBuffer[] = new Array(images.length);
    for (let i = 0; i < images.length; i++) {
        const img = images[i]!;
        if (img.uri !== undefined) {
            if (isDataUri(img.uri)) {
                out[i] = decodeDataUri(img.uri).data;
            } else {
                const url = resolveUri(resourceBaseUrl, img.uri);
                out[i] = (await fetchArrayBuffer(url, opts)).bytes;
            }
            continue;
        }
        if (img.bufferView !== undefined) {
            const bv = json.bufferViews?.[img.bufferView];
            if (!bv) throw new Error(`Invalid images[${i}].bufferView: ${img.bufferView}`);
            const buffer = buffers[bv.buffer];
            if (!buffer) throw new Error(`Missing buffer[${bv.buffer}] for images[${i}]`);
            const start = requireBufferLength(bv.byteOffset ?? 0, `images[${i}].bufferView.byteOffset`);
            const length = requireBufferLength(bv.byteLength, `images[${i}].bufferView.byteLength`);
            const end = start + length;
            if (!Number.isSafeInteger(end) || end > buffer.byteLength) throw new Error(`images[${i}].bufferView exceeds its buffer.`);
            out[i] = buffer.slice(start, end);
            continue;
        }
        warn(opts, `images[${i}] has neither uri nor bufferView; skipping`);
        out[i] = new ArrayBuffer(0);
    }
    return out;
};

const finalizeDocument = async (json: GltfRoot, resourceBaseUrl: string, opts?: LoadGltfOptions, glbBinChunk?: ArrayBuffer | null): Promise<GltfDocument> => {
    validateGltfCompatibility(json);
    const buffers = await resolveBuffers(json, resourceBaseUrl, opts, glbBinChunk);
    const doc: GltfDocument = { json, buffers, resourceBaseUrl };
    if (opts?.loadImages) doc.images = await resolveImages(json, buffers, resourceBaseUrl, opts);
    return doc;
};

const parseRootBytes = (bytes: ArrayBuffer, context: string): { json: GltfRoot; binChunk: ArrayBuffer | null } => {
    if (isGLB(bytes)) return parseGLB(bytes);
    return { json: decodeGltfJson(bytes, `${context} JSON`), binChunk: null };
};

export const loadGltf = async (source: string | ArrayBuffer, opts?: LoadGltfOptions): Promise<GltfDocument> => {
    if (typeof source === "string") {
        const fetched = await fetchArrayBuffer(source, opts);
        const resourceBaseUrl = opts?.resourceBaseUrl !== undefined ? normalizeDirectoryUrl(opts.resourceBaseUrl) : fetched.responseUrl;
        const { json, binChunk } = parseRootBytes(fetched.bytes, `source '${source}'`);
        return finalizeDocument(json, resourceBaseUrl, opts, binChunk);
    }
    const resourceBaseUrl = opts?.resourceBaseUrl !== undefined ? normalizeDirectoryUrl(opts.resourceBaseUrl) : "";
    const { json, binChunk } = parseRootBytes(source, "in-memory source");
    return finalizeDocument(json, resourceBaseUrl, opts, binChunk);
};
