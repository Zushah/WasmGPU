/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert } from "../utils";

export type ScratchBufferUsage = {
    usage: GPUBufferUsageFlags;
    labelPrefix?: string;
};

export class ScratchBufferPool {
    private readonly device: GPUDevice;
    private readonly usage: GPUBufferUsageFlags;
    private readonly labelPrefix: string;
    private readonly buffersBySize: Map<number, GPUBuffer[]> = new Map();
    private readonly cursorBySize: Map<number, number> = new Map();

    constructor(device: GPUDevice, opts: ScratchBufferUsage) {
        this.device = device;
        this.usage = opts.usage;
        this.labelPrefix = opts.labelPrefix ?? "scratch";
    }

    acquire(byteLength: number, label?: string): GPUBuffer {
        assert(Number.isInteger(byteLength) && byteLength >= 0, `ScratchBufferPool.acquire: byteLength must be an integer >= 0 (got ${byteLength})`);
        const size = Math.max(4, alignTo(byteLength, 4));
        let list = this.buffersBySize.get(size);
        if (!list) {
            list = [];
            this.buffersBySize.set(size, list);
        }
        const cursor = this.cursorBySize.get(size) ?? 0;
        let buf: GPUBuffer;
        if (cursor < list.length) {
            buf = list[cursor];
        } else {
            const baseLabel = label ? `${this.labelPrefix}:${label}` : `${this.labelPrefix}:${size}`;
            const indexedLabel = (cursor === 0) ? baseLabel : `${baseLabel}:${cursor}`;
            buf = this.device.createBuffer({
                label: indexedLabel,
                size,
                usage: this.usage
            });
            list.push(buf);
        }
        this.cursorBySize.set(size, cursor + 1);
        return buf;
    }

    reset(): void {
        for (const size of this.cursorBySize.keys()) this.cursorBySize.set(size, 0);
    }

    destroy(): void {
        for (const list of this.buffersBySize.values()) for (const buf of list) buf.destroy();
        this.buffersBySize.clear();
        this.cursorBySize.clear();
    }
}
