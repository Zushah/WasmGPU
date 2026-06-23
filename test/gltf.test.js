/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import { initWebAssembly, readAccessor, readAccessorAsFloat32, readAccessorAsUint16, readIndicesAsUint32, parseGLB, loadGltf, importGltf, Scene, TransformStore, UnlitMaterial, StandardMaterial, SplatField } from "../dist/WasmGPU.js";

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
const approxEqual = (actual, expected, tol = 1e-6, msg = "Numbers differ") => { assert.ok(Number.isFinite(actual) && Number.isFinite(expected), `${msg}: expected finite numbers`); assert.ok(Math.abs(actual - expected) <= tol, `${msg}: ${actual} vs ${expected}`); };
const approxArray = (actual, expected, tol = 1e-6, msg = "Arrays differ") => { assert.equal(actual.length, expected.length, `${msg}: length ${actual.length} vs ${expected.length}`); for (let i = 0; i < actual.length; i++) approxEqual(actual[i], expected[i], tol, `${msg} at index ${i}`); };
const expectSupport = (metadata, names, expected) => { for (const name of names) assert.equal(metadata.extensions.support[name], expected, `${name} should be ${expected}`); };

await initWebAssembly(new URL("../dist/", import.meta.url).toString());

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

    const doc = await loadGltf(glb, { baseUrl: "memory://asset/" });
    assert.equal(doc.baseUrl, "memory://asset/");
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
        baseUrl: ""
    };

    const accessorView = readAccessor(accessorDoc, 0);
    assert.equal(accessorView.count, 2);
    assert.equal(accessorView.numComponents, 3);
    approxArray(Array.from(readAccessorAsFloat32(accessorDoc, 0)), [1, 2, 3, 4, 5, 6]);
    const uv = readAccessorAsFloat32(accessorDoc, 1);
    approxEqual(uv[0], 0);
    approxEqual(uv[1], 1);
    approxEqual(uv[2], 32768 / 65535);
    approxEqual(uv[3], 0);
    approxArray(Array.from(readAccessorAsFloat32(accessorDoc, 2)), [0, 0, 0, 7, 8, 9, 0, 0, 0]);
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

    const res = importGltf(await loadGltf(makeGLB(gltfJson, bin.buffer), { baseUrl: "https://example.test/models/" }), { addToScene: false, computeMissingNormals: true });

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
    approxArray(Array.from(standardMesh.geometry.positions), [0, 0, 0, 2, 0, 0, 0, 2, 0]);
    approxArray(Array.from(standardMesh.geometry.uvs), Array.from(uv0));
    approxArray(Array.from(standardMesh.geometry.uvs1), [0, 0, 0, 1, 1, 0]);
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
    approxEqual(standardMesh.material.extensions.anisotropy.rotation, 0.33);
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
    approxArray(res.meshes[0].transform.worldPosition, [5, 2, 3]);
    approxArray(res.nodes[3].transform.worldPosition, [1, 7, 3]);
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

    const res = importGltf(await loadGltf(makeGLB(gltfJson, bin.buffer)), { addToScene: false, computeMissingNormals: true });

    assert.equal(res.skins.length, 1);
    assert.ok(res.skins[0].runtime);
    assert.equal(res.meshes.length, 1);
    assert.ok(res.meshes[0].skin);
    assert.equal(res.meshes[0].skin.jointCount, 1);
    assert.equal(res.meshes[0].geometry.morphTargets.length, 1);
    assert.equal(res.clips.length, 1);

    const before = res.meshes[0].getLocalBounds();
    approxEqual(before.boxMax[1], 1);
    res.clips[0].sample(1);
    const after = res.meshes[0].getLocalBounds();
    approxEqual(after.boxMax[1], 2);

    res.destroy();
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
    approxEqual(res.meshes[0].material.extensions.clearcoat.factor, 0.8);
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
    approxArray(res.splatFields[0].transform.worldPosition, [1, 2, 3]);
    approxArray(Array.from(res.splatFields[0]._centerOpacityCPU), [0, 0, 0, 128 / 255, 1, 2, 3, 1, 4, 5, 6, 64 / 255]);
    approxArray(Array.from(res.splatFields[0]._rotationCPU), [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    approxArray(Array.from(res.splatFields[0]._scaleCPU), [1, 2, 3, 0, 4, 5, 6, 0, 7, 8, 9, 0]);
    approxArray(Array.from(res.splatFields[0]._shCPU), packSH([0, 1, 2]));
    approxArray(Array.from(res.splatFields[0]._colorCPU), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
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
    approxArray(Array.from(indexedRes.splatFields[0]._centerOpacityCPU), [4, 5, 6, 64 / 255, 0, 0, 0, 128 / 255]);
    approxArray(Array.from(indexedRes.splatFields[0]._shCPU), packSH([2, 0]));
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
        expectSupport(optionalRes.metadata, [extensionName], "unsupported");
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
    assert.ok(deferredWarnings.some((message) => message.includes("KHR_draco_mesh_compression not supported; skipping primitive")));
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
        baseUrl: ""
    };
    assert.throws(() => readAccessorAsFloat32(meshoptDoc, 0), /EXT_meshopt_compression is not supported yet/);
}
