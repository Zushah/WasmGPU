/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export class DOMNodePool<T extends HTMLElement> {
    private readonly nodes: T[] = [];
    private used: number = 0;

    constructor(
        private readonly parent: HTMLElement,
        private readonly create: () => T,
        readonly maxNodes: number
    ) {}

    beginFrame(): void {
        this.used = 0;
    }

    acquire(): T {
        if (this.used < this.nodes.length) {
            const node = this.nodes[this.used++];
            node.style.display = "";
            return node;
        }
        if (this.nodes.length >= this.maxNodes) {
            throw new Error(`DOMNodePool: exceeded max node budget (${this.maxNodes}).`);
        }
        const node = this.create();
        this.parent.appendChild(node);
        this.nodes.push(node);
        this.used++;
        return node;
    }

    endFrame(): void {
        for (let i = this.used; i < this.nodes.length; i++) this.nodes[i].style.display = "none";
    }

    get size(): number {
        return this.nodes.length;
    }

    clear(removeFromDom: boolean = false): void {
        this.used = 0;
        for (let i = 0; i < this.nodes.length; i++) {
            if (removeFromDom) this.nodes[i].remove();
            else this.nodes[i].style.display = "none";
        }
        if (removeFromDom) this.nodes.length = 0;
    }
}
