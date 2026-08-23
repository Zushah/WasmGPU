/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import computeCopy from "./compute/kernels-copy-f32-throughput.bench.js";
import computeReduce from "./compute/kernels-sum-f32-throughput.bench.js";
import computeRadix from "./compute/kernels-radix-sort-keys-u32-throughput.bench.js";
import ndarray from "./compute/cpundarray-index-get-set-throughput.bench.js";
import computeMin from "./compute/kernels-min-f32-throughput.bench.js";
import computeArgmin from "./compute/kernels-argmin-f32-throughput.bench.js";
import computeArgmax from "./compute/kernels-argmax-f32-throughput.bench.js";
import computeScan from "./compute/kernels-scan-exclusive-u32-throughput.bench.js";
import computeHistogram from "./compute/kernels-histogram-u32-throughput.bench.js";
import computeCompactU32 from "./compute/kernels-compact-u32-throughput.bench.js";
import computeCompactF32 from "./compute/kernels-compact-f32-throughput.bench.js";
import computeRadixPairs from "./compute/kernels-radix-sort-pairs-u32-throughput.bench.js";
import computeScaleExtract from "./compute/kernels-scale-extract-f32-throughput.bench.js";
import computeScaleHistogram from "./compute/kernels-scale-histogram-f32-throughput.bench.js";
import computeScaleRemap from "./compute/kernels-scale-remap-f32-throughput.bench.js";
import storageBufferWrite from "./compute/storagebuffer-write-throughput.bench.js";
import readbackRingRead from "./compute/readbackring-read-throughput.bench.js";
import ndarrayUpload from "./compute/cpundarray-upload-to-gpu-throughput.bench.js";
import ndarrayReadback from "./compute/gpundarray-readback-to-cpu-throughput.bench.js";
import computeDispatchBatch from "./compute/compute-dispatch-batch-throughput.bench.js";
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
import renderMesh from "./render/renderer-mesh-render-frame.bench.js";
import renderPointCloud from "./render/renderer-pointcloud-render-frame.bench.js";
import renderGlyphField from "./render/renderer-glyphfield-render-frame.bench.js";
import renderNodeLink from "./render/renderer-nodelink-render-frame.bench.js";
import renderSplatField from "./render/renderer-splatfield-render-frame.bench.js";
import renderLatticeSpace from "./render/renderer-latticespace-render-frame.bench.js";
import renderManyMeshes from "./render/renderer-many-meshes-render-frame.bench.js";
import renderManyPointClouds from "./render/renderer-many-pointclouds-render-frame.bench.js";
import renderMixedMaterials from "./render/renderer-mixed-materials-render-frame.bench.js";
import renderFrustumCulling from "./render/renderer-frustum-culling-render-frame.bench.js";
import renderOcclusionCulling from "./render/renderer-occlusion-culling-render-frame.bench.js";
import renderDirectionalShadows from "./render/renderer-directional-shadows-render-frame.bench.js";
import renderTransparentMesh from "./render/renderer-transparent-mesh-render-frame.bench.js";
import renderTransmissionMesh from "./render/renderer-transmission-mesh-render-frame.bench.js";
import renderAntialias from "./render/renderer-antialias-render-frame.bench.js";
import renderDataMaterial from "./render/renderer-data-material-render-frame.bench.js";
import renderMixedScientificScene from "./render/renderer-mixed-scientific-scene-render-frame.bench.js";
import interact from "./interact/renderer-pointcloud-pick-latency.bench.js";

export const benchmarks = [
    math,
    mathF32,
    mathF64,
    transforms,
    computeCopy,
    computeReduce,
    computeMin,
    computeArgmin,
    computeArgmax,
    computeScan,
    computeHistogram,
    computeCompactU32,
    computeCompactF32,
    computeRadix,
    computeRadixPairs,
    computeScaleExtract,
    computeScaleHistogram,
    computeScaleRemap,
    storageBufferWrite,
    readbackRingRead,
    ndarray,
    ndarrayUpload,
    ndarrayReadback,
    computeDispatchBatch,
    pointcloud,
    glyphfield,
    nodelink,
    splatfield,
    latticespace,
    scaling,
    gltf,
    wasmTransfer,
    renderMesh,
    renderPointCloud,
    renderGlyphField,
    renderNodeLink,
    renderSplatField,
    renderLatticeSpace,
    renderManyMeshes,
    renderManyPointClouds,
    renderMixedMaterials,
    renderFrustumCulling,
    renderOcclusionCulling,
    renderDirectionalShadows,
    renderTransparentMesh,
    renderTransmissionMesh,
    renderAntialias,
    renderDataMaterial,
    renderMixedScientificScene,
    interact
];
