/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { GltfRoot } from "./types";
import { decodeGltfJson } from "./compatibility";

export type ParsedGLB = {
    json: GltfRoot;
    binChunk: ArrayBuffer | null;
};

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION_2 = 2;
const CHUNK_JSON = 0x4E4F534A; 
const CHUNK_BIN = 0x004E4942;

export const parseGLB = (glb: ArrayBuffer): ParsedGLB => {
    const dv = new DataView(glb);
    if (dv.byteLength < 12) throw new Error("Invalid GLB: too small");
    const magic = dv.getUint32(0, true);
    const version = dv.getUint32(4, true);
    const length = dv.getUint32(8, true);
    if (magic !== GLB_MAGIC) throw new Error("Invalid GLB: bad magic");
    if (version !== GLB_VERSION_2) throw new Error(`Unsupported GLB version: ${version}`);
    if (length > dv.byteLength) throw new Error("Invalid GLB: length exceeds buffer");
    let offset = 12;
    let jsonChunk: ArrayBuffer | null = null;
    let binChunk: ArrayBuffer | null = null;
    while (offset + 8 <= length) {
        const chunkLength = dv.getUint32(offset + 0, true);
        const chunkType = dv.getUint32(offset + 4, true);
        offset += 8;
        if (offset + chunkLength > length) throw new Error("Invalid GLB: chunk exceeds buffer length");
        const chunk = glb.slice(offset, offset + chunkLength);
        if (chunkType === CHUNK_JSON) jsonChunk = chunk;
        else if (chunkType === CHUNK_BIN && !binChunk) binChunk = chunk;
        offset += chunkLength;
    }
    if (!jsonChunk) throw new Error("Invalid GLB: missing JSON chunk");
    const json = decodeGltfJson(jsonChunk, "GLB JSON chunk");
    return { json, binChunk };
};
