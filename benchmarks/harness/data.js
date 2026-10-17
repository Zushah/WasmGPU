/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const makeF32 = (length) => {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) data[i] = ((i * 17) % 1009) / 1009;
    return data;
};

export const makeU32 = (length) => {
    const data = new Uint32Array(length);
    for (let i = 0; i < length; i++) data[i] = Math.imul(i, 2654435761) >>> 0;
    return data;
};

export const makeMatricesC64 = (batchCount, n) => {
    const matrices = new Float32Array(batchCount * n * n * 2);
    let seed = (0x243f6a88 ^ n ^ batchCount) >>> 0;
    const random = () => {
        seed = (seed + 0x6D2B79F5) >>> 0;
        let value = seed;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    for (let batch = 0; batch < batchCount; batch++) {
        for (let row = 0; row < n; row++) {
            let rowMagnitude = 0;
            for (let column = 0; column < n; column++) {
                if (row === column) continue;
                const index = (batch * n * n + row * n + column) * 2;
                const real = (random() - 0.5) / n;
                const imaginary = (random() - 0.5) / n;
                matrices[index] = real;
                matrices[index + 1] = imaginary;
                rowMagnitude += Math.hypot(real, imaginary);
            }
            const diagonal = (batch * n * n + row * n + row) * 2;
            matrices[diagonal] = rowMagnitude + 1 + batch * 0.125;
            matrices[diagonal + 1] = 0.125 + batch * 0.01;
        }
    }
    return matrices;
};

export const makeMatricesF32 = (batchCount, n) => {
    const matrices = new Float32Array(batchCount * n * n);
    let seed = (0x9e3779b1 ^ n ^ batchCount) >>> 0;
    const random = () => {
        seed = (seed + 0x6D2B79F5) >>> 0;
        let value = seed;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    for (let batch = 0; batch < batchCount; batch++) {
        for (let row = 0; row < n; row++) {
            let rowMagnitude = 0;
            for (let column = 0; column < n; column++) {
                if (row === column) continue;
                const value = (random() - 0.5) / n;
                matrices[batch * n * n + row * n + column] = value;
                rowMagnitude += Math.abs(value);
            }
            matrices[batch * n * n + row * n + row] = rowMagnitude + 1 + batch * 0.125;
        }
    }
    return matrices;
};
