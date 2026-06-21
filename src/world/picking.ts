/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Mesh } from "./mesh";
import { PointCloud } from "./pointcloud";
import { GlyphField } from "./glyphfield";
import { NodeLink } from "./nodelink";
import { SplatField } from "./splatfield";

export type PickKind = "mesh" | "pointcloud" | "glyphfield" | "nodelink" | "splatfield";

export type PickAttributes = {
    scalar?: number | null;
    vector?: [number, number, number, number] | null;
    packedPoint?: [number, number, number, number] | null;
    position?: [number, number, number] | null;
    rotation?: [number, number, number, number] | null;
    scale?: [number, number, number] | null;
    opacity?: number | null;
    packedSplat?: [number, number, number, number] | null;
    component?: "node" | "edge" | null;
    componentIndex?: number | null;
    color?: [number, number, number, number] | null;
    edgeEndpoints?: [number, number] | null;
    edgePositions?: [number, number, number, number, number, number] | null;
};

export type PickHit = {
    kind: PickKind;
    object: Mesh | PointCloud | GlyphField | NodeLink | SplatField;
    objectId: number;
    elementIndex: number;
    worldPosition: [number, number, number];
    ndIndex: number[] | null;
    attributes: PickAttributes | null;
};

export type PickResult = PickHit;

export type PickQuery = {
    includeAttributes?: boolean;
};

export type PickRegionMode = "rect" | "lasso";

export type PickLassoPoint = {
    x: number;
    y: number;
};

export type PickRegionQuery = {
    includeAttributes?: boolean;
    maxHits?: number;
};

export type PickRegionResult = {
    mode: PickRegionMode;
    hits: PickHit[];
    truncated: boolean;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    sampledPixels: number;
};

export type SelectionMode = "replace" | "add" | "toggle" | "remove";

export type SelectionEntry = PickHit & {
    key: string;
};

const selectionKey = (objectId: number, elementIndex: number): string => `${objectId}:${elementIndex}`;

const toArray = (x: PickHit | PickHit[] | null | undefined): PickHit[] => {
    if (!x) return [];
    return Array.isArray(x) ? x : [x];
};

const toEntry = (hit: PickHit): SelectionEntry => ({ ...hit, key: selectionKey(hit.objectId, hit.elementIndex) });

export class SelectionStore {
    private entries: Map<string, SelectionEntry> = new Map();

    get size(): number {
        return this.entries.size;
    }

    has(objectId: number, elementIndex: number): boolean {
        return this.entries.has(selectionKey(objectId, elementIndex));
    }

    values(): SelectionEntry[] {
        return Array.from(this.entries.values());
    }

    clear(): this {
        this.entries.clear();
        return this;
    }

    replace(hit: PickHit | PickHit[] | null | undefined): this {
        this.entries.clear();
        this.add(hit);
        return this;
    }

    add(hit: PickHit | PickHit[] | null | undefined): this {
        for (const h of toArray(hit)) this.entries.set(selectionKey(h.objectId, h.elementIndex), toEntry(h));
        return this;
    }

    remove(hit: PickHit | PickHit[] | null | undefined): this {
        for (const h of toArray(hit)) this.entries.delete(selectionKey(h.objectId, h.elementIndex));
        return this;
    }

    toggle(hit: PickHit | PickHit[] | null | undefined): this {
        for (const h of toArray(hit)) {
            const key = selectionKey(h.objectId, h.elementIndex);
            if (this.entries.has(key)) this.entries.delete(key);
            else this.entries.set(key, toEntry(h));
        }
        return this;
    }

    apply(mode: SelectionMode, hit: PickHit | PickHit[] | null | undefined): this {
        switch (mode) {
            case "replace": return this.replace(hit);
            case "add": return this.add(hit);
            case "toggle": return this.toggle(hit);
            case "remove": return this.remove(hit);
        }
    }
}
