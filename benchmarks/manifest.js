/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import computeCopy from "./compute/kernels-copy-f32-throughput.bench.js";
import computeReduce from "./compute/kernels-sum-f32-throughput.bench.js";
import computeRadix from "./compute/kernels-radix-sort-keys-u32-throughput.bench.js";
import ndarray from "./compute/cpundarray-index-get-set-throughput.bench.js";
import math from "./math/mat4-mul-throughput.bench.js";
import mathF32 from "./math/mat4f-mul-throughput.bench.js";
import mathF64 from "./math/mat4d-mul-throughput.bench.js";
import transforms from "./math/transform-set-position-update-all-throughput.bench.js";
import wasmTransfer from "./interop/webassembly-view-copy-throughput.bench.js";
import scaling from "./scaling/scale-service-percentile-stats-latency.bench.js";
import gltf from "./gltf/accessors-read-interleaved-vec3-throughput.bench.js";
import pointcloud from "./objects/pointcloud-set-data-upload-throughput.bench.js";
import glyphfield from "./objects/glyphfield-set-cpu-data-upload-throughput.bench.js";
import nodelink from "./objects/nodelink-update-node-positions-upload-throughput.bench.js";
import splatfield from "./objects/splatfield-refresh-wasm-upload-throughput.bench.js";
import latticespace from "./objects/latticespace-set-data-upload-throughput.bench.js";
import render from "./render/renderer-pointcloud-render-frame.bench.js";
import interact from "./interact/renderer-pointcloud-pick-latency.bench.js";

export const benchmarks = [
    math,
    mathF32,
    mathF64,
    transforms,
    computeCopy,
    computeReduce,
    computeRadix,
    ndarray,
    pointcloud,
    glyphfield,
    nodelink,
    splatfield,
    latticespace,
    scaling,
    gltf,
    wasmTransfer,
    render,
    interact
];
