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
