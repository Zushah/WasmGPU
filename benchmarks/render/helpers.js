/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const makePointData = (count, z = 0, spread = 6) => {
    const data = new Float32Array(count * 4), side = Math.max(1, Math.ceil(Math.sqrt(count)));
    for (let i = 0; i < count; i++) {
        data[i * 4] = (((i % side) / Math.max(1, side - 1)) - 0.5) * spread;
        data[i * 4 + 1] = (((Math.floor(i / side) % side) / Math.max(1, side - 1)) - 0.5) * spread;
        data[i * 4 + 2] = z;
        data[i * 4 + 3] = (i % 1024) / 1023;
    }
    return data;
};

export const makeGlyphData = (count) => {
    const positions = makePointData(count, 0, 7), rotations = new Float32Array(count * 4), scales = new Float32Array(count * 4), attributes = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
        rotations[i * 4 + 3] = 1;
        scales[i * 4] = 0.12;
        scales[i * 4 + 1] = 0.12;
        scales[i * 4 + 2] = 0.3;
        attributes[i * 4] = (i % 1024) / 1023;
        attributes[i * 4 + 3] = 1;
    }
    return { positions, rotations, scales, attributes };
};

export const makeGraphData = (nodeCount) => {
    const nodePositions = new Float32Array(nodeCount * 3), nodeScalars = new Float32Array(nodeCount), edgeCount = Math.max(0, nodeCount - 1), edges = new Uint32Array(edgeCount * 2);
    for (let i = 0; i < nodeCount; i++) {
        const angle = i * 0.17, radius = 1 + (i % 64) * 0.04;
        nodePositions[i * 3] = Math.cos(angle) * radius;
        nodePositions[i * 3 + 1] = Math.sin(angle) * radius;
        nodePositions[i * 3 + 2] = ((i % 31) - 15) * 0.04;
        nodeScalars[i] = (i % 1024) / 1023;
        if (i > 0) {
            edges[(i - 1) * 2] = i - 1;
            edges[(i - 1) * 2 + 1] = i;
        }
    }
    return { nodePositions, nodeScalars, edges, edgeCount };
};

export const makeSplatData = (count) => {
    const positions = new Float32Array(count * 3), rotations = new Float32Array(count * 4), scales = new Float32Array(count * 3), opacities = new Float32Array(count), colors = new Float32Array(count * 4), side = Math.max(1, Math.ceil(Math.sqrt(count)));
    for (let i = 0; i < count; i++) {
        positions[i * 3] = ((i % side) - side / 2) * 0.025;
        positions[i * 3 + 1] = (Math.floor(i / side) - side / 2) * 0.025;
        positions[i * 3 + 2] = ((i % 17) - 8) * 0.01;
        rotations[i * 4 + 3] = 1;
        scales[i * 3] = 0.035;
        scales[i * 3 + 1] = 0.035;
        scales[i * 3 + 2] = 0.02;
        opacities[i] = 0.65;
        colors[i * 4] = 0.2 + (i % 5) * 0.12;
        colors[i * 4 + 1] = 0.55;
        colors[i * 4 + 2] = 0.9;
        colors[i * 4 + 3] = 1;
    }
    return { positions, rotations, scales, opacities, colors };
};
