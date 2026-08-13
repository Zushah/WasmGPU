/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { GltfRoot } from "./types";

export const GLTF_SUPPORTED_VERSION = Object.freeze({ major: 2, minor: 0, text: "2.0" } as const);

type ParsedVersion = { major: bigint; minor: bigint; text: string; };

const PARSED_SUPPORTED_VERSION: ParsedVersion = { major: BigInt(GLTF_SUPPORTED_VERSION.major), minor: BigInt(GLTF_SUPPORTED_VERSION.minor), text: GLTF_SUPPORTED_VERSION.text };

const VERSION_PATTERN = /^(\d+)\.(\d+)$/;

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

const compareVersions = (left: ParsedVersion, right: ParsedVersion): number => {
    if (left.major !== right.major) return left.major < right.major ? -1 : 1;
    if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1;
    return 0;
};

const versionText = (value: unknown): string => typeof value === "string" ? value : String(value);

const parseVersion = (value: unknown, field: "asset.version" | "asset.minVersion"): ParsedVersion => {
    if (typeof value !== "string") throw new Error(`Invalid glTF ${field} '${versionText(value)}'; expected <major>.<minor> (supported glTF ${GLTF_SUPPORTED_VERSION.text}).`);
    const match = VERSION_PATTERN.exec(value);
    if (!match) throw new Error(`Invalid glTF ${field} '${value}'; expected <major>.<minor> (supported glTF ${GLTF_SUPPORTED_VERSION.text}).`);
    return { major: BigInt(match[1]!), minor: BigInt(match[2]!), text: value };
};

export function validateGltfCompatibility(value: unknown): asserts value is GltfRoot {
    if (!isRecord(value) || !isRecord(value.asset)) throw new Error(`Invalid glTF asset: missing asset object (supported glTF ${GLTF_SUPPORTED_VERSION.text}).`);
    const version = parseVersion(value.asset.version, "asset.version");
    if (version.major !== PARSED_SUPPORTED_VERSION.major) throw new Error(`Unsupported glTF asset version ${version.text}; this implementation supports glTF ${GLTF_SUPPORTED_VERSION.text} and compatible 2.x assets.`);
    if (value.asset.minVersion !== undefined) {
        const minVersion = parseVersion(value.asset.minVersion, "asset.minVersion");
        if (compareVersions(minVersion, version) > 0) throw new Error(`Invalid glTF asset: asset.minVersion ${minVersion.text} exceeds asset.version ${version.text} (supported glTF ${GLTF_SUPPORTED_VERSION.text}).`);
        if (compareVersions(minVersion, PARSED_SUPPORTED_VERSION) > 0) throw new Error(`Unsupported glTF asset minimum version ${minVersion.text}; this implementation supports glTF ${GLTF_SUPPORTED_VERSION.text}.`);
    }
}

export const decodeGltfJson = (bytes: ArrayBuffer, context: string): GltfRoot => {
    let text: string;
    try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid glTF ${context}: UTF-8 decoding failed (${detail}).`);
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(text) as unknown;
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid glTF ${context}: JSON parsing failed (${detail}).`);
    }
    validateGltfCompatibility(parsed);
    return parsed;
};
