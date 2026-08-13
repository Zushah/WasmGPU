/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, setupTest } from "./utils/helpers.js";
import { initWebAssembly, readAccessor, readAccessorAsFloat32, readAccessorAsUint16, readIndicesAsUint32, parseGLB, loadGltf, importGltf, isDataUri, decodeDataUri, dirnameUrl, resolveUri, Scene, Transform, TransformStore, Geometry, Material, Texture2D, AnimationClip, Skin, SkinInstance, Camera, Mesh, PointLight, UnlitMaterial, StandardMaterial, SplatField, wasm } from "../dist/WasmGPU.js";

const pad4 = (n) => (n + 3) & ~3;
const makeGLB = (gltfJson, binBytes) => {
    const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson));
    const jsonPaddedLen = pad4(jsonBytes.byteLength), binPaddedLen = pad4(binBytes.byteLength);
    const totalLen = 12 + 8 + jsonPaddedLen + 8 + binPaddedLen;
    const out = new ArrayBuffer(totalLen), dv = new DataView(out), u8 = new Uint8Array(out);
    dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, totalLen, true);
    let off = 12;
    dv.setUint32(off + 0, jsonPaddedLen, true); dv.setUint32(off + 4, 0x4E4F534A, true);
    off += 8;
    u8.set(jsonBytes, off);
    for (let i = off + jsonBytes.byteLength; i < off + jsonPaddedLen; i++) u8[i] = 0x20;
    off += jsonPaddedLen;
    dv.setUint32(off + 0, binPaddedLen, true); dv.setUint32(off + 4, 0x004E4942, true);
    off += 8;
    u8.set(new Uint8Array(binBytes), off);
    return out;
};
const copyBytes = (target, offset, source) => { target.set(new Uint8Array(source.buffer, source.byteOffset, source.byteLength), offset); };
const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers();
const expectSupport = (metadata, names, expected) => { for (const name of names) assert.equal(metadata.extensions.support[name], expected, `${name} should be ${expected}`); };
const jsonBytes = (json) => new TextEncoder().encode(JSON.stringify(json)).buffer;
const mockResponse = (bytes, url = "") => ({ ok: true, status: 200, statusText: "OK", url, arrayBuffer: async () => bytes.slice(0) });

await setupTest({ initWebAssembly });

// 1) GLB parsing, loading, and accessors preserve document structure and decoded data.
{
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const gltfJson = {
        asset: { version: "2.0", generator: "WasmGPU test", extras: { suite: "gltf" } },
        buffers: [{ byteLength: positions.byteLength }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        nodes: [{ mesh: 0 }],
        scenes: [{ nodes: [0] }],
        scene: 0
    };
    const glb = makeGLB(gltfJson, positions.buffer);
    const parsed = parseGLB(glb);
    assert.equal(parsed.json.asset.version, "2.0");
    assert.equal(parsed.json.asset.generator, "WasmGPU test");
    assert.ok(parsed.binChunk);
    assert.equal(parsed.binChunk.byteLength, positions.byteLength);

    const doc = await loadGltf(glb, { resourceBaseUrl: "memory://asset/" });
    assert.equal(doc.resourceBaseUrl, "memory://asset/");
    assert.equal(doc.json.asset.extras.suite, "gltf");
    assert.equal(doc.buffers.length, 1);
    assert.equal(doc.buffers[0].byteLength, positions.byteLength);

    const buf = new ArrayBuffer(64);
    const dv = new DataView(buf);
    dv.setFloat32(0, 1.0, true);
    dv.setFloat32(4, 2.0, true);
    dv.setFloat32(8, 3.0, true);
    dv.setUint16(12, 0, true);
    dv.setUint16(14, 65535, true);
    dv.setFloat32(20, 4.0, true);
    dv.setFloat32(24, 5.0, true);
    dv.setFloat32(28, 6.0, true);
    dv.setUint16(32, 32768, true);
    dv.setUint16(34, 0, true);
    dv.setUint8(40, 1);
    copyBytes(new Uint8Array(buf), 44, new Float32Array([7, 8, 9]));
    copyBytes(new Uint8Array(buf), 56, new Uint16Array([0, 2, 1]));

    const accessorDoc = {
        json: {
            asset: { version: "2.0" },
            buffers: [{ byteLength: 64 }],
            bufferViews: [
                { buffer: 0, byteOffset: 0, byteLength: 40, byteStride: 20 },
                { buffer: 0, byteOffset: 40, byteLength: 1 },
                { buffer: 0, byteOffset: 44, byteLength: 12 },
                { buffer: 0, byteOffset: 56, byteLength: 6 }
            ],
            accessors: [
                { bufferView: 0, byteOffset: 0, componentType: 5126, count: 2, type: "VEC3" },
                { bufferView: 0, byteOffset: 12, componentType: 5123, normalized: true, count: 2, type: "VEC2" },
                {
                    componentType: 5126,
                    count: 3,
                    type: "VEC3",
                    sparse: {
                        count: 1,
                        indices: { bufferView: 1, componentType: 5121 },
                        values: { bufferView: 2 }
                    }
                },
                { bufferView: 3, componentType: 5123, count: 3, type: "SCALAR" }
            ]
        },
        buffers: [buf],
        resourceBaseUrl: ""
    };

    const accessorView = readAccessor(accessorDoc, 0);
    assert.equal(accessorView.count, 2);
    assert.equal(accessorView.numComponents, 3);
    arraysApproxEqual(Array.from(readAccessorAsFloat32(accessorDoc, 0)), [1, 2, 3, 4, 5, 6]);
    const uv = readAccessorAsFloat32(accessorDoc, 1);
    numberApproxEqual(uv[0], 0);
    numberApproxEqual(uv[1], 1);
    numberApproxEqual(uv[2], 32768 / 65535);
    numberApproxEqual(uv[3], 0);
    arraysApproxEqual(Array.from(readAccessorAsFloat32(accessorDoc, 2)), [0, 0, 0, 7, 8, 9, 0, 0, 0]);
    assert.deepEqual(Array.from(readAccessorAsUint16(accessorDoc, 3)), [0, 2, 1]);
    assert.deepEqual(Array.from(readIndicesAsUint32(accessorDoc, 3)), [0, 2, 1]);
}

// 2) Material import maps quantized geometry and supported material extensions onto runtime objects.
{
    const supportedNames = [
        "KHR_mesh_quantization",
        "KHR_texture_transform",
        "KHR_materials_unlit",
        "KHR_materials_clearcoat",
        "KHR_materials_specular",
        "KHR_materials_sheen",
        "KHR_materials_iridescence",
        "KHR_materials_anisotropy",
        "KHR_materials_transmission",
        "KHR_materials_volume",
        "KHR_materials_diffuse_transmission",
        "KHR_materials_dispersion",
        "KHR_materials_ior",
        "KHR_materials_emissive_strength"
    ];
    const positions = new Int16Array([0, 0, 0, 2, 0, 0, 0, 2, 0]);
    const uv0 = new Float32Array([0, 0, 1, 0, 0, 1]);
    const uv1 = new Uint16Array([0, 0, 0, 65535, 65535, 0]);
    const posOffset = 0;
    const uv0Offset = positions.byteLength;
    const uv1Offset = uv0Offset + uv0.byteLength;
    const bin = new Uint8Array(uv1Offset + uv1.byteLength);
    copyBytes(bin, posOffset, positions);
    copyBytes(bin, uv0Offset, uv0);
    copyBytes(bin, uv1Offset, uv1);

    const gltfJson = {
        asset: { version: "2.0" },
        extensionsUsed: supportedNames,
        extensionsRequired: ["KHR_mesh_quantization"],
        buffers: [{ byteLength: bin.byteLength }],
        bufferViews: [
            { buffer: 0, byteOffset: posOffset, byteLength: positions.byteLength },
            { buffer: 0, byteOffset: uv0Offset, byteLength: uv0.byteLength },
            { buffer: 0, byteOffset: uv1Offset, byteLength: uv1.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5122, count: 3, type: "VEC3" },
            { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" },
            { bufferView: 2, componentType: 5123, normalized: true, count: 3, type: "VEC2" }
        ],
        images: [{ uri: "texture.png" }],
        textures: [{ source: 0 }],
        materials: [
            {
                name: "StandardLayer",
                doubleSided: true,
                alphaMode: "BLEND",
                pbrMetallicRoughness: {
                    baseColorFactor: [0.25, 0.5, 0.75, 0.6],
                    baseColorTexture: {
                        index: 0,
                        extensions: {
                            KHR_texture_transform: {
                                offset: [0.25, 0.5],
                                scale: [2, 3],
                                texCoord: 1
                            }
                        }
                    },
                    metallicFactor: 0.2,
                    roughnessFactor: 0.7
                },
                normalTexture: { index: 0, texCoord: 1 },
                extensions: {
                    KHR_materials_clearcoat: { clearcoatFactor: 0.6, clearcoatNormalTexture: { index: 0, scale: 0.75 } },
                    KHR_materials_specular: { specularFactor: 0.8, specularColorFactor: [0.7, 0.6, 0.5] },
                    KHR_materials_sheen: { sheenColorFactor: [0.25, 0.35, 0.45], sheenRoughnessFactor: 0.55 },
                    KHR_materials_iridescence: { iridescenceFactor: 0.65, iridescenceIor: 1.22, iridescenceThicknessMaximum: 430 },
                    KHR_materials_anisotropy: { anisotropyStrength: 0.7, anisotropyRotation: 0.33, anisotropyTexture: { index: 0, texCoord: 1 } },
                    KHR_materials_transmission: { transmissionFactor: 0.75 },
                    KHR_materials_volume: { thicknessFactor: 0.9, attenuationDistance: 12, attenuationColor: [0.4, 0.5, 0.6] },
                    KHR_materials_diffuse_transmission: { diffuseTransmissionFactor: 0.45, diffuseTransmissionColorFactor: [0.9, 0.8, 0.7] },
                    KHR_materials_dispersion: { dispersion: 0.55 },
                    KHR_materials_ior: { ior: 1.33 },
                    KHR_materials_emissive_strength: { emissiveStrength: 4 }
                }
            },
            {
                name: "UnlitMask",
                alphaMode: "MASK",
                alphaCutoff: 0.35,
                pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1] },
                extensions: { KHR_materials_unlit: {} }
            },
            {
                name: "TransmissionOnly",
                pbrMetallicRoughness: { baseColorFactor: [0.5, 0.6, 0.7, 1] },
                extensions: { KHR_materials_transmission: { transmissionFactor: 1 } }
            }
        ],
        meshes: [{
            primitives: [
                { attributes: { POSITION: 0, TEXCOORD_0: 1, TEXCOORD_1: 2 }, material: 0 },
                { attributes: { POSITION: 0, TEXCOORD_0: 1, TEXCOORD_1: 2 }, material: 1 },
                { attributes: { POSITION: 0, TEXCOORD_0: 1, TEXCOORD_1: 2 }, material: 2 }
            ]
        }],
        nodes: [{ mesh: 0 }],
        scenes: [{ nodes: [0] }],
        scene: 0
    };

    const res = importGltf(await loadGltf(makeGLB(gltfJson, bin.buffer), { resourceBaseUrl: "https://example.test/models/" }), { addToScene: false, computeMissingNormals: true });

    expectSupport(res.metadata, supportedNames, "supported");
    assert.equal(res.meshes.length, 3);

    const standardMesh = res.meshes[0];
    const unlitMesh = res.meshes[1];
    const transmissionMesh = res.meshes[2];

    assert.ok(standardMesh.material instanceof StandardMaterial);
    assert.ok(unlitMesh.material instanceof UnlitMaterial);
    assert.ok(transmissionMesh.material instanceof StandardMaterial);
    assert.equal(standardMesh.material.blendMode, "transparent");
    assert.equal(standardMesh.material.cullMode, "none");
    assert.equal(standardMesh.material.depthWrite, false);
    arraysApproxEqual(Array.from(standardMesh.geometry.positions), [0, 0, 0, 2, 0, 0, 0, 2, 0]);
    arraysApproxEqual(Array.from(standardMesh.geometry.uvs), Array.from(uv0));
    arraysApproxEqual(Array.from(standardMesh.geometry.uvs1), [0, 0, 0, 1, 1, 0]);
    assert.equal(standardMesh.material.baseColorTextureTransform.texCoord, 1);
    assert.deepEqual(standardMesh.material.baseColorTextureTransform.offset, [0.25, 0.5]);
    assert.deepEqual(standardMesh.material.baseColorTextureTransform.scale, [2, 3]);
    assert.equal(standardMesh.material.extensions.clearcoat.factor, 0.6);
    assert.equal(standardMesh.material.extensions.clearcoat.normalScale, 0.75);
    assert.equal(standardMesh.material.extensions.specular.factor, 0.8);
    assert.deepEqual(standardMesh.material.extensions.specular.color, [0.7, 0.6, 0.5]);
    assert.equal(standardMesh.material.extensions.sheen.roughness, 0.55);
    assert.equal(standardMesh.material.extensions.iridescence.factor, 0.65);
    assert.equal(standardMesh.material.extensions.iridescence.ior, 1.22);
    assert.equal(standardMesh.material.extensions.iridescence.thicknessMaximum, 430);
    assert.equal(standardMesh.material.extensions.anisotropy.strength, 0.7);
    numberApproxEqual(standardMesh.material.extensions.anisotropy.rotation, 0.33);
    assert.equal(standardMesh.material.extensions.transmission.factor, 0.75);
    assert.equal(standardMesh.material.extensions.volume.thicknessFactor, 0.9);
    assert.equal(standardMesh.material.extensions.volume.attenuationDistance, 12);
    assert.deepEqual(standardMesh.material.extensions.diffuseTransmission.color, [0.9, 0.8, 0.7]);
    assert.equal(standardMesh.material.extensions.dispersion.dispersion, 0.55);
    assert.equal(standardMesh.material.extensions.ior.ior, 1.33);
    assert.equal(standardMesh.material.extensions.emissiveStrength.strength, 4);

    assert.equal(unlitMesh.material.alphaCutoff, 0.35);
    assert.equal(unlitMesh.material.blendMode, "opaque");

    assert.equal(transmissionMesh.material.extensions.transmission.factor, 1);
    assert.equal(transmissionMesh.material.blendMode, "opaque");

    res.destroy();
}

// 3) Scene import respects the selected scene, preserves hierarchy, and cleans up scene ownership.
{
    const baseTransformCount = TransformStore.global().count;
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const gltfJson = {
        asset: { version: "2.0" },
        buffers: [{ byteLength: positions.byteLength }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        nodes: [
            { name: "UnusedSceneRoot", mesh: 0 },
            { name: "Parent", translation: [1, 2, 3], children: [2, 3] },
            { name: "ChildMesh", mesh: 0, translation: [4, 0, 0] },
            { name: "MatrixChild", matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 5, 0, 1] }
        ],
        scenes: [{ nodes: [0] }, { nodes: [1] }],
        scene: 1
    };

    const scene = new Scene();
    const res = importGltf(await loadGltf(makeGLB(gltfJson, positions.buffer)), { targetScene: scene, addToScene: true, computeMissingNormals: true });

    assert.equal(res.meshes.length, 1);
    assert.equal(scene.meshes.length, 1);
    assert.equal(res.meshes[0].name, "ChildMesh");
    arraysApproxEqual(res.meshes[0].transform.worldPosition, [5, 2, 3]);
    arraysApproxEqual(res.nodes[3].transform.worldPosition, [1, 7, 3]);
    assert.equal(res.nodes[2].parentIndex, 1);

    res.destroy();
    assert.equal(scene.meshes.length, 0);
    assert.equal(TransformStore.global().count, baseTransformCount);
}

// 4) Skin and morph import create runtime state and clip sampling updates mesh bounds.
{
    const baseTransformCount = TransformStore.global().count;
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const targetPositions = new Float32Array([0, 0, 0, 0, 0, 0, 0, 1, 0]);
    const joints = new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const weights = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    const times = new Float32Array([0, 1]);
    const morphWeights = new Float32Array([0, 1]);
    const posOffset = 0;
    const targetOffset = posOffset + positions.byteLength;
    const jointsOffset = targetOffset + targetPositions.byteLength;
    const weightsOffset = jointsOffset + joints.byteLength;
    const timesOffset = weightsOffset + weights.byteLength;
    const morphOffset = timesOffset + times.byteLength;
    const bin = new Uint8Array(morphOffset + morphWeights.byteLength);
    copyBytes(bin, posOffset, positions);
    copyBytes(bin, targetOffset, targetPositions);
    copyBytes(bin, jointsOffset, joints);
    copyBytes(bin, weightsOffset, weights);
    copyBytes(bin, timesOffset, times);
    copyBytes(bin, morphOffset, morphWeights);

    const gltfJson = {
        asset: { version: "2.0" },
        buffers: [{ byteLength: bin.byteLength }],
        bufferViews: [
            { buffer: 0, byteOffset: posOffset, byteLength: positions.byteLength },
            { buffer: 0, byteOffset: targetOffset, byteLength: targetPositions.byteLength },
            { buffer: 0, byteOffset: jointsOffset, byteLength: joints.byteLength },
            { buffer: 0, byteOffset: weightsOffset, byteLength: weights.byteLength },
            { buffer: 0, byteOffset: timesOffset, byteLength: times.byteLength },
            { buffer: 0, byteOffset: morphOffset, byteLength: morphWeights.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 2, componentType: 5123, count: 3, type: "VEC4" },
            { bufferView: 3, componentType: 5126, count: 3, type: "VEC4" },
            { bufferView: 4, componentType: 5126, count: 2, type: "SCALAR" },
            { bufferView: 5, componentType: 5126, count: 2, type: "SCALAR" }
        ],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 2, WEIGHTS_0: 3 }, targets: [{ POSITION: 1 }] }] }],
        skins: [{ joints: [0] }],
        nodes: [
            { name: "Joint" },
            { name: "SkinnedMorph", mesh: 0, skin: 0 }
        ],
        animations: [{
            name: "MorphWeight",
            samplers: [{ input: 4, output: 5 }],
            channels: [{ sampler: 0, target: { node: 1, path: "weights" } }]
        }],
        scenes: [{ nodes: [0, 1] }],
        scene: 0
    };

    const originalFreeF32 = wasm.freeF32;
    const freedF32 = [];
    let res;
    wasm.freeF32 = (ptr, len) => { freedF32.push([ptr, len]); originalFreeF32(ptr, len); };
    try {
        res = importGltf(await loadGltf(makeGLB(gltfJson, bin.buffer)), { addToScene: false, computeMissingNormals: true });

        assert.equal(res.skins.length, 1);
        assert.ok(res.skins[0].runtime);
        assert.equal(res.meshes.length, 1);
        assert.ok(res.meshes[0].skin);
        assert.equal(res.meshes[0].skin.jointCount, 1);
        assert.equal(res.meshes[0].skin.meshWorldMatrixPtr, res.meshes[0].transform.worldMatrixPtr);
        assert.equal(res.meshes[0].geometry.morphTargets.length, 1);
        assert.equal(res.clips.length, 1);

        const before = res.meshes[0].getLocalBounds();
        numberApproxEqual(before.boxMax[1], 1);
        res.clips[0].sample(1);
        const after = res.meshes[0].getLocalBounds();
        numberApproxEqual(after.boxMax[1], 2);
    } finally {
        wasm.freeF32 = originalFreeF32;
    }
    assert.ok(freedF32.filter(([, len]) => len === positions.length).length >= 9, "Imported and morphed geometry must release position, normal-output, and bounds scratch after every recomputation");

    const clip = res.clips[0];
    const skin = res.skins[0].runtime;
    const skinInstance = res.meshes[0].skin;
    res.destroy();
    assert.equal(clip.disposed, true);
    assert.equal(skin.disposed, true);
    assert.equal(skinInstance.disposed, true);
    assert.throws(() => clip.sample(0), /disposed/i, "Disposed animation clips must reject sampling");
    assert.throws(() => clip.samplersPtr, /disposed/i, "Disposed animation clips must reject Wasm pointer access");
    assert.throws(() => skin.jointIndicesPtr, /disposed/i, "Disposed skins must reject Wasm pointer access");
    assert.throws(() => skin.createInstance(res.nodes[1].transform), /disposed/i, "Disposed skins must reject new instances");
    assert.throws(() => skinInstance.meshWorldMatrixPtr, /disposed/i, "Disposed skin instances must reject Wasm pointer access");
    assert.doesNotThrow(() => res.destroy(), "Imported resource destruction must remain idempotent");
    assert.equal(TransformStore.global().count, baseTransformCount);
}

// 5) Lights, node visibility, and animation pointers update imported runtime objects as expected.
{
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const times = new Float32Array([0, 1]);
    const visibility = new Uint8Array([1, 0]);
    const clearcoat = new Float32Array([0, 0.8]);
    const intensity = new Float32Array([1, 5]);
    const chunks = [positions, times, visibility, clearcoat, intensity];
    let byteLength = 0;
    const offsets = chunks.map((chunk) => { const offset = byteLength; byteLength += pad4(chunk.byteLength); return offset; });
    const bin = new Uint8Array(byteLength);
    chunks.forEach((chunk, index) => copyBytes(bin, offsets[index], chunk));

    const gltfJson = {
        asset: { version: "2.0" },
        extensionsUsed: ["KHR_lights_punctual", "KHR_node_visibility", "KHR_animation_pointer", "KHR_materials_clearcoat"],
        extensions: {
            KHR_lights_punctual: {
                lights: [{ type: "point", intensity: 1, range: 9, color: [1, 1, 1] }]
            }
        },
        buffers: [{ byteLength: bin.byteLength }],
        bufferViews: chunks.map((chunk, index) => ({ buffer: 0, byteOffset: offsets[index], byteLength: chunk.byteLength })),
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
            { bufferView: 1, componentType: 5126, count: 2, type: "SCALAR" },
            { bufferView: 2, componentType: 5121, count: 2, type: "SCALAR" },
            { bufferView: 3, componentType: 5126, count: 2, type: "SCALAR" },
            { bufferView: 4, componentType: 5126, count: 2, type: "SCALAR" }
        ],
        materials: [{ extensions: { KHR_materials_clearcoat: { clearcoatFactor: 0 } } }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
        nodes: [
            { name: "HiddenParent", children: [1, 2], extensions: { KHR_node_visibility: { visible: false } } },
            { name: "MeshChild", mesh: 0, extensions: { KHR_node_visibility: { visible: true } } },
            { name: "LightChild", extensions: { KHR_lights_punctual: { light: 0 }, KHR_node_visibility: { visible: true } } }
        ],
        animations: [{
            name: "RuntimePointer",
            samplers: [
                { input: 1, output: 2, interpolation: "STEP" },
                { input: 1, output: 3 },
                { input: 1, output: 4 }
            ],
            channels: [
                { sampler: 0, target: { path: "pointer", extensions: { KHR_animation_pointer: { pointer: "/nodes/1/extensions/KHR_node_visibility/visible" } } } },
                { sampler: 1, target: { path: "pointer", extensions: { KHR_animation_pointer: { pointer: "/materials/0/extensions/KHR_materials_clearcoat/clearcoatFactor" } } } },
                { sampler: 2, target: { path: "pointer", extensions: { KHR_animation_pointer: { pointer: "/extensions/KHR_lights_punctual/lights/0/intensity" } } } }
            ]
        }],
        scenes: [{ nodes: [0] }],
        scene: 0
    };

    const res = importGltf(await loadGltf(makeGLB(gltfJson, bin.buffer)), { addToScene: false, computeMissingNormals: true, importLights: true });

    expectSupport(res.metadata, ["KHR_lights_punctual", "KHR_node_visibility", "KHR_animation_pointer"], "supported");
    assert.equal(res.lights.length, 1);
    assert.equal(res.lights[0].type, "point");
    assert.equal(res.lights[0].range, 9);
    assert.equal(res.meshes[0].visible, false);
    assert.equal(res.lights[0].enabled, false);

    res.nodes[0].visible = true;
    assert.equal(res.meshes[0].visible, true);
    assert.equal(res.lights[0].enabled, true);

    res.clips[0].sample(1);
    assert.equal(res.meshes[0].visible, false);
    numberApproxEqual(res.meshes[0].material.extensions.clearcoat.factor, 0.8);
    assert.equal(res.lights[0].intensity, 5);

    res.destroy();
}

// 6) Variants and XMP metadata preserve importer provenance and material switching state.
{
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const gltfJson = {
        asset: {
            version: "2.0",
            extensions: { KHR_xmp_json_ld: { packet: 0 } }
        },
        extensionsUsed: ["KHR_materials_variants", "KHR_xmp_json_ld"],
        extensions: {
            KHR_xmp_json_ld: {
                packets: [
                    { id: "asset-packet" },
                    { id: "node-packet" }
                ]
            },
            KHR_materials_variants: {
                variants: [{ name: "Green", extras: { swatch: "green" } }]
            }
        },
        buffers: [{ byteLength: positions.byteLength }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
        materials: [
            { pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1] } },
            { pbrMetallicRoughness: { baseColorFactor: [0, 1, 0, 1] } }
        ],
        meshes: [{
            extras: { meshTag: "variant" },
            primitives: [{
                attributes: { POSITION: 0 },
                material: 0,
                extras: { primitiveTag: "variant-slot" },
                extensions: {
                    KHR_materials_variants: {
                        mappings: [{ material: 1, variants: [0] }]
                    }
                }
            }]
        }],
        nodes: [{
            mesh: 0,
            name: "VariantNode",
            extras: { nodeTag: "variant-node" },
            extensions: { KHR_xmp_json_ld: { packet: 1 } }
        }],
        scenes: [{ nodes: [0] }],
        scene: 0
    };

    const res = importGltf(await loadGltf(makeGLB(gltfJson, positions.buffer)), { addToScene: false, computeMissingNormals: true });

    expectSupport(res.metadata, ["KHR_materials_variants", "KHR_xmp_json_ld"], "supported");
    assert.deepEqual(res.metadata.xmp.packet, { id: "asset-packet" });
    assert.equal(res.metadata.nodes[0].extras.nodeTag, "variant-node");
    assert.deepEqual(res.metadata.nodes[0].xmp, { id: "node-packet" });
    assert.equal(res.metadata.meshes[0].primitives[0].extras.primitiveTag, "variant-slot");
    assert.deepEqual(res.metadata.variants.names, ["Green"]);
    assert.equal(res.metadata.variants.items[0].extras.swatch, "green");
    assert.deepEqual(res.meshes[0].material.color, [1, 0, 0]);

    res.metadata.variants.setActive("Green");
    assert.equal(res.metadata.variants.activeName, "Green");
    assert.deepEqual(res.meshes[0].material.color, [0, 1, 0]);

    res.metadata.variants.clear();
    assert.equal(res.metadata.variants.activeName, null);
    assert.deepEqual(res.meshes[0].material.color, [1, 0, 0]);

    res.destroy();
}

// 7) KHR_gaussian_splatting imports supported point primitives as native SplatField objects.
{
    const baseTransformCount = TransformStore.global().count;
    const extensionName = "KHR_gaussian_splatting";
    const meshPositions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const splatPositions = new Float32Array([0, 0, 0, 1, 2, 3, 4, 5, 6]);
    const rotations = new Int16Array([0, 0, 0, 32767, 0, 0, 0, 32767, 0, 0, 0, 32767]);
    const scales = new Uint16Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const opacities = new Uint8Array([128, 255, 64]);
    const makeCoeff = (base) => new Float32Array(Array.from({ length: 9 }, (_, i) => base + i / 100));
    const sh0 = makeCoeff(0.1), sh10 = makeCoeff(1.1), sh11 = makeCoeff(1.2), sh12 = makeCoeff(1.3), sh20 = makeCoeff(2.1), sh21 = makeCoeff(2.2), sh22 = makeCoeff(2.3), sh23 = makeCoeff(2.4), sh24 = makeCoeff(2.5), sh30 = makeCoeff(3.1), sh31 = makeCoeff(3.2), sh32 = makeCoeff(3.3), sh33 = makeCoeff(3.4), sh34 = makeCoeff(3.5), sh35 = makeCoeff(3.6), sh36 = makeCoeff(3.7);
    const shCoeffEntries = [["KHR_gaussian_splatting:SH_DEGREE_0_COEF_0", sh0], ["KHR_gaussian_splatting:SH_DEGREE_1_COEF_0", sh10], ["KHR_gaussian_splatting:SH_DEGREE_1_COEF_1", sh11], ["KHR_gaussian_splatting:SH_DEGREE_1_COEF_2", sh12], ["KHR_gaussian_splatting:SH_DEGREE_2_COEF_0", sh20], ["KHR_gaussian_splatting:SH_DEGREE_2_COEF_1", sh21], ["KHR_gaussian_splatting:SH_DEGREE_2_COEF_2", sh22], ["KHR_gaussian_splatting:SH_DEGREE_2_COEF_3", sh23], ["KHR_gaussian_splatting:SH_DEGREE_2_COEF_4", sh24], ["KHR_gaussian_splatting:SH_DEGREE_3_COEF_0", sh30], ["KHR_gaussian_splatting:SH_DEGREE_3_COEF_1", sh31], ["KHR_gaussian_splatting:SH_DEGREE_3_COEF_2", sh32], ["KHR_gaussian_splatting:SH_DEGREE_3_COEF_3", sh33], ["KHR_gaussian_splatting:SH_DEGREE_3_COEF_4", sh34], ["KHR_gaussian_splatting:SH_DEGREE_3_COEF_5", sh35], ["KHR_gaussian_splatting:SH_DEGREE_3_COEF_6", sh36]];
    const shAttributeAccessors = Object.fromEntries(shCoeffEntries.map(([semantic], index) => [semantic, 5 + index]));
    const shDegreeAttributes = (degree) => Object.fromEntries(shCoeffEntries.filter(([semantic]) => semantic.includes(`SH_DEGREE_${degree}_`)).map(([semantic]) => [semantic, shAttributeAccessors[semantic]]));
    const packSH = (sourceOrder) => { const out = []; for (const sourceIndex of sourceOrder) { const base = sourceIndex * 3; for (const [, coeff] of shCoeffEntries) out.push(coeff[base], coeff[base + 1], coeff[base + 2]); } return out; };
    const indices = new Uint16Array([2, 0]);
    const badPositions = new Int16Array([0, 0, 0, 1, 2, 3, 4, 5, 6]);
    const negativeScales = new Float32Array([1, 1, 1, 2, -0.5, 2, 3, 3, 3]);
    const nonFiniteScales = new Float32Array([1, 1, 1, 2, Number.NaN, 2, 3, 3, 3]);
    const opacityLow = new Float32Array([0.5, -0.1, 1]);
    const opacityHigh = new Float32Array([0.5, 1.1, 1]);
    const opacityNonFinite = new Float32Array([0.5, Number.NaN, 1]);
    const badIndices = new Uint16Array([3]);
    const INDEX_ACCESSOR = 5 + shCoeffEntries.length;
    const BAD_POSITION_ACCESSOR = INDEX_ACCESSOR + 1, NEGATIVE_SCALE_ACCESSOR = INDEX_ACCESSOR + 2, NONFINITE_SCALE_ACCESSOR = INDEX_ACCESSOR + 3, OPACITY_LOW_ACCESSOR = INDEX_ACCESSOR + 4, OPACITY_HIGH_ACCESSOR = INDEX_ACCESSOR + 5, OPACITY_NONFINITE_ACCESSOR = INDEX_ACCESSOR + 6, BAD_INDICES_ACCESSOR = INDEX_ACCESSOR + 7;
    const chunks = [meshPositions, splatPositions, rotations, scales, opacities, ...shCoeffEntries.map(([, coeff]) => coeff), indices, badPositions, negativeScales, nonFiniteScales, opacityLow, opacityHigh, opacityNonFinite, badIndices];
    let byteLength = 0;
    const offsets = chunks.map((chunk) => { const offset = byteLength; byteLength += pad4(chunk.byteLength); return offset; });
    const bin = new Uint8Array(byteLength);
    chunks.forEach((chunk, index) => copyBytes(bin, offsets[index], chunk));
    const bufferViews = chunks.map((chunk, index) => ({ buffer: 0, byteOffset: offsets[index], byteLength: chunk.byteLength }));
    const accessors = [
        { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
        { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" },
        { bufferView: 2, componentType: 5122, normalized: true, count: 3, type: "VEC4" },
        { bufferView: 3, componentType: 5123, count: 3, type: "VEC3" },
        { bufferView: 4, componentType: 5121, normalized: true, count: 3, type: "SCALAR" },
        ...shCoeffEntries.map((_, index) => ({ bufferView: 5 + index, componentType: 5126, count: 3, type: "VEC3" })),
        { bufferView: INDEX_ACCESSOR, componentType: 5123, count: 2, type: "SCALAR" },
        { bufferView: BAD_POSITION_ACCESSOR, componentType: 5122, count: 3, type: "VEC3" },
        { bufferView: NEGATIVE_SCALE_ACCESSOR, componentType: 5126, count: 3, type: "VEC3" },
        { bufferView: NONFINITE_SCALE_ACCESSOR, componentType: 5126, count: 3, type: "VEC3" },
        { bufferView: OPACITY_LOW_ACCESSOR, componentType: 5126, count: 3, type: "SCALAR" },
        { bufferView: OPACITY_HIGH_ACCESSOR, componentType: 5126, count: 3, type: "SCALAR" },
        { bufferView: OPACITY_NONFINITE_ACCESSOR, componentType: 5126, count: 3, type: "SCALAR" },
        { bufferView: BAD_INDICES_ACCESSOR, componentType: 5123, count: 1, type: "SCALAR" }
    ];
    const requiredSplatAttributes = { POSITION: 1, "KHR_gaussian_splatting:ROTATION": 2, "KHR_gaussian_splatting:SCALE": 3, "KHR_gaussian_splatting:OPACITY": 4, "KHR_gaussian_splatting:SH_DEGREE_0_COEF_0": 5 };
    const baseSplatAttributes = { ...requiredSplatAttributes, ...shDegreeAttributes(1), ...shDegreeAttributes(2), ...shDegreeAttributes(3) };
    const baseExtension = { kernel: "ellipse", colorSpace: "lin_rec709_display" };
    const makeSplatPrimitive = (extension = baseExtension, attrs = {}, mode = 0, indicesAccessor = undefined) => ({ mode, material: 0, ...(indicesAccessor !== undefined ? { indices: indicesAccessor } : {}), attributes: { ...baseSplatAttributes, ...attrs }, extensions: { KHR_gaussian_splatting: extension } });
    const makeSplatJson = (primitive, required = true, includeMeshPrimitive = false) => ({
        asset: { version: "2.0" }, extensionsUsed: [extensionName],
        ...(required ? { extensionsRequired: [extensionName] } : {}),
        buffers: [{ byteLength: bin.byteLength }], bufferViews, accessors, textures: [{}],
        materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0, texCoord: 7 } } }],
        meshes: [{ name: "MixedGaussian", primitives: includeMeshPrimitive ? [{ attributes: { POSITION: 0 } }, primitive] : [primitive] }],
        nodes: [{ name: "MixedNode", mesh: 0, translation: [1, 2, 3] }],
        scenes: [{ nodes: [0] }], scene: 0
    });

    const scene = new Scene();
    const warnings = [];
    const res = importGltf(await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive(), true, true), bin.buffer)), { targetScene: scene, addToScene: true, onWarning: (message) => warnings.push(message) });

    expectSupport(res.metadata, [extensionName], "supported");
    assert.equal(warnings.length, 0);
    assert.equal(res.meshes.length, 1);
    assert.equal(res.splatFields.length, 1);
    assert.equal(scene.meshes.length, 1);
    assert.equal(scene.splatFields.length, 1);
    assert.equal(res.nodes[0].meshes.length, 1);
    assert.equal(res.nodes[0].splatFields.length, 1);
    assert.ok(res.splatFields[0] instanceof SplatField);
    assert.equal(res.splatFields[0].splatCount, 3);
    assert.equal(res.splatFields[0].colorSpace, "linear");
    assert.equal(res.splatFields[0].usesSphericalHarmonics, true);
    assert.equal(res.splatFields[0].shDegree, 3);
    arraysApproxEqual(res.splatFields[0].transform.worldPosition, [1, 2, 3]);
    arraysApproxEqual(Array.from(res.splatFields[0]._centerOpacityCPU), [0, 0, 0, 128 / 255, 1, 2, 3, 1, 4, 5, 6, 64 / 255]);
    arraysApproxEqual(Array.from(res.splatFields[0]._rotationCPU), [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    arraysApproxEqual(Array.from(res.splatFields[0]._scaleCPU), [1, 2, 3, 0, 4, 5, 6, 0, 7, 8, 9, 0]);
    arraysApproxEqual(Array.from(res.splatFields[0]._shCPU), packSH([0, 1, 2]));
    arraysApproxEqual(Array.from(res.splatFields[0]._colorCPU), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    res.nodes[0].visible = false;
    assert.equal(res.meshes[0].visible, false);
    assert.equal(res.splatFields[0].visible, false);

    res.destroy();
    assert.equal(scene.meshes.length, 0);
    assert.equal(scene.splatFields.length, 0);
    assert.equal(TransformStore.global().count, baseTransformCount);

    const indexedRes = importGltf(await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive(baseExtension, {}, 0, INDEX_ACCESSOR)), bin.buffer)), { addToScene: false });
    assert.equal(indexedRes.splatFields.length, 1);
    assert.equal(indexedRes.splatFields[0].splatCount, indices.length);
    assert.equal(indexedRes.splatFields[0].usesSphericalHarmonics, true);
    assert.equal(indexedRes.splatFields[0].shDegree, 3);
    arraysApproxEqual(Array.from(indexedRes.splatFields[0]._centerOpacityCPU), [4, 5, 6, 64 / 255, 0, 0, 0, 128 / 255]);
    arraysApproxEqual(Array.from(indexedRes.splatFields[0]._shCPU), packSH([2, 0]));
    indexedRes.destroy();

    const srgbWarnings = [];
    const srgbRes = importGltf(await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive({ kernel: "ellipse", colorSpace: "srgb_rec709_display" })), bin.buffer)), { addToScene: false, onWarning: (message) => srgbWarnings.push(message) });
    expectSupport(srgbRes.metadata, [extensionName], "supported");
    assert.equal(srgbWarnings.length, 0);
    assert.equal(srgbRes.splatFields[0].colorSpace, "srgb");
    assert.equal(srgbRes.splatFields[0].usesSphericalHarmonics, true);
    assert.equal(srgbRes.splatFields[0].shDegree, 3);
    srgbRes.destroy();

    const outOfRangeIndexDoc = await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive(baseExtension, {}, 0, BAD_INDICES_ACCESSOR)), bin.buffer));
    assert.throws(() => importGltf(outOfRangeIndexDoc, { addToScene: false }), /indices\[0\] value 3 is out of range/);
    const strictPositionDoc = await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive(baseExtension, { POSITION: BAD_POSITION_ACCESSOR })), bin.buffer));
    assert.throws(() => importGltf(strictPositionDoc, { addToScene: false }), /POSITION.*componentType=5122/);
    const negativeScaleDoc = await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive(baseExtension, { "KHR_gaussian_splatting:SCALE": NEGATIVE_SCALE_ACCESSOR })), bin.buffer));
    assert.throws(() => importGltf(negativeScaleDoc, { addToScene: false }), /SCALE.*negative value/);
    const nonFiniteScaleDoc = await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive(baseExtension, { "KHR_gaussian_splatting:SCALE": NONFINITE_SCALE_ACCESSOR })), bin.buffer));
    assert.throws(() => importGltf(nonFiniteScaleDoc, { addToScene: false }), /SCALE.*non-finite value/);
    const opacityLowDoc = await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive(baseExtension, { "KHR_gaussian_splatting:OPACITY": OPACITY_LOW_ACCESSOR })), bin.buffer));
    assert.throws(() => importGltf(opacityLowDoc, { addToScene: false }), /OPACITY.*outside \[0, 1\]/);
    const opacityHighDoc = await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive(baseExtension, { "KHR_gaussian_splatting:OPACITY": OPACITY_HIGH_ACCESSOR })), bin.buffer));
    assert.throws(() => importGltf(opacityHighDoc, { addToScene: false }), /OPACITY.*outside \[0, 1\]/);
    const opacityNonFiniteDoc = await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive(baseExtension, { "KHR_gaussian_splatting:OPACITY": OPACITY_NONFINITE_ACCESSOR })), bin.buffer));
    assert.throws(() => importGltf(opacityNonFiniteDoc, { addToScene: false }), /OPACITY.*non-finite value/);

    for (const unsupportedExtension of [{ kernel: "box", colorSpace: "lin_rec709_display" }, { kernel: "ellipse", colorSpace: "lin_rec709_display", projection: "orthographic" }, { kernel: "ellipse", colorSpace: "lin_rec709_display", sortingMethod: "none" }]) {
        const optionalWarnings = [];
        const optionalRes = importGltf(await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive(unsupportedExtension), false), bin.buffer)), { addToScene: false, onWarning: (message) => optionalWarnings.push(message) });
        expectSupport(optionalRes.metadata, [extensionName], "partial");
        assert.equal(optionalRes.splatFields.length, 0);
        assert.ok(optionalWarnings.some((message) => message.includes("skipping primitive")));
        assert.ok(optionalWarnings.some((message) => message.includes("optional sparse point-cloud fallback conversion")));
        optionalRes.destroy();
    }

    const requiredUnsupportedDoc = await loadGltf(makeGLB(makeSplatJson(makeSplatPrimitive({ kernel: "box", colorSpace: "lin_rec709_display" })), bin.buffer));
    assert.throws(() => importGltf(requiredUnsupportedDoc, { addToScene: false }), /kernel 'box' is not supported/);

    const missingOpacityPrimitive = makeSplatPrimitive(baseExtension, { "KHR_gaussian_splatting:OPACITY": undefined });
    const missingOpacityDoc = await loadGltf(makeGLB(makeSplatJson(missingOpacityPrimitive), bin.buffer));
    assert.throws(() => importGltf(missingOpacityDoc, { addToScene: false }), /missing required attribute 'KHR_gaussian_splatting:OPACITY'/);
}

// 8) Deferred extensions report deferred support and preserve the current fallback and error paths.
{
    const deferredNames = [
        "KHR_draco_mesh_compression",
        "KHR_texture_basisu",
        "EXT_mesh_gpu_instancing",
        "EXT_meshopt_compression",
        "EXT_texture_webp"
    ];
    const deferredWarnings = [];
    const deferredJson = {
        asset: { version: "2.0" },
        extensionsUsed: deferredNames,
        meshes: [{ name: "DeferredMesh", primitives: [{ extensions: { KHR_draco_mesh_compression: {} } }] }],
        nodes: [{ mesh: 0 }],
        scenes: [{ nodes: [0] }],
        scene: 0
    };

    const deferredRes = importGltf(await loadGltf(makeGLB(deferredJson, new Uint8Array(0).buffer)), { addToScene: false, onWarning: (message) => deferredWarnings.push(message) });

    expectSupport(deferredRes.metadata, deferredNames, "deferred");
    assert.equal(deferredRes.meshes.length, 0);
    assert.ok(deferredWarnings.some((message) => message.includes("KHR_draco_mesh_compression has no usable uncompressed core POSITION")));
    deferredRes.destroy();

    const meshoptDoc = {
        json: {
            asset: { version: "2.0" },
            extensionsUsed: ["EXT_meshopt_compression"],
            buffers: [{ byteLength: 0 }],
            bufferViews: [{
                buffer: 0,
                byteOffset: 0,
                byteLength: 0,
                extensions: { EXT_meshopt_compression: {} }
            }],
            accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: "SCALAR" }]
        },
        buffers: [new ArrayBuffer(0)],
        resourceBaseUrl: ""
    };
    assert.throws(() => readAccessorAsFloat32(meshoptDoc, 0), /Invalid|offset|length/i);
    const meshoptFallbackWarnings = [];
    const meshoptFallback = importGltf({
        ...meshoptDoc,
        json: {
            ...meshoptDoc.json,
            meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
            nodes: [{ mesh: 0 }],
            scenes: [{ nodes: [0] }],
            scene: 0
        }
    }, { addToScene: false, onWarning: (message) => meshoptFallbackWarnings.push(message) });
    assert.equal(meshoptFallback.meshes.length, 0);
    assert.ok(meshoptFallbackWarnings.some((message) => message.includes("EXT_meshopt_compression") && message.includes("no usable uncompressed core")));
    meshoptFallback.destroy();
}

// 9) Failed animation import releases allocations accumulated before the error.
{
    const baseTransformCount = TransformStore.global().count;
    const times = new Float32Array([0, 1]);
    const values = new Float32Array([0, 1]);
    const bin = new Uint8Array(times.byteLength + values.byteLength);
    copyBytes(bin, 0, times);
    copyBytes(bin, times.byteLength, values);
    const doc = await loadGltf(makeGLB({
        asset: { version: "2.0" },
        buffers: [{ byteLength: bin.byteLength }],
        bufferViews: [
            { buffer: 0, byteOffset: 0, byteLength: times.byteLength },
            { buffer: 0, byteOffset: times.byteLength, byteLength: values.byteLength }
        ],
        accessors: [
            { bufferView: 0, componentType: 5126, count: 2, type: "SCALAR" },
            { bufferView: 1, componentType: 5126, count: 2, type: "SCALAR" }
        ],
        animations: [{
            samplers: [{ input: 0, output: 1 }, { input: 99, output: 1 }],
            channels: []
        }],
        nodes: [{}],
        scenes: [{ nodes: [0] }],
        scene: 0
    }, bin.buffer));
    const originalFreeF32 = wasm.freeF32;
    const originalFreeU32 = wasm.freeU32;
    const freedF32 = [];
    const freedU32 = [];
    wasm.freeF32 = (ptr, len) => { freedF32.push([ptr, len]); originalFreeF32(ptr, len); };
    wasm.freeU32 = (ptr, len) => { freedU32.push([ptr, len]); originalFreeU32(ptr, len); };
    try {
        assert.throws(() => importGltf(doc, { addToScene: false }), /Invalid accessor index: 99/);
    } finally {
        wasm.freeF32 = originalFreeF32;
        wasm.freeU32 = originalFreeU32;
    }
    assert.equal(freedF32.filter(([, len]) => len === 2).length, 2, "Failed animation import must free its uploaded times and values");
    assert.ok(freedU32.some(([, len]) => len === 10), "Failed animation import must free its sampler table");
    assert.equal(TransformStore.global().count, baseTransformCount, "Failed import must dispose node transforms created before animation parsing");
}

// 10) glTF compatibility validation accepts supported roots and rejects invalid source versions.
{
    const supported = { asset: { version: "2.0" }, buffers: [] };
    const futureMinor = await loadGltf(jsonBytes({ asset: { version: "2.10" }, buffers: [] }));
    assert.equal(futureMinor.json.asset.version, "2.10");
    const supportedMinimum = await loadGltf(jsonBytes({ asset: { version: "2.10", minVersion: "2.0" }, buffers: [] }));
    assert.equal(supportedMinimum.json.asset.minVersion, "2.0");
    for (const invalid of [
        {},
        { asset: {} },
        { asset: { version: "2" } },
        { asset: { version: "2.0.0" } },
        { asset: { version: "1.0" } },
        { asset: { version: "3.0" } },
        { asset: { version: "2.0", minVersion: "2.1" } },
        { asset: { version: "2.0", minVersion: "2.0.1" } },
        { asset: { version: "2.0", minVersion: "2.10" } }
    ]) {
        await assert.rejects(() => loadGltf(jsonBytes(invalid)), /glTF|asset|version/i);
    }
    const before = TransformStore.global().count;
    assert.throws(() => importGltf({ json: { asset: { version: "1.0" } }, buffers: [], resourceBaseUrl: "" }, { addToScene: false }), /Unsupported glTF asset version 1\.0/);
    assert.equal(TransformStore.global().count, before);

    const glbVersionError = makeGLB({ asset: { version: "1.0" } }, new ArrayBuffer(0));
    await assert.rejects(() => loadGltf(glbVersionError), /Unsupported glTF asset version 1\.0/);

    for (const requestedUrl of [
        "https://example.test/model.glb?v=1",
        "https://example.test/model.glb#fragment",
        "https://example.test/content-addressed/8f2a",
        "https://example.test/model.gltf"
    ]) {
        let rootFetches = 0;
        const glb = makeGLB(supported, new ArrayBuffer(0));
        const doc = await loadGltf(requestedUrl, {
            fetch: async (input) => { rootFetches++; assert.equal(String(input), requestedUrl); return mockResponse(glb, requestedUrl); }
        });
        assert.equal(rootFetches, 1);
        assert.equal(doc.json.asset.version, "2.0");
    }
    let extensionlessJsonFetches = 0;
    const extensionlessJson = await loadGltf("https://example.test/content-addressed/json", {
        fetch: async () => { extensionlessJsonFetches++; return mockResponse(jsonBytes(supported)); }
    });
    assert.equal(extensionlessJsonFetches, 1);
    assert.equal(extensionlessJson.json.asset.version, "2.0");
    let invalidRootFetches = 0;
    await assert.rejects(() => loadGltf("https://example.test/binary", {
        fetch: async () => { invalidRootFetches++; return mockResponse(new Uint8Array([0xff, 0xfe, 0xfd]).buffer); }
    }), /Invalid glTF source.*UTF-8|JSON/i);
    assert.equal(invalidRootFetches, 1);

    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const redirectedJson = {
        asset: { version: "2.0" },
        buffers: [{ uri: "../data/positions.bin", byteLength: positions.byteLength }]
    };
    const requested = "https://example.test/requested/model.gltf?sig=1";
    const calls = [];
    const redirected = await loadGltf(requested, {
        fetch: async (input) => {
            calls.push(String(input));
            if (calls.length === 1) return mockResponse(jsonBytes(redirectedJson), "https://cdn.test/final/scenes/model.gltf?sig=2#ignored");
            return mockResponse(positions.buffer, "https://cdn.test/final/data/positions.bin");
        }
    });
    assert.deepEqual(calls, [requested, "https://cdn.test/final/data/positions.bin"]);
    assert.equal(redirected.resourceBaseUrl, "https://cdn.test/final/scenes/model.gltf?sig=2#ignored");
}

// 11) URI resolution and data URLs preserve web-reference and octet semantics.
{
    assert.equal(isDataUri("DATA:text/plain,hello"), true);
    assert.equal(resolveUri("https://host/a/model.gltf", "../b.bin"), "https://host/b.bin");
    assert.equal(resolveUri("https://host/a/", "./b.bin"), "https://host/a/b.bin");
    assert.equal(resolveUri("https://host/a/", "/b.bin"), "https://host/b.bin");
    assert.equal(resolveUri("https://host/a/", "//cdn.test/b.bin"), "https://cdn.test/b.bin");
    assert.equal(resolveUri("https://host/a/model.gltf?sig=1#x", "?part=buffer"), "https://host/a/model.gltf?part=buffer");
    assert.equal(resolveUri("https://host/a/model.gltf?sig=1#x", "#part"), "https://host/a/model.gltf?sig=1#part");
    assert.equal(resolveUri("https://host/a/model.gltf?sig=1#x", "b.bin"), "https://host/a/b.bin");
    assert.equal(resolveUri("models/scenes/", "../b.bin"), "models/b.bin");
    assert.equal(resolveUri("models/scenes/", "./nested/../b.bin"), "models/scenes/b.bin");
    assert.equal(resolveUri("/models/scenes/", "../b.bin"), "/models/b.bin");
    assert.equal(resolveUri("models/scenes/", "//cdn.test/b.bin"), "//cdn.test/b.bin");
    assert.equal(resolveUri("https://host/a/", "file:///tmp/b.bin"), "file:///tmp/b.bin");
    assert.equal(resolveUri("https://host/a/", "blob:https://host/id"), "blob:https://host/id");
    assert.equal(resolveUri("https://host/a/", "data:application/octet-stream,%00"), "data:application/octet-stream,%00");
    assert.equal(resolveUri("anything", "custom+asset:abc"), "custom+asset:abc");
    assert.equal(resolveUri("custom+asset://host/a/model.gltf", "../b.bin"), "custom+asset://host/b.bin");
    assert.equal(dirnameUrl("https://host/a/model.gltf?sig=1#x"), "https://host/a/");

    const raw = decodeDataUri("data:application/octet-stream,%00%2B,%7F%80%FF+");
    assert.deepEqual(Array.from(new Uint8Array(raw.data)), [0x00, 0x2b, 0x2c, 0x7f, 0x80, 0xff, 0x2b]);
    assert.deepEqual(Array.from(new Uint8Array(decodeDataUri("data:application/octet-stream,%C3%A9é").data)), [0xc3, 0xa9, 0xc3, 0xa9]);
    const media = decodeDataUri("data:image/png;charset=utf-8;foo=bar,abc");
    assert.equal(media.mimeType, "image/png;charset=utf-8;foo=bar");
    assert.equal(decodeDataUri("data:;charset=utf-8,abc").mimeType, null);
    assert.throws(() => decodeDataUri("data:;not-a-parameter,abc"), /invalid media type parameter/i);
    const base64 = decodeDataUri("DaTa:TEXT/PLAIN;CHARSET=UTF-8;BaSe64,SGVsbG8%3D");
    assert.equal(base64.mimeType, "TEXT/PLAIN;CHARSET=UTF-8");
    assert.deepEqual(Array.from(new Uint8Array(base64.data)), Array.from(new TextEncoder().encode("Hello")));
    assert.throws(() => decodeDataUri("data:application/octet-stream,%0"), /malformed percent escape/i);
    assert.throws(() => decodeDataUri("data:;base64,not base64"), /invalid base64/i);
}

// 12) Required-extension preflight is strict and optional core fallbacks remain usable.
{
    const requiredNames = [
        "VENDOR_unknown",
        "KHR_draco_mesh_compression",
        "KHR_texture_basisu",
        "EXT_mesh_gpu_instancing",
        "EXT_meshopt_compression",
        "EXT_texture_webp"
    ];
    for (const name of requiredNames) {
        const before = TransformStore.global().count;
        assert.throws(() => importGltf({ json: { asset: { version: "2.0" }, extensionsUsed: [name], extensionsRequired: [name] }, buffers: [], resourceBaseUrl: "" }, { addToScene: false }), new RegExp(`Required glTF extension '${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
        assert.equal(TransformStore.global().count, before);
    }

    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const coreJson = {
        asset: { version: "2.0" },
        extensionsUsed: ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "EXT_mesh_gpu_instancing", "VENDOR_optional"],
        buffers: [{ byteLength: positions.byteLength }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength, extensions: { EXT_meshopt_compression: { byteOffset: 0, byteLength: positions.byteLength } } }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, extensions: { KHR_draco_mesh_compression: {} } }] }],
        nodes: [{ mesh: 0, extensions: { EXT_mesh_gpu_instancing: {} } }],
        scenes: [{ nodes: [0] }],
        scene: 0
    };
    const warnings = [];
    const fallback = importGltf({ json: coreJson, buffers: [positions.buffer], resourceBaseUrl: "" }, { addToScene: false, onWarning: (message) => warnings.push(message) });
    assert.equal(fallback.meshes.length, 1);
    expectSupport(fallback.metadata, ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "EXT_mesh_gpu_instancing"], "deferred");
    expectSupport(fallback.metadata, ["VENDOR_optional"], "unsupported");
    assert.ok(warnings.some((message) => message.includes("uncompressed core primitive")));
    assert.ok(warnings.some((message) => message.includes("EXT_mesh_gpu_instancing") && message.includes("single core node instance")));
    fallback.destroy();

    const specGlossWarnings = [];
    const specGloss = importGltf({
        json: {
            asset: { version: "2.0" },
            extensionsUsed: ["KHR_materials_pbrSpecularGlossiness"],
            extensionsRequired: ["KHR_materials_pbrSpecularGlossiness"],
            buffers: [{ byteLength: positions.byteLength }],
            bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
            accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
            materials: [{ extensions: { KHR_materials_pbrSpecularGlossiness: { diffuseFactor: [0.25, 0.5, 0.75, 0.8], glossinessFactor: 0.2 } } }],
            meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
            nodes: [{ mesh: 0 }],
            scenes: [{ nodes: [0] }],
            scene: 0
        },
        buffers: [positions.buffer],
        resourceBaseUrl: ""
    }, { addToScene: false, onWarning: (message) => specGlossWarnings.push(message) });
    expectSupport(specGloss.metadata, ["KHR_materials_pbrSpecularGlossiness"], "partial");
    assert.equal(specGloss.meshes.length, 1);
    assert.ok(specGloss.meshes[0].material instanceof StandardMaterial);
    arraysApproxEqual(specGloss.meshes[0].material.color, [0.25, 0.5, 0.75]);
    numberApproxEqual(specGloss.meshes[0].material.opacity, 0.8);
    numberApproxEqual(specGloss.meshes[0].material.metallic, 0);
    numberApproxEqual(specGloss.meshes[0].material.roughness, 0.8);
    assert.ok(specGlossWarnings.some((message) => message.includes("Required glTF extension") && message.includes("only partially supported")));
    assert.ok(specGlossWarnings.some((message) => message.includes("approximating using diffuse as baseColor")));
    specGloss.destroy();

    const optionalMeshopt = {
        json: { asset: { version: "2.0" }, extensionsUsed: ["EXT_meshopt_compression"], buffers: [{ byteLength: positions.byteLength }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength, extensions: { EXT_meshopt_compression: {} } }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }] },
        buffers: [positions.buffer],
        resourceBaseUrl: ""
    };
    arraysApproxEqual(Array.from(readAccessorAsFloat32(optionalMeshopt, 0)), Array.from(positions));

    const imageFallbackWarnings = [];
    const imageFallback = importGltf({
        json: {
            asset: { version: "2.0" },
            extensionsUsed: ["KHR_texture_basisu", "EXT_texture_webp"],
            images: [{ uri: "data:image/png;base64,AA==" }],
            textures: [
                { source: 0, extensions: { KHR_texture_basisu: { source: 0 } } },
                { extensions: { EXT_texture_webp: { source: 0 } } },
                { source: 0, extensions: { EXT_texture_webp: { source: 0 } } },
                { extensions: { KHR_texture_basisu: { source: 0 } } }
            ],
            materials: [
                { pbrMetallicRoughness: { baseColorTexture: { index: 0 } } },
                { pbrMetallicRoughness: { baseColorTexture: { index: 1 } } },
                { pbrMetallicRoughness: { baseColorTexture: { index: 2 } } },
                { pbrMetallicRoughness: { baseColorTexture: { index: 3 } } }
            ],
            buffers: [{ byteLength: positions.byteLength }],
            bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
            accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
            meshes: [{ primitives: [
                { attributes: { POSITION: 0 }, material: 0 },
                { attributes: { POSITION: 0 }, material: 1 },
                { attributes: { POSITION: 0 }, material: 2 },
                { attributes: { POSITION: 0 }, material: 3 }
            ] }],
            nodes: [{ mesh: 0 }],
            scenes: [{ nodes: [0] }],
            scene: 0
        },
        buffers: [positions.buffer],
        resourceBaseUrl: ""
    }, { addToScene: false, onWarning: (message) => imageFallbackWarnings.push(message) });
    expectSupport(imageFallback.metadata, ["KHR_texture_basisu", "EXT_texture_webp"], "deferred");
    assert.ok(imageFallback.meshes[0].material.baseColorTexture, "valid core image source must be imported when BasisU is optional");
    assert.equal(imageFallback.meshes[1].material.baseColorTexture, null, "WebP alternative without a core source must remain unavailable");
    assert.ok(imageFallback.meshes[2].material.baseColorTexture, "valid core image source must be imported when WebP is optional");
    assert.equal(imageFallback.meshes[3].material.baseColorTexture, null, "BasisU alternative without a core source must remain unavailable");
    assert.ok(imageFallbackWarnings.some((message) => message.includes("KHR_texture_basisu") && message.includes("core texture.source")));
    assert.ok(imageFallbackWarnings.some((message) => message.includes("EXT_texture_webp") && message.includes("no usable core")));
    imageFallback.destroy();

    const pointerArrays = [new Float32Array([0, 1]), new Float32Array([0, 0, 0, 1, 0, 0])];
    const pointerBin = new Uint8Array(pointerArrays[0].byteLength + pointerArrays[1].byteLength);
    copyBytes(pointerBin, 0, pointerArrays[0]);
    copyBytes(pointerBin, pointerArrays[0].byteLength, pointerArrays[1]);
    const pointerJson = {
        asset: { version: "2.0" },
        extensionsUsed: ["KHR_animation_pointer"],
        buffers: [{ byteLength: pointerBin.byteLength }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pointerArrays[0].byteLength }, { buffer: 0, byteOffset: pointerArrays[0].byteLength, byteLength: pointerArrays[1].byteLength }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 2, type: "SCALAR" }, { bufferView: 1, componentType: 5126, count: 2, type: "VEC3" }],
        nodes: [{}],
        animations: [{ samplers: [{ input: 0, output: 1 }], channels: [
            { sampler: 0, target: { path: "pointer", extensions: { KHR_animation_pointer: { pointer: "/nodes/0/translation" } } } },
            { sampler: 0, target: { path: "pointer", extensions: { KHR_animation_pointer: { pointer: "/nodes/0/unsupported" } } } }
        ] }],
        scenes: [{ nodes: [0] }],
        scene: 0
    };
    const mixedPointer = importGltf({ json: pointerJson, buffers: [pointerBin.buffer], resourceBaseUrl: "" }, { addToScene: false, onWarning: () => {} });
    expectSupport(mixedPointer.metadata, ["KHR_animation_pointer"], "partial");
    mixedPointer.destroy();
    assert.throws(() => importGltf({ json: { ...pointerJson, extensionsRequired: ["KHR_animation_pointer"] }, buffers: [pointerBin.buffer], resourceBaseUrl: "" }, { addToScene: false }), /Required glTF extension 'KHR_animation_pointer'/);

    const scalarAccessor = { bufferView: 1, componentType: 5126, count: 2, type: "SCALAR" };
    const requiredPointerDocument = (json) => ({ json: { ...json, extensionsRequired: ["KHR_animation_pointer"] }, buffers: [pointerBin.buffer], resourceBaseUrl: "" });
    const targetNodePointer = {
        ...pointerJson,
        animations: [{ samplers: [{ input: 0, output: 1 }], channels: [{ sampler: 0, target: { node: 0, path: "pointer", extensions: { KHR_animation_pointer: { pointer: "/nodes/0/translation" } } } }] }]
    };
    let pointerPreflightCount = TransformStore.global().count;
    assert.throws(() => importGltf(requiredPointerDocument(targetNodePointer), { addToScene: false }), /Required glTF extension 'KHR_animation_pointer'/);
    assert.equal(TransformStore.global().count, pointerPreflightCount);

    const unusedMaterialPointer = {
        ...pointerJson,
        accessors: [...pointerJson.accessors, scalarAccessor],
        materials: [{}],
        animations: [{ samplers: [{ input: 0, output: 2 }], channels: [{ sampler: 0, target: { path: "pointer", extensions: { KHR_animation_pointer: { pointer: "/materials/0/alphaCutoff" } } } }] }]
    };
    pointerPreflightCount = TransformStore.global().count;
    assert.throws(() => importGltf(requiredPointerDocument(unusedMaterialPointer), { addToScene: false }), /Required glTF extension 'KHR_animation_pointer'/);
    assert.equal(TransformStore.global().count, pointerPreflightCount);

    const unlitMaterialPointer = {
        ...pointerJson,
        extensionsUsed: ["KHR_animation_pointer", "KHR_materials_unlit"],
        accessors: [...pointerJson.accessors, scalarAccessor],
        materials: [{ pbrMetallicRoughness: {}, extensions: { KHR_materials_unlit: {} } }],
        meshes: [{ primitives: [{ attributes: { POSITION: 1 }, material: 0 }] }],
        nodes: [{ mesh: 0 }],
        animations: [{ samplers: [{ input: 0, output: 2 }], channels: [{ sampler: 0, target: { path: "pointer", extensions: { KHR_animation_pointer: { pointer: "/materials/0/pbrMetallicRoughness/metallicFactor" } } } }] }]
    };
    pointerPreflightCount = TransformStore.global().count;
    assert.throws(() => importGltf(requiredPointerDocument(unlitMaterialPointer), { addToScene: false }), /Required glTF extension 'KHR_animation_pointer'/);
    assert.equal(TransformStore.global().count, pointerPreflightCount);

    const gaussianRequired = { asset: { version: "2.0" }, extensionsUsed: ["KHR_gaussian_splatting"], extensionsRequired: ["KHR_gaussian_splatting"], meshes: [{ primitives: [{ mode: 0, attributes: { POSITION: 0 }, extensions: { KHR_gaussian_splatting: { kernel: "box", colorSpace: "lin_rec709_display" } } }] }], nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0 };
    assert.throws(() => importGltf({ json: gaussianRequired, buffers: [], resourceBaseUrl: "" }, { addToScene: false }), /kernel 'box' is not supported/);

    const gaussianIncompleteSH = {
        asset: { version: "2.0" },
        extensionsUsed: ["KHR_gaussian_splatting"],
        extensionsRequired: ["KHR_gaussian_splatting"],
        accessors: [
            { componentType: 5126, count: 1, type: "VEC3" },
            { componentType: 5126, count: 1, type: "VEC4" },
            { componentType: 5126, count: 1, type: "SCALAR" }
        ],
        meshes: [{ primitives: [{ mode: 0, attributes: { POSITION: 0, "KHR_gaussian_splatting:ROTATION": 1, "KHR_gaussian_splatting:SCALE": 0, "KHR_gaussian_splatting:OPACITY": 2, "KHR_gaussian_splatting:SH_DEGREE_0_COEF_0": 0, "KHR_gaussian_splatting:SH_DEGREE_1_COEF_0": 0 }, extensions: { KHR_gaussian_splatting: { kernel: "ellipse", colorSpace: "lin_rec709_display" } } }] }],
        nodes: [{ mesh: 0 }],
        scenes: [{ nodes: [0] }],
        scene: 0
    };
    const gaussianPreflightCount = TransformStore.global().count;
    assert.throws(() => importGltf({ json: gaussianIncompleteSH, buffers: [], resourceBaseUrl: "" }, { addToScene: false }), /spherical harmonic attributes must be complete/);
    assert.equal(TransformStore.global().count, gaussianPreflightCount);
}

// 13) Padded matrix accessors compact physical layouts and sparse values correctly.
{
    const matrixBin = new Uint8Array(80);
    matrixBin.set([
        1, 2, 3, 0xaa, 4, 5, 6, 0xbb, 7, 8, 9, 0xcc,
        10, 11, 12, 0xdd, 13, 14, 15, 0xee, 16, 17, 18
    ], 0);
    const matrixDv = new DataView(matrixBin.buffer);
    [100, 101, 102, 103, 104, 105, 106, 107, 108].forEach((value, index) => {
        const column = Math.floor(index / 3), row = index % 3;
        matrixDv.setUint16(23 + column * 8 + row * 2, value, true);
    });
    matrixBin.set([21, 22, 0xfa, 0xfb, 23, 24, 0, 0, 0, 0, 25, 26, 0xfc, 0xfd, 27, 28], 47);
    matrixBin[63] = 1;
    matrixBin.set([31, 32, 33, 0, 34, 35, 36, 0, 37, 38, 39], 64);
    const matrixDoc = {
        json: {
            asset: { version: "2.0" },
            buffers: [{ byteLength: matrixBin.byteLength }],
            bufferViews: [
                { buffer: 0, byteOffset: 0, byteLength: 23 },
                { buffer: 0, byteOffset: 23, byteLength: 22 },
                { buffer: 0, byteOffset: 47, byteLength: 16, byteStride: 10 },
                { buffer: 0, byteOffset: 63, byteLength: 1 },
                { buffer: 0, byteOffset: 64, byteLength: 11 }
            ],
            accessors: [
                { bufferView: 0, componentType: 5121, count: 2, type: "MAT3" },
                { bufferView: 1, componentType: 5123, count: 1, type: "MAT3" },
                { bufferView: 2, componentType: 5121, count: 2, type: "MAT2" },
                {
                    componentType: 5121,
                    count: 2,
                    type: "MAT3",
                    sparse: { count: 1, indices: { bufferView: 3, componentType: 5121 }, values: { bufferView: 4 } }
                }
            ]
        },
        buffers: [matrixBin.buffer],
        resourceBaseUrl: ""
    };
    assert.deepEqual(Array.from(readAccessor(matrixDoc, 0).array), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    assert.deepEqual(Array.from(readAccessor(matrixDoc, 1).array), [100, 101, 102, 103, 104, 105, 106, 107, 108]);
    assert.deepEqual(Array.from(readAccessor(matrixDoc, 2).array), [21, 22, 23, 24, 25, 26, 27, 28]);
    assert.deepEqual(Array.from(readAccessor(matrixDoc, 3).array), [0, 0, 0, 0, 0, 0, 0, 0, 0, 31, 32, 33, 34, 35, 36, 37, 38, 39]);

    const invalidSparse = (indices, count = 2) => {
        const bytes = new Uint8Array([...indices, 7, 8, 9]);
        return {
            json: {
                asset: { version: "2.0" },
                buffers: [{ byteLength: bytes.byteLength }],
                bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: indices.length }, { buffer: 0, byteOffset: indices.length, byteLength: 3 }],
                accessors: [{ componentType: 5121, count, type: "VEC3", sparse: { count: indices.length, indices: { bufferView: 0, componentType: 5121 }, values: { bufferView: 1 } } }]
            },
            buffers: [bytes.buffer],
            resourceBaseUrl: ""
        };
    };
    assert.throws(() => readAccessor(invalidSparse([2]), 0), /out of range/i);
    assert.throws(() => readAccessor(invalidSparse([1, 1], 3), 0), /strictly increasing/i);
}

// 14) Import rollback releases partially acquired resources and preserves caller state.
{
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const document = {
        json: {
            asset: { version: "2.0" },
            buffers: [{ byteLength: positions.byteLength }],
            bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
            accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
            meshes: [{ primitives: [{ attributes: { POSITION: 0 } }, { attributes: { POSITION: 99 } }] }],
            nodes: [{ mesh: 0 }],
            scenes: [{ nodes: [0] }],
            scene: 0
        },
        buffers: [positions.buffer],
        resourceBaseUrl: ""
    };
    const scene = new Scene();
    const callerMesh = new Mesh(new Geometry({ positions }), new StandardMaterial({ color: [0.2, 0.3, 0.4] }));
    scene.add(callerMesh);
    const beforeTransforms = TransformStore.global().count;
    const beforeMeshes = [...scene.meshes];
    assert.throws(() => importGltf(document, { targetScene: scene }), /Invalid accessor index: 99/);
    assert.equal(TransformStore.global().count, beforeTransforms);
    assert.deepEqual(scene.meshes, beforeMeshes);
    scene.remove(callerMesh);
    callerMesh.destroy();
}

// 15) Missing normals force flat topology expansion when a tangent-space material needs them.
{
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const indices = new Uint16Array([0, 1, 2, 0, 3, 1]);
    const colors = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
    const joints = new Uint16Array([0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0]);
    const weights = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    const targetPositions = new Float32Array([0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0]);
    const targetColors = new Int8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const chunks = [positions, indices, colors, uvs, joints, weights, targetPositions, targetColors];
    let byteLength = 0;
    const offsets = chunks.map((chunk) => { const offset = byteLength; byteLength += pad4(chunk.byteLength); return offset; });
    const bin = new Uint8Array(byteLength);
    chunks.forEach((chunk, index) => copyBytes(bin, offsets[index], chunk));
    const document = {
        json: {
            asset: { version: "2.0" },
            buffers: [{ byteLength: bin.byteLength }],
            bufferViews: chunks.map((chunk, index) => ({ buffer: 0, byteOffset: offsets[index], byteLength: chunk.byteLength })),
            accessors: [
                { bufferView: 0, componentType: 5126, count: 4, type: "VEC3" },
                { bufferView: 1, componentType: 5123, count: 6, type: "SCALAR" },
                { bufferView: 2, componentType: 5121, normalized: true, count: 4, type: "VEC3" },
                { bufferView: 3, componentType: 5126, count: 4, type: "VEC2" },
                { bufferView: 4, componentType: 5123, count: 4, type: "VEC4" },
                { bufferView: 5, componentType: 5126, count: 4, type: "VEC4" },
                { bufferView: 6, componentType: 5126, count: 4, type: "VEC3" },
                { bufferView: 7, componentType: 5120, normalized: true, count: 4, type: "VEC4" }
            ],
            materials: [{ normalTexture: { index: 0 } }],
            meshes: [{ primitives: [{ indices: 1, material: 0, attributes: { POSITION: 0, COLOR_0: 2, TEXCOORD_0: 3, JOINTS_0: 4, WEIGHTS_0: 5 }, targets: [{ POSITION: 6, COLOR_0: 7 }] }] }],
            nodes: [{ mesh: 0, weights: [1] }],
            scenes: [{ nodes: [0] }],
            scene: 0
        },
        buffers: [bin.buffer],
        resourceBaseUrl: ""
    };
    const result = importGltf(document, { addToScene: false, computeMissingNormals: false });
    const geometry = result.meshes[0].geometry;
    assert.equal(geometry.indices, null);
    assert.equal(geometry.positions.length, 18);
    assert.equal(geometry.normals.length, 18);
    assert.equal(geometry.colors.length, 24);
    assert.equal(geometry.joints.length, 24);
    assert.equal(geometry.weights.length, 24);
    assert.equal(geometry.morphTargets[0].positions.length, 18);
    assert.equal(geometry.morphTargets[0].colors.length, 24);
    assert.equal(geometry.morphTargets[0].normals, undefined);
    assert.equal(geometry.authoredNormals, false);
    result.destroy();
}

// 16) Skin assignments remain node-local instead of flowing from parent nodes.
{
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const joints = new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const weights = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    const chunks = [positions, joints, weights];
    let byteLength = 0;
    const offsets = chunks.map((chunk) => { const offset = byteLength; byteLength += pad4(chunk.byteLength); return offset; });
    const bin = new Uint8Array(byteLength);
    chunks.forEach((chunk, index) => copyBytes(bin, offsets[index], chunk));
    const document = {
        json: {
            asset: { version: "2.0" },
            buffers: [{ byteLength: bin.byteLength }],
            bufferViews: chunks.map((chunk, index) => ({ buffer: 0, byteOffset: offsets[index], byteLength: chunk.byteLength })),
            accessors: [
                { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
                { bufferView: 1, componentType: 5123, count: 3, type: "VEC4" },
                { bufferView: 2, componentType: 5126, count: 3, type: "VEC4" }
            ],
            meshes: [{ primitives: [{ attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 } }] }],
            skins: [{ joints: [2] }],
            nodes: [{ name: "ParentSkin", skin: 0, children: [1] }, { name: "ChildMesh", mesh: 0 }, { name: "Joint" }],
            scenes: [{ nodes: [0, 2] }],
            scene: 0
        },
        buffers: [bin.buffer],
        resourceBaseUrl: ""
    };
    const result = importGltf(document, { addToScene: false });
    assert.equal(result.meshes.length, 1);
    assert.equal(result.meshes[0].name, "ChildMesh");
    assert.equal(result.meshes[0].skin, null);
    result.destroy();
}

// 17) Transfer-function-aware texture caching distinguishes sRGB and linear usages for shared images.
{
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1]);
    const chunks = [positions, uvs];
    let byteLength = 0;
    const offsets = chunks.map((chunk) => { const offset = byteLength; byteLength += pad4(chunk.byteLength); return offset; });
    const bin = new Uint8Array(byteLength);
    chunks.forEach((chunk, index) => copyBytes(bin, offsets[index], chunk));
    const document = {
        json: {
            asset: { version: "2.0" },
            buffers: [{ byteLength: bin.byteLength }],
            bufferViews: chunks.map((chunk, index) => ({ buffer: 0, byteOffset: offsets[index], byteLength: chunk.byteLength })),
            accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }, { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" }],
            images: [{ uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }],
            textures: [{ source: 0 }],
            extensionsUsed: ["KHR_materials_variants", "KHR_materials_transmission", "KHR_materials_diffuse_transmission", "KHR_materials_sheen"],
            extensions: { KHR_materials_variants: { variants: [{ name: "SharedTextureVariant" }] } },
            materials: [
                {
                    name: "DualColorSpaceMaterial",
                    pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 0 } },
                    emissiveTexture: { index: 0 },
                    extensions: { KHR_materials_transmission: { transmissionFactor: 1, transmissionTexture: { index: 0 } }, KHR_materials_diffuse_transmission: { diffuseTransmissionFactor: 1, diffuseTransmissionTexture: { index: 0 }, diffuseTransmissionColorTexture: { index: 0 } } }
                },
                { normalTexture: { index: 0 }, extensions: { KHR_materials_sheen: { sheenColorTexture: { index: 0 } } } }
            ],
            meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0, extensions: { KHR_materials_variants: { mappings: [{ material: 1, variants: [0] }] } } }] }], nodes: [{ mesh: 0 }],
            scenes: [{ nodes: [0] }], scene: 0
        },
        buffers: [bin.buffer], resourceBaseUrl: ""
    };
    const result = importGltf(document, { addToScene: false });
    assert.equal(result.meshes.length, 1);
    const mat = result.meshes[0].material;
    assert.ok(mat instanceof StandardMaterial);
    assert.ok(mat.baseColorTexture);
    assert.ok(mat.metallicRoughnessTexture);
    assert.ok(mat.emissiveTexture);
    assert.notEqual(mat.baseColorTexture, mat.metallicRoughnessTexture);
    assert.equal(mat.baseColorTexture, mat.emissiveTexture, "Slots using the same transfer function must reuse one runtime texture");
    assert.equal(mat.extensions.transmission.texture, mat.metallicRoughnessTexture);
    assert.equal(mat.extensions.diffuseTransmission.texture, mat.metallicRoughnessTexture);
    assert.equal(mat.extensions.diffuseTransmission.colorTexture, mat.baseColorTexture);
    assert.deepEqual(mat.baseColorTexture.samplerDesc, mat.metallicRoughnessTexture.samplerDesc);
    result.metadata.variants.setActive("SharedTextureVariant");
    const variantMat = result.meshes[0].material;
    assert.ok(variantMat instanceof StandardMaterial);
    assert.equal(variantMat.normalTexture, mat.metallicRoughnessTexture, "Variants must reuse the linear runtime texture");
    assert.equal(variantMat.extensions.sheen.colorTexture, mat.baseColorTexture, "Variants must reuse the sRGB runtime texture");

    const destroyedTextureIds = [];
    const originalTextureDestroy = Texture2D.prototype.destroy;
    Texture2D.prototype.destroy = function trackedDestroy() { destroyedTextureIds.push(this.id); return originalTextureDestroy.call(this); };
    try { result.destroy(); } finally { Texture2D.prototype.destroy = originalTextureDestroy; }
    assert.equal(destroyedTextureIds.length, 2, "Import-result cleanup must destroy each transfer-function resource exactly once");
    assert.equal(new Set(destroyedTextureIds).size, 2);
}

// 18) Imported byte and URL images enforce strict raw-sample decode options and share URL fetches.
{
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1]);
    const chunks = [positions, uvs];
    let byteLength = 0;
    const offsets = chunks.map((chunk) => { const offset = byteLength; byteLength += pad4(chunk.byteLength); return offset; });
    const bin = new Uint8Array(byteLength);
    chunks.forEach((chunk, index) => copyBytes(bin, offsets[index], chunk));
    const makeDocument = (uri) => ({
        json: {
            asset: { version: "2.0" },
            buffers: [{ byteLength: bin.byteLength }],
            bufferViews: chunks.map((chunk, index) => ({ buffer: 0, byteOffset: offsets[index], byteLength: chunk.byteLength })),
            accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }, { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" }],
            images: [{ uri }], textures: [{ source: 0 }], materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 0 } } }],
            meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }], nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0
        },
        buffers: [bin.buffer], resourceBaseUrl: "https://example.invalid/models/"
    });
    const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
    const fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    const setGlobal = (name, value) => Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    const restoreGlobal = (name, descriptor) => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name];
    const decodeOptions = [];
    let fetchCalls = 0;
    const fakeDevice = { createTexture: () => ({ createView: () => ({}), destroy: () => {} }) };
    const fakeQueue = { copyExternalImageToTexture: () => {} };
    const waitForUploads = async (textures) => { for (let i = 0; i < 100 && textures.some((texture) => !texture.uploaded); i++) await new Promise((resolve) => setTimeout(resolve, 0)); assert.ok(textures.every((texture) => texture.uploaded), "Imported textures did not finish mocked upload"); };
    try {
        setGlobal("createImageBitmap", async (_blob, options) => { decodeOptions.push(options); return { width: 1, height: 1, close: () => {} }; });
        setGlobal("fetch", async (url) => { fetchCalls++; assert.equal(url, "https://example.invalid/models/image.png"); return { ok: true, status: 200, statusText: "OK", blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }) }; });
        for (const uri of ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "image.png"]) {
            const result = importGltf(makeDocument(uri), { addToScene: false });
            const material = result.meshes[0].material;
            const textures = [material.baseColorTexture, material.metallicRoughnessTexture];
            textures[0].ensureUploaded(fakeDevice, fakeQueue, "srgb");
            textures[1].ensureUploaded(fakeDevice, fakeQueue, "linear");
            await waitForUploads(textures);
            result.destroy();
        }
        assert.equal(fetchCalls, 1, "Mixed URL transfer functions must share one encoded-source fetch");
        assert.equal(decodeOptions.length, 4);
        for (const options of decodeOptions) assert.deepEqual(options, { premultiplyAlpha: "none", imageOrientation: "none", colorSpaceConversion: "none" });
    } finally { restoreGlobal("createImageBitmap", bitmapDescriptor); restoreGlobal("fetch", fetchDescriptor); }
}

// 19) Material texture combination over WebGPU baseline limit (16) reports partial assessment.
{
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1]);
    const chunks = [positions, uvs];
    let byteLength = 0;
    const offsets = chunks.map((chunk) => { const offset = byteLength; byteLength += pad4(chunk.byteLength); return offset; });
    const bin = new Uint8Array(byteLength);
    chunks.forEach((chunk, index) => copyBytes(bin, offsets[index], chunk));
    const textures = [];
    for (let i = 0; i < 20; i++) textures.push({ source: 0 });
    const document = {
        json: {
            asset: { version: "2.0" },
            extensionsUsed: ["KHR_materials_clearcoat", "KHR_materials_specular", "KHR_materials_sheen", "KHR_materials_iridescence", "KHR_materials_anisotropy", "KHR_materials_transmission", "KHR_materials_volume", "KHR_materials_diffuse_transmission"],
            buffers: [{ byteLength: bin.byteLength }],
            bufferViews: chunks.map((chunk, index) => ({ buffer: 0, byteOffset: offsets[index], byteLength: chunk.byteLength })),
            accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }, { bufferView: 1, componentType: 5126, count: 3, type: "VEC2" }],
            images: [{ uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }],
            textures,
            materials: [
                {
                    name: "OverLimitMaterial",
                    pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 1 } },
                    normalTexture: { index: 2 },
                    occlusionTexture: { index: 3 },
                    emissiveTexture: { index: 4 },
                    extensions: {
                        KHR_materials_clearcoat: { clearcoatTexture: { index: 5 }, clearcoatRoughnessTexture: { index: 6 }, clearcoatNormalTexture: { index: 7 } },
                        KHR_materials_specular: { specularTexture: { index: 8 }, specularColorTexture: { index: 9 } },
                        KHR_materials_sheen: { sheenColorTexture: { index: 10 }, sheenRoughnessTexture: { index: 11 } },
                        KHR_materials_iridescence: { iridescenceTexture: { index: 12 }, iridescenceThicknessTexture: { index: 13 } },
                        KHR_materials_anisotropy: { anisotropyTexture: { index: 14 } },
                        KHR_materials_transmission: { transmissionFactor: 1, transmissionTexture: { index: 15 } },
                        KHR_materials_volume: { thicknessFactor: 1, thicknessTexture: { index: 16 } },
                        KHR_materials_diffuse_transmission: { diffuseTransmissionFactor: 1, diffuseTransmissionTexture: { index: 17 }, diffuseTransmissionColorTexture: { index: 18 } }
                    }
                }
            ],
            meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }], nodes: [{ mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0
        },
        buffers: [bin.buffer], resourceBaseUrl: ""
    };
    const warnings = [];
    const result = importGltf(document, { addToScene: false, onWarning: (message) => warnings.push(message) });
    for (const extensionName of document.json.extensionsUsed) assert.equal(result.metadata.extensions.support[extensionName], "partial", `${extensionName} must be downgraded for the over-limit combination`);
    const combinationWarnings = warnings.filter((message) => message.includes("combines textures requiring"));
    assert.equal(combinationWarnings.length, 1, "An optional over-limit material must emit one contextual warning");
    assert.ok(combinationWarnings[0].includes("material 0"));
    assert.ok(combinationWarnings[0].includes("20 sampled textures"));
    result.destroy();

    const requiredDocument = { ...document, json: { ...document.json, extensionsRequired: ["KHR_materials_transmission"] } };
    const requiredError = assert.throws(() => importGltf(requiredDocument, { addToScene: false }), /KHR_materials_transmission/);
    assert.ok(requiredError.message.includes("material 0 combines textures requiring 20 sampled textures"), requiredError.message);
}
