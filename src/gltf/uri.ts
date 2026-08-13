/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export type DecodedDataUri = {
    mimeType: string | null;
    data: ArrayBuffer;
};

const URI_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const RELATIVE_URI_ORIGIN = "https://wasmgpu-relative.invalid";
const MIME_TOKEN_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const PARAMETER_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+=(?:[!#$%&'*+\-.^_`|~0-9A-Za-z]+|"[^"\r\n]*")$/;

const isAbsoluteUri = (value: string): boolean => URI_SCHEME_PATTERN.test(value);

const dataUriError = (uri: string, message: string): Error => {
    const preview = uri.length > 64 ? `${uri.slice(0, 64)}...` : uri;
    return new Error(`Invalid data URI (${preview}): ${message}`);
};

const hexValue = (value: number): number => {
    if (value >= 0x30 && value <= 0x39) return value - 0x30;
    if (value >= 0x41 && value <= 0x46) return value - 0x41 + 10;
    if (value >= 0x61 && value <= 0x66) return value - 0x61 + 10;
    return -1;
};

const decodeMetadataToken = (token: string, uri: string): string => {
    const out: number[] = [];
    for (let i = 0; i < token.length; i++) {
        const code = token.charCodeAt(i);
        if (code !== 0x25) {
            if (code > 0x7f) throw dataUriError(uri, "metadata must use ASCII characters");
            out.push(code);
            continue;
        }
        if (i + 2 >= token.length) throw dataUriError(uri, "malformed percent escape in metadata");
        const high = hexValue(token.charCodeAt(++i));
        const low = hexValue(token.charCodeAt(++i));
        if (high < 0 || low < 0) throw dataUriError(uri, "malformed percent escape in metadata");
        out.push((high << 4) | low);
    }
    return String.fromCharCode(...out);
};

const decodePayloadBytes = (payload: string, uri: string, allowUtf8: boolean): Uint8Array => {
    const bytes: number[] = [];
    for (let i = 0; i < payload.length;) {
        const code = payload.charCodeAt(i);
        if (code === 0x25) {
            if (i + 2 >= payload.length) throw dataUriError(uri, "malformed percent escape in payload");
            const high = hexValue(payload.charCodeAt(i + 1));
            const low = hexValue(payload.charCodeAt(i + 2));
            if (high < 0 || low < 0) throw dataUriError(uri, "malformed percent escape in payload");
            bytes.push((high << 4) | low);
            i += 3;
            continue;
        }
        const codePoint = payload.codePointAt(i);
        if (codePoint === undefined) break;
        if (codePoint <= 0x7f) bytes.push(codePoint);
        else {
            if (!allowUtf8) throw dataUriError(uri, "base64 payload contains an unescaped non-ASCII character");
            if (codePoint >= 0xd800 && codePoint <= 0xdfff) throw dataUriError(uri, "payload contains an unpaired surrogate");
            const encoded = new TextEncoder().encode(String.fromCodePoint(codePoint));
            for (const byte of encoded) bytes.push(byte);
        }
        i += codePoint > 0xffff ? 2 : 1;
    }
    return new Uint8Array(bytes);
};

export const isDataUri = (uri: string): boolean => uri.slice(0, 5).toLowerCase() === "data:";

export const decodeDataUri = (uri: string): DecodedDataUri => {
    if (!isDataUri(uri)) throw dataUriError(uri, "expected a data: scheme");
    const comma = uri.indexOf(",", 5);
    if (comma < 0) throw dataUriError(uri, "missing comma separator");
    const metadata = uri.slice(5, comma);
    const payload = uri.slice(comma + 1);
    const parts = metadata.split(";");
    const first = decodeMetadataToken((parts.shift() ?? "").trim(), uri);
    let isBase64 = false;
    const parameters: string[] = [];
    for (const rawPart of parts) {
        const part = decodeMetadataToken(rawPart.trim(), uri);
        if (part.length === 0) continue;
        if (part.toLowerCase() === "base64") {
            if (isBase64) throw dataUriError(uri, "duplicate base64 flag");
            isBase64 = true;
            continue;
        }
        parameters.push(part);
    }
    for (const parameter of parameters) if (!PARAMETER_PATTERN.test(parameter)) throw dataUriError(uri, `invalid media type parameter '${parameter}'`);
    let mimeType: string | null = null;
    if (first.length > 0) {
        const slash = first.indexOf("/");
        if (slash <= 0 || slash === first.length - 1 || first.indexOf("/", slash + 1) >= 0) throw dataUriError(uri, `invalid media type '${first}'`);
        const type = first.slice(0, slash);
        const subtype = first.slice(slash + 1);
        if (!MIME_TOKEN_PATTERN.test(type) || !MIME_TOKEN_PATTERN.test(subtype)) throw dataUriError(uri, `invalid media type '${first}'`);
        mimeType = [first, ...parameters].join(";");
    }
    if (isBase64) {
        const encoded = decodePayloadBytes(payload, uri, false);
        let binary: string;
        try {
            const chunks: string[] = [];
            for (let offset = 0; offset < encoded.length; offset += 0x8000) chunks.push(String.fromCharCode(...encoded.subarray(offset, offset + 0x8000)));
            binary = atob(chunks.join(""));
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            throw dataUriError(uri, `invalid base64 payload (${detail})`);
        }
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i) & 0xff;
        return { mimeType, data: bytes.buffer };
    }
    const decoded = decodePayloadBytes(payload, uri, true);
    return { mimeType, data: decoded.buffer as ArrayBuffer };
};

const pathAndSuffix = (url: string): { path: string; suffix: string } => {
    const query = url.search(/[?#]/);
    return query < 0 ? { path: url, suffix: "" } : { path: url.slice(0, query), suffix: url.slice(query) };
};

export const dirnameUrl = (url: string): string => {
    if (!url) return "";
    if (isAbsoluteUri(url) || url.startsWith("//")) {
        try {
            const protocolRelative = url.startsWith("//");
            const parsed = new URL(url, RELATIVE_URI_ORIGIN);
            const slash = parsed.pathname.lastIndexOf("/");
            parsed.pathname = slash < 0 ? "/" : parsed.pathname.slice(0, slash + 1);
            parsed.search = "";
            parsed.hash = "";
            if (protocolRelative) return `//${parsed.host}${parsed.pathname}`;
            return parsed.href;
        } catch {}
    }
    const { path } = pathAndSuffix(url);
    const slash = path.lastIndexOf("/");
    return slash < 0 ? "" : path.slice(0, slash + 1);
};

export const normalizeDirectoryUrl = (url: string): string => {
    if (!url) return "";
    const { path, suffix } = pathAndSuffix(url);
    return path.endsWith("/") ? url : `${path}/${suffix}`;
};

export const resolveUri = (baseUrl: string, uri: string): string => {
    if (isAbsoluteUri(uri)) return uri;
    if (!baseUrl) return uri;
    if (isAbsoluteUri(baseUrl) || baseUrl.startsWith("//")) {
        const absoluteBase = baseUrl.startsWith("//") ? `https:${baseUrl}` : baseUrl;
        try {
            return new URL(uri, absoluteBase).href;
        } catch {
            return uri;
        }
    }
    if (uri.startsWith("//")) return new URL(uri, RELATIVE_URI_ORIGIN).href.slice("https:".length);
    const sentinelBase = new URL(baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`, RELATIVE_URI_ORIGIN);
    const resolved = new URL(uri, sentinelBase);
    if (resolved.origin !== RELATIVE_URI_ORIGIN) return resolved.href;
    const path = resolved.href.slice(RELATIVE_URI_ORIGIN.length);
    return uri.startsWith("/") ? path : path.slice(1);
};
