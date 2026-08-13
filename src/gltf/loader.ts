/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { GltfBuffer, GltfImage, GltfRoot, GltfDocument } from "./types";
import { decodeGltfJson, validateGltfCompatibility } from "./compatibility";
import { parseGLB } from "./glb";
import { decodeDataUri, dirnameUrl, isDataUri, normalizeDirectoryUrl, resolveUri } from "./uri";

export type LoadGltfOptions = {
    baseUrl?: string;
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

const resolveBuffers = async (json: GltfRoot, resourceBaseUrl: string, opts?: LoadGltfOptions, glbBinChunk?: ArrayBuffer | null): Promise<ArrayBuffer[]> => {
    const buffers: GltfBuffer[] = json.buffers ?? [];
    const out: ArrayBuffer[] = new Array(buffers.length);
    for (let i = 0; i < buffers.length; i++) {
        const b = buffers[i]!;
        if (!b.uri) {
            if (!glbBinChunk) throw new Error(`buffers[${i}] has no uri but no GLB BIN chunk was provided`);
            out[i] = glbBinChunk;
            continue;
        }
        if (isDataUri(b.uri)) {
            out[i] = decodeDataUri(b.uri).data;
            continue;
        }
        const url = resolveUri(resourceBaseUrl, b.uri);
        out[i] = (await fetchArrayBuffer(url, opts)).bytes;
    }
    return out;
};

const resolveImages = async (json: GltfRoot, buffers: ArrayBuffer[], resourceBaseUrl: string, opts?: LoadGltfOptions): Promise<ArrayBuffer[]> => {
    const images: GltfImage[] = json.images ?? [];
    const out: ArrayBuffer[] = new Array(images.length);
    for (let i = 0; i < images.length; i++) {
        const img = images[i]!;
        if (img.uri) {
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
            const start = (bv.byteOffset ?? 0) | 0;
            const length = bv.byteLength | 0;
            const copy = new Uint8Array(length);
            copy.set(new Uint8Array(buffer, start, length));
            out[i] = copy.buffer;
            continue;
        }
        warn(opts, `images[${i}] has neither uri nor bufferView; skipping`);
        out[i] = new ArrayBuffer(0);
    }
    return out;
};

const finalizeDocument = async (json: GltfRoot, baseUrl: string, resourceBaseUrl: string, opts?: LoadGltfOptions, glbBinChunk?: ArrayBuffer | null): Promise<GltfDocument> => {
    validateGltfCompatibility(json);
    const buffers = await resolveBuffers(json, resourceBaseUrl, opts, glbBinChunk);
    const doc: GltfDocument = { json, buffers, baseUrl, resourceBaseUrl };
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
        const resourceBaseUrl = opts?.baseUrl !== undefined ? normalizeDirectoryUrl(opts.baseUrl) : fetched.responseUrl;
        const baseUrl = opts?.baseUrl !== undefined ? resourceBaseUrl : dirnameUrl(resourceBaseUrl);
        const { json, binChunk } = parseRootBytes(fetched.bytes, `source '${source}'`);
        return finalizeDocument(json, baseUrl, resourceBaseUrl, opts, binChunk);
    }
    const resourceBaseUrl = opts?.baseUrl !== undefined ? normalizeDirectoryUrl(opts.baseUrl) : "";
    const baseUrl = resourceBaseUrl;
    const { json, binChunk } = parseRootBytes(source, "in-memory source");
    return finalizeDocument(json, baseUrl, resourceBaseUrl, opts, binChunk);
};
