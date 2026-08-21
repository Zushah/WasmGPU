/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "transform-set-position-update-all-throughput",
    subsystem: "math",
    type: "throughput",
    unit: "transforms/s",
    description: "Throughput for mutating every Transform position and propagating the dirty hierarchy with Transform.updateAll().",
    sizes: { quick: [2_048, 8_192], full: [8_192, 32_768, 65_536] },
    gpu: false,
    setup({ WasmGPU }, size) {
        const nodes = Array.from({ length: size }, () => new WasmGPU.Transform());
        for (let i = 1; i < size; i++) nodes[i].setParent(nodes[(i - 1) >> 1]);
        return { nodes, Transform: WasmGPU.Transform, tick: 0 };
    },
    run(state) {
        state.tick++;
        for (let i = 0; i < state.nodes.length; i++) state.nodes[i].setPosition(i * 0.001, state.tick * 0.001, -i * 0.001);
        state.Transform.updateAll();
    },
    operations(size) { return size; },
    workload(size) { return { transformsMutatedAndPropagated: size }; },
    teardown(state) { for (let i = state.nodes.length - 1; i >= 0; i--) state.nodes[i].dispose(); }
};
