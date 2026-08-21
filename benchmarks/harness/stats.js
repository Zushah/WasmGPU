/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const percentile = (sorted, p) => {
    if (sorted.length === 1) return sorted[0];
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index), upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

export const summarize = (samples) => {
    if (!samples.length || samples.some((value) => !Number.isFinite(value))) throw new Error("Benchmark samples must be finite numbers.");
    const sorted = [...samples].sort((a, b) => a - b);
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    const variance = samples.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / samples.length;
    return {
        count: samples.length,
        median: percentile(sorted, 0.5),
        mean,
        p95: percentile(sorted, 0.95),
        standardDeviation: Math.sqrt(variance),
        min: sorted[0],
        max: sorted.at(-1)
    };
};
