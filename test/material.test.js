/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, destroyTestDevice, setupTest } from "./utils/helpers.js";
import { UnlitMaterial, StandardMaterial, CustomMaterial, DataMaterial, Colormap, Texture2D, BlendMode, CullMode, SCALE_UNIFORM_FLOAT_COUNT } from "../dist/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers();
const expectPackedTextureTransform = (uniforms, offset, expected, msg) => {
    numberApproxEqual(uniforms[offset + 0], expected.offset[0], 1e-6, `${msg}.offset.x`);
    numberApproxEqual(uniforms[offset + 1], expected.offset[1], 1e-6, `${msg}.offset.y`);
    numberApproxEqual(uniforms[offset + 2], Math.cos(expected.rotation), 1e-6, `${msg}.cos`);
    numberApproxEqual(uniforms[offset + 3], Math.sin(expected.rotation), 1e-6, `${msg}.sin`);
    numberApproxEqual(uniforms[offset + 4], expected.scale[0], 1e-6, `${msg}.scale.x`);
    numberApproxEqual(uniforms[offset + 5], expected.scale[1], 1e-6, `${msg}.scale.y`);
    numberApproxEqual(uniforms[offset + 6], expected.texCoord, 1e-6, `${msg}.texCoord`);
    numberApproxEqual(uniforms[offset + 7], 0, 1e-6, `${msg}.pad`);
};
const createTextureViews = (device, queue, rgba, wantSrgbView) => {
    const texture = device.createTexture({ size: { width: 1, height: 1 }, format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST, viewFormats: ["rgba8unorm-srgb"] });
    const data = new Uint8Array(256);
    data[0] = rgba[0]; data[1] = rgba[1]; data[2] = rgba[2]; data[3] = rgba[3];
    queue.writeTexture({ texture }, data, { bytesPerRow: 256, rowsPerImage: 1 }, { width: 1, height: 1 });
    const linear = texture.createView({ format: "rgba8unorm" });
    const srgb = wantSrgbView ? texture.createView({ format: "rgba8unorm-srgb" }) : linear;
    return { texture, linear, srgb };
};
const createUniformBuffer = (device, queue, data) => {
    const buffer = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    queue.writeBuffer(buffer, 0, data.buffer, data.byteOffset, data.byteLength);
    return buffer;
};
const createSceneLayout = (device, withLighting) => {
    const entries = [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }, { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }];
    if (withLighting) entries.push({ binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } });
    return device.createBindGroupLayout({ entries });
};
const createPipelineDescriptor = (device, shaderCode, bindGroupLayouts, vertexBuffers) => {
    const module = device.createShaderModule({ code: shaderCode });
    return {
        layout: device.createPipelineLayout({ bindGroupLayouts }),
        vertex: { module, entryPoint: "vs_main", buffers: vertexBuffers },
        fragment: { module, entryPoint: "fs_main", targets: [{ format: "rgba8unorm" }] },
        primitive: { topology: "triangle-list", cullMode: "back" },
        depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" }
    };
};
const createPipelineAsync = (device, shaderCode, bindGroupLayouts, vertexBuffers) => {
    const descriptor = createPipelineDescriptor(device, shaderCode, bindGroupLayouts, vertexBuffers);
    if (typeof device.createRenderPipelineAsync === "function") return device.createRenderPipelineAsync(descriptor);
    return device.createRenderPipeline(descriptor);
};
const assertShaderCompiles = async (device, shaderCode) => {
    const module = device.createShaderModule({ code: shaderCode });
    if (typeof module.getCompilationInfo !== "function") return;
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter((m) => m.type === "error");
    assert.equal(errors.length, 0, errors.map((m) => `${m.lineNum}:${m.linePos} ${m.message}`).join("\n"));
};
const vertexBuffersWithUv1 = [
    { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
    { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] },
    { arrayStride: 8, attributes: [{ shaderLocation: 2, offset: 0, format: "float32x2" }] },
    { arrayStride: 8, attributes: [{ shaderLocation: 11, offset: 0, format: "float32x2" }] }
];
const vertexBuffersWithColor = [...vertexBuffersWithUv1, { arrayStride: 16, attributes: [{ shaderLocation: 13, offset: 0, format: "float32x4" }] }];
const vertexBuffersWithTangent = [...vertexBuffersWithUv1, { arrayStride: 16, attributes: [{ shaderLocation: 12, offset: 0, format: "float32x4" }] }, { arrayStride: 16, attributes: [{ shaderLocation: 13, offset: 0, format: "float32x4" }] }];
const vertexBuffersInstancedStandard = [
    ...vertexBuffersWithTangent,
    {
        arrayStride: 128,
        stepMode: "instance",
        attributes: [
            { shaderLocation: 3, offset: 0, format: "float32x4" },
            { shaderLocation: 4, offset: 16, format: "float32x4" },
            { shaderLocation: 5, offset: 32, format: "float32x4" },
            { shaderLocation: 6, offset: 48, format: "float32x4" },
            { shaderLocation: 7, offset: 64, format: "float32x4" },
            { shaderLocation: 8, offset: 80, format: "float32x4" },
            { shaderLocation: 9, offset: 96, format: "float32x4" },
            { shaderLocation: 10, offset: 112, format: "float32x4" }
        ]
    }
];
const vertexBuffersSkinnedStandard = [
    ...vertexBuffersWithTangent,
    {
        arrayStride: 24,
        attributes: [
            { shaderLocation: 3, offset: 0, format: "uint16x4" },
            { shaderLocation: 4, offset: 8, format: "float32x4" }
        ]
    }
];
const vertexBuffersSkinned8Standard = [
    ...vertexBuffersWithTangent,
    {
        arrayStride: 48,
        attributes: [
            { shaderLocation: 3, offset: 0, format: "uint16x4" },
            { shaderLocation: 4, offset: 8, format: "float32x4" },
            { shaderLocation: 5, offset: 24, format: "uint16x4" },
            { shaderLocation: 6, offset: 32, format: "float32x4" }
        ]
    }
];
const vertexBuffersWithUv0 = vertexBuffersWithUv1.slice(0, 3);
const { device } = await setupTest({ webgpu: true });

const fallbackSampler = device.createSampler({ addressModeU: "repeat", addressModeV: "repeat", magFilter: "linear", minFilter: "linear", mipmapFilter: "linear" });
const white = createTextureViews(device, device.queue, [255, 255, 255, 255], true);
const normal = createTextureViews(device, device.queue, [128, 128, 255, 255], false);
const metallicRoughness = createTextureViews(device, device.queue, [0, 255, 255, 255], false);
const occlusion = createTextureViews(device, device.queue, [255, 0, 0, 255], false);
const anisotropy = createTextureViews(device, device.queue, [255, 128, 255, 255], false);
let cleanupPipeline = null;

// 1) Material defaults, dirty state, explicit render-state overrides, and retain/release behavior.
{
    const defaultMaterial = new UnlitMaterial();
    assert.equal(defaultMaterial.blendMode, BlendMode.Opaque);
    assert.equal(defaultMaterial.cullMode, CullMode.Back);
    assert.equal(defaultMaterial.depthWrite, true);
    assert.equal(defaultMaterial.depthTest, true);
    assert.equal(defaultMaterial.dirty, true);
    defaultMaterial.markClean();
    assert.equal(defaultMaterial.dirty, false);
    defaultMaterial.color = [0.25, 0.5, 0.75];
    assert.equal(defaultMaterial.dirty, true);
    defaultMaterial.destroy();

    const transparent = new StandardMaterial({ opacity: 0.4 });
    assert.equal(transparent.blendMode, BlendMode.Transparent);
    transparent.destroy();

    const explicit = new StandardMaterial({
        opacity: 0.4,
        blendMode: BlendMode.Additive,
        cullMode: CullMode.None,
        depthWrite: false,
        depthTest: false
    });
    assert.equal(explicit.blendMode, BlendMode.Additive);
    assert.equal(explicit.cullMode, CullMode.None);
    assert.equal(explicit.depthWrite, false);
    assert.equal(explicit.depthTest, false);
    explicit.retain();
    explicit.release();
    assert.doesNotThrow(() => explicit.getUniformData());
    explicit.release();
    assert.throws(() => explicit.getUniformData(), /already been released/);
    assert.throws(() => explicit.retain(), /already been released/);
}

// 2) Unlit materials pack color, alpha, texture-transform state, and reusable GPU binding layouts.
{
    const transform = {
        offset: [0.2, 0.3],
        rotation: Math.PI / 2,
        scale: [2, 3],
        texCoord: 1
    };
    const material = new UnlitMaterial({
        color: [0.25, 0.5, 0.75],
        opacity: 0.8,
        baseColorTextureTransform: transform,
        alphaCutoff: 0.1
    });

    assert.equal(material.getUniformBufferSize(), 64);
    const uniforms = material.getUniformData();
    assert.equal(uniforms.length, 16);
    arraysApproxEqual(Array.from(uniforms.slice(0, 5)), [0.25, 0.5, 0.75, 0.8, 0.1]);
    expectPackedTextureTransform(uniforms, 8, transform, "unlit.baseColorTextureTransform");

    const copy = material.baseColorTextureTransform;
    copy.offset[0] = 99;
    expectPackedTextureTransform(material.getUniformData(), 8, transform, "unlit.transform.clone");
    material.baseColorTextureTransform = null;
    expectPackedTextureTransform(material.getUniformData(), 8, { offset: [0, 0], rotation: 0, scale: [1, 1], texCoord: 0 }, "unlit.defaultTransform");

    const layoutA = material.createBindGroupLayout(device);
    const layoutB = new UnlitMaterial().createBindGroupLayout(device);
    assert.equal(layoutA, layoutB);

    const uniformBuffer = createUniformBuffer(device, device.queue, material.getUniformData());
    const bindGroup = device.createBindGroup({
        layout: layoutA,
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: fallbackSampler },
            { binding: 2, resource: white.srgb }
        ]
    });
    assert.ok(bindGroup);
    material.destroy();
}

// 3) Standard materials pack PBR state, texture transforms, extension descriptors, and feature masks.
{
    const baseTransform = { offset: [0.1, 0.2], rotation: 0, scale: [0.5, 0.75], texCoord: 1 };
    const mrTransform = { offset: [0.3, 0.4], rotation: Math.PI / 4, scale: [1.5, 2], texCoord: 0 };
    const normalTransform = { offset: [0, 0], rotation: Math.PI, scale: [1, 1], texCoord: 1 };
    const occlusionTransform = { offset: [0.5, 0.25], rotation: 0.25, scale: [0.9, 0.8], texCoord: 1 };
    const emissiveTransform = { offset: [0.75, 0.5], rotation: -0.5, scale: [1.25, 1.5], texCoord: 0 };
    const clearcoatTransform = { offset: [0.11, 0.12], rotation: 0.2, scale: [0.8, 0.7], texCoord: 1 };
    const clearcoatRoughnessTransform = { offset: [0.21, 0.22], rotation: -0.3, scale: [1.1, 1.2], texCoord: 0 };
    const clearcoatNormalTransform = { offset: [0.31, 0.32], rotation: 0.4, scale: [1.3, 1.4], texCoord: 1 };
    const specularTransform = { offset: [0.41, 0.42], rotation: -0.5, scale: [1.5, 1.6], texCoord: 0 };
    const specularColorTransform = { offset: [0.51, 0.52], rotation: 0.6, scale: [1.7, 1.8], texCoord: 1 };
    const sheenColorTransform = { offset: [0.61, 0.62], rotation: -0.7, scale: [1.9, 2.0], texCoord: 0 };
    const sheenRoughnessTransform = { offset: [0.71, 0.72], rotation: 0.8, scale: [2.1, 2.2], texCoord: 1 };
    const iridescenceTransform = { offset: [0.81, 0.82], rotation: -0.9, scale: [2.3, 2.4], texCoord: 0 };
    const iridescenceThicknessTransform = { offset: [0.91, 0.92], rotation: 1.0, scale: [2.5, 2.6], texCoord: 1 };
    const anisotropyTransform = { offset: [1.01, 1.02], rotation: -1.1, scale: [2.7, 2.8], texCoord: 0 };
    const transmissionTransform = { offset: [1.11, 1.12], rotation: 1.2, scale: [2.9, 3.0], texCoord: 1 };
    const volumeThicknessTransform = { offset: [1.21, 1.22], rotation: -1.3, scale: [3.1, 3.2], texCoord: 0 };
    const diffuseTransmissionTransform = { offset: [1.31, 1.32], rotation: 1.4, scale: [3.3, 3.4], texCoord: 1 };
    const diffuseTransmissionColorTransform = { offset: [1.41, 1.42], rotation: -1.5, scale: [3.5, 3.6], texCoord: 0 };
    const texture = new Texture2D({ source: { kind: "bytes", bytes: new Uint8Array([255, 255, 255, 255]).buffer }, mipmaps: false });
    const material = new StandardMaterial({
        color: [1, 0, 0], opacity: 0.9,
        metallic: 0.2, roughness: 0.7,
        emissive: [0, 0, 1], emissiveIntensity: 0.5,
        baseColorTexture: texture,
        metallicRoughnessTexture: texture,
        normalTexture: texture,
        occlusionTexture: texture,
        emissiveTexture: texture,
        baseColorTextureTransform: baseTransform,
        metallicRoughnessTextureTransform: mrTransform,
        normalTextureTransform: normalTransform,
        occlusionTextureTransform: occlusionTransform,
        emissiveTextureTransform: emissiveTransform,
        normalScale: 1.25, occlusionStrength: 0.9, alphaCutoff: 0.35,
        extensions: {
            clearcoat: { factor: 0.4, texture, textureTransform: clearcoatTransform, roughness: 0.2, roughnessTexture: texture, roughnessTextureTransform: clearcoatRoughnessTransform, normalTexture: texture, normalTextureTransform: clearcoatNormalTransform, normalScale: 0.8 },
            transmission: { factor: 0.3, texture, textureTransform: transmissionTransform },
            volume: { thicknessFactor: 0.6, thicknessTexture: texture, thicknessTextureTransform: volumeThicknessTransform, attenuationDistance: 10, attenuationColor: [0.8, 0.7, 0.6] },
            specular: { factor: 0.9, texture, textureTransform: specularTransform, color: [0.5, 0.6, 0.7], colorTexture: texture, colorTextureTransform: specularColorTransform },
            sheen: { color: [0.2, 0.3, 0.4], colorTexture: texture, colorTextureTransform: sheenColorTransform, roughness: 0.25, roughnessTexture: texture, roughnessTextureTransform: sheenRoughnessTransform },
            iridescence: { factor: 0.45, texture, textureTransform: iridescenceTransform, ior: 1.4, thicknessMinimum: 120, thicknessMaximum: 420, thicknessTexture: texture, thicknessTextureTransform: iridescenceThicknessTransform },
            anisotropy: { strength: 0.5, rotation: 0.7, texture, textureTransform: anisotropyTransform },
            diffuseTransmission: { factor: 0.35, texture, textureTransform: diffuseTransmissionTransform, color: [0.6, 0.7, 0.8], colorTexture: texture, colorTextureTransform: diffuseTransmissionColorTransform },
            dispersion: { dispersion: 0.42 },
            ior: { ior: 1.55 },
            emissiveStrength: { strength: 2 }
        }
    });

    assert.equal(material.getUniformBufferSize(), 816);
    const uniforms = material.getUniformData();
    assert.equal(uniforms.length, 204);
    arraysApproxEqual(Array.from(uniforms.slice(0, 13)), [1, 0, 0, 0.9, 0, 0, 1, 0.5, 0.2, 0.7, 1.25, 0.9, 0.35]);
    expectPackedTextureTransform(uniforms, 16, baseTransform, "standard.baseColorTextureTransform");
    expectPackedTextureTransform(uniforms, 24, mrTransform, "standard.metallicRoughnessTextureTransform");
    expectPackedTextureTransform(uniforms, 32, normalTransform, "standard.normalTextureTransform");
    expectPackedTextureTransform(uniforms, 40, occlusionTransform, "standard.occlusionTextureTransform");
    expectPackedTextureTransform(uniforms, 48, emissiveTransform, "standard.emissiveTextureTransform");
    arraysApproxEqual(Array.from(uniforms.slice(56, 68)), [0.4, 0.2, 0.8, 0, 0.9, 0.5, 0.6, 0.7, 1.55, 2, 0, 0]);
    expectPackedTextureTransform(uniforms, 68, clearcoatTransform, "standard.clearcoatTextureTransform");
    expectPackedTextureTransform(uniforms, 76, clearcoatRoughnessTransform, "standard.clearcoatRoughnessTextureTransform");
    expectPackedTextureTransform(uniforms, 84, clearcoatNormalTransform, "standard.clearcoatNormalTextureTransform");
    expectPackedTextureTransform(uniforms, 92, specularTransform, "standard.specularTextureTransform");
    expectPackedTextureTransform(uniforms, 100, specularColorTransform, "standard.specularColorTextureTransform");
    arraysApproxEqual(Array.from(uniforms.slice(108, 120)), [0.2, 0.3, 0.4, 0.25, 0.45, 1.4, 120, 420, 0.5, Math.cos(0.7), Math.sin(0.7), 0]);
    expectPackedTextureTransform(uniforms, 120, sheenColorTransform, "standard.sheenColorTextureTransform");
    expectPackedTextureTransform(uniforms, 128, sheenRoughnessTransform, "standard.sheenRoughnessTextureTransform");
    expectPackedTextureTransform(uniforms, 136, iridescenceTransform, "standard.iridescenceTextureTransform");
    expectPackedTextureTransform(uniforms, 144, iridescenceThicknessTransform, "standard.iridescenceThicknessTextureTransform");
    expectPackedTextureTransform(uniforms, 152, anisotropyTransform, "standard.anisotropyTextureTransform");
    arraysApproxEqual(Array.from(uniforms.slice(160, 172)), [0.3, 0.35, 0.6, 0.42, 0.6, 0.7, 0.8, 10, 0.8, 0.7, 0.6, 0]);
    expectPackedTextureTransform(uniforms, 172, transmissionTransform, "standard.transmissionTextureTransform");
    expectPackedTextureTransform(uniforms, 180, volumeThicknessTransform, "standard.volumeThicknessTextureTransform");
    expectPackedTextureTransform(uniforms, 188, diffuseTransmissionTransform, "standard.diffuseTransmissionTextureTransform");
    expectPackedTextureTransform(uniforms, 196, diffuseTransmissionColorTransform, "standard.diffuseTransmissionColorTextureTransform");

    material.metallic = 2;
    material.roughness = -1;
    numberApproxEqual(material.getUniformData()[8], 1);
    numberApproxEqual(material.getUniformData()[9], 0);
    material.bindGroupKey = "cached";
    material.markClean();
    material.baseColorTexture = null;
    assert.equal(material.bindGroupKey, null);
    assert.equal(material.dirty, true);
    material.baseColorTexture = texture;

    const extensions = material.extensions;
    assert.equal(extensions.clearcoat.factor, 0.4);
    assert.equal(extensions.sheen.roughness, 0.25);
    assert.equal(extensions.iridescence.thicknessMaximum, 420);
    assert.equal(extensions.anisotropy.strength, 0.5);
    assert.equal(extensions.volume.attenuationColor[2], 0.6);
    assert.equal(extensions.transmission.textureTransform.texCoord, 1);
    assert.equal(extensions.diffuseTransmission.factor, 0.35);
    assert.equal(extensions.diffuseTransmission.colorTextureTransform.offset[0], 1.41);
    assert.equal(extensions.dispersion.dispersion, 0.42);
    extensions.clearcoat.factor = 99;
    extensions.clearcoat.textureTransform.offset[0] = 99;
    extensions.sheen.colorTextureTransform.offset[0] = 99;
    extensions.diffuseTransmission.colorTextureTransform.offset[0] = 99;
    assert.equal(material.extensions.clearcoat.factor, 0.4);
    numberApproxEqual(material.extensions.clearcoat.textureTransform.offset[0], 0.11);
    numberApproxEqual(material.extensions.sheen.colorTextureTransform.offset[0], 0.61);
    numberApproxEqual(material.extensions.diffuseTransmission.colorTextureTransform.offset[0], 1.41);
    assert.equal(material.getFeatureMask() & 0b11111, 0b11111);
    assert.ok(material.getFeatureMask() > 0b11111);
    material.bindGroupKey = "cached";
    material.markClean();
    material.setExtensions({ emissiveStrength: { strength: 3 } });
    assert.equal(material.bindGroupKey, null);
    assert.equal(material.dirty, true);
    assert.equal(material.extensions.emissiveStrength.strength, 3);
    assert.equal(material.extensions.clearcoat, null);

    const fallbackNormalMaterial = new StandardMaterial({
        normalScale: 2,
        extensions: { clearcoat: { factor: 1, normalScale: 2 } }
    });
    const fallbackNormalUniforms = fallbackNormalMaterial.getUniformData();
    assert.equal(fallbackNormalUniforms[10], 0);
    assert.equal(fallbackNormalUniforms[58], 0);
    fallbackNormalMaterial.destroy();

    const authoredNormalMaterial = new StandardMaterial({
        normalTexture: texture,
        normalScale: 2,
        extensions: { clearcoat: { factor: 1, normalTexture: texture, normalScale: 2 } }
    });
    const authoredNormalUniforms = authoredNormalMaterial.getUniformData();
    assert.equal(authoredNormalUniforms[10], 2);
    assert.equal(authoredNormalUniforms[58], 2);
    authoredNormalMaterial.destroy();

    texture.destroy();
    material.destroy();

    const transmissionOnly = new StandardMaterial({ extensions: { transmission: { factor: 0.1 } } });
    const diffuseTransmissionOnly = new StandardMaterial({ extensions: { diffuseTransmission: { factor: 0.1 } } });
    const volumeDispersionOnly = new StandardMaterial({ extensions: { volume: { thicknessFactor: 1 }, dispersion: { dispersion: 1 } } });
    assert.equal(transmissionOnly.usesTransmissionLayout(), true);
    assert.equal(diffuseTransmissionOnly.usesTransmissionLayout(), true);
    assert.equal(volumeDispersionOnly.usesTransmissionLayout(), false);
    transmissionOnly.destroy();
    diffuseTransmissionOnly.destroy();
    volumeDispersionOnly.destroy();
}

// 4) Material GPU layouts and shader code create bind groups and render pipelines through the public API.
{
    const unlit = new UnlitMaterial();
    const standard = new StandardMaterial();
    const data = new DataMaterial({
        data: new Float32Array([0, 1, 2, 3]),
        scaleTransform: {
            componentCount: 1, componentIndex: 0,
            stride: 1, offset: 0,
            mode: "linear", clampMode: "range",
            domainMin: 0, domainMax: 3,
            clampMin: 0, clampMax: 3
        }
    });
    const custom = new CustomMaterial({
        fragmentShader: `
            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                return vec4f(custom.gain, in.uv.x, 0.0, 1.0);
            }
        `,
        uniforms: { gain: { type: "f32", value: 0.5 } }
    });
    data.upload(device, device.queue);

    const unlitBuffer = createUniformBuffer(device, device.queue, unlit.getUniformData());
    const standardBuffer = createUniformBuffer(device, device.queue, standard.getUniformData());
    const dataBuffer = createUniformBuffer(device, device.queue, data.getUniformData());
    const customBuffer = createUniformBuffer(device, device.queue, custom.getUniformData());
    const dataColormap = data.getColormapForBinding().getGPUResources(device, device.queue);

    assert.ok(device.createBindGroup({
        layout: unlit.createBindGroupLayout(device),
        entries: [
            { binding: 0, resource: { buffer: unlitBuffer } },
            { binding: 1, resource: fallbackSampler },
            { binding: 2, resource: white.srgb }
        ]
    }));
    assert.ok(device.createBindGroup({
        layout: standard.createBindGroupLayout(device),
        entries: [
            { binding: 0, resource: { buffer: standardBuffer } },
            { binding: 1, resource: fallbackSampler },
            { binding: 2, resource: white.srgb },
            { binding: 3, resource: fallbackSampler },
            { binding: 4, resource: metallicRoughness.linear },
            { binding: 5, resource: fallbackSampler },
            { binding: 6, resource: normal.linear },
            { binding: 7, resource: fallbackSampler },
            { binding: 8, resource: occlusion.linear },
            { binding: 9, resource: fallbackSampler },
            { binding: 10, resource: white.srgb },
            { binding: 11, resource: fallbackSampler },
            { binding: 12, resource: white.linear },
            { binding: 13, resource: fallbackSampler },
            { binding: 14, resource: white.linear },
            { binding: 15, resource: fallbackSampler },
            { binding: 16, resource: normal.linear },
            { binding: 17, resource: fallbackSampler },
            { binding: 18, resource: white.linear },
            { binding: 19, resource: fallbackSampler },
            { binding: 20, resource: white.srgb },
            { binding: 21, resource: fallbackSampler },
            { binding: 22, resource: white.srgb },
            { binding: 23, resource: fallbackSampler },
            { binding: 24, resource: white.linear },
            { binding: 25, resource: fallbackSampler },
            { binding: 26, resource: white.linear },
            { binding: 27, resource: fallbackSampler },
            { binding: 28, resource: white.linear },
            { binding: 29, resource: fallbackSampler },
            { binding: 30, resource: anisotropy.linear }
        ]
    }));
    assert.ok(device.createBindGroup({
        layout: data.createBindGroupLayout(device),
        entries: [
            { binding: 0, resource: { buffer: dataBuffer } },
            { binding: 1, resource: { buffer: data.dataBuffer } },
            { binding: 2, resource: dataColormap.sampler },
            { binding: 3, resource: dataColormap.view }
        ]
    }));
    assert.ok(device.createBindGroup({ layout: custom.createBindGroupLayout(device), entries: [{ binding: 0, resource: { buffer: customBuffer } }] }));

    const sceneLayout = createSceneLayout(device, true);
    const unlitSceneLayout = createSceneLayout(device, false);
    const skinLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } }] });
    const materialPipelinePromises = [
        createPipelineAsync(device, unlit.getShaderCode(), [unlitSceneLayout, unlit.createBindGroupLayout(device)], vertexBuffersWithColor),
        createPipelineAsync(device, standard.getShaderCode(), [sceneLayout, standard.createBindGroupLayout(device)], vertexBuffersWithTangent),
        createPipelineAsync(device, standard.getShaderCode({ skinned8: true, transmission: true }), [sceneLayout, standard.createBindGroupLayout(device), skinLayout], vertexBuffersSkinned8Standard),
        createPipelineAsync(device, data.getShaderCode(), [sceneLayout, data.createBindGroupLayout(device)], vertexBuffersWithUv0),
        createPipelineAsync(device, custom.getShaderCode(), [unlitSceneLayout, custom.createBindGroupLayout(device)], vertexBuffersWithUv0)
    ];
    const shaderCompilePromises = [
        assertShaderCompiles(device, unlit.getShaderCode({ instanced: true })),
        assertShaderCompiles(device, standard.getShaderCode({ instanced: true })),
        assertShaderCompiles(device, standard.getShaderCode({ skinned: true })),
        assertShaderCompiles(device, standard.getShaderCode({ skinned8: true })),
        assertShaderCompiles(device, standard.getShaderCode({ transmission: true })),
        assertShaderCompiles(device, standard.getShaderCode({ instanced: true, transmission: true })),
        assertShaderCompiles(device, standard.getShaderCode({ skinned: true, transmission: true }))
    ];
    const materialPipelines = await Promise.all(materialPipelinePromises);
    await Promise.all(shaderCompilePromises);
    for (const pipeline of materialPipelines) assert.ok(pipeline);
    cleanupPipeline = materialPipelines[1];
    assert.ok(unlit.getShaderCode({ instanced: true }).includes("@location(3)"));
    assert.ok(standard.getShaderCode({ skinned: true }).includes("@group(2) @binding(0)"));
    assert.ok(standard.getShaderCode({ skinned8: true }).includes("joints1"));
    assert.ok(standard.getShaderCode().includes("fn iridescent_fresnel"));
    assert.ok(standard.getShaderCode().includes("fn distribution_ggx_anisotropic"));
    assert.ok(standard.getShaderCode().includes("fn sheen_visibility"));
    assert.ok(standard.getShaderCode().includes("let anisotropy_frame = build_tangent_frame("));
    assert.ok(standard.getShaderCode().includes("in.world_pos"));
    assert.ok(standard.getShaderCode({ transmission: true }).includes("material.transmission_params.x"));
    assert.ok(standard.getShaderCode().includes("model.normal_matrix * vec4<f32>(in.tangent.xyz"));
    assert.ok(standard.getShaderCode({ instanced: true }).includes("normal_m * vec4<f32>(in.tangent.xyz"));
    assert.ok(standard.getShaderCode({ skinned: true }).includes("model.normal_matrix * vec4<f32>(local_tangent"));
    assert.ok(standard.getShaderCode({ skinned8: true }).includes("model.normal_matrix * vec4<f32>(local_tangent"));

    unlit.destroy();
    standard.destroy();
    data.destroy();
    custom.destroy();
}

// 5) DataMaterial uploads data, exposes scale-source state, emits visual changes, and binds colormaps.
{
    const colormap = Colormap.fromPalette([[0, 0, 0, 1], [1, 0, 0, 1], [1, 1, 0, 1]], { filter: "nearest", colorSpace: "linear" });
    const changes = [];
    const material = new DataMaterial({
        data: new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]), keepCPUData: false,
        opacity: 1.5, shading: -1, colormap,
        scaleTransform: {
            componentCount: 2, componentIndex: 1,
            stride: 2, offset: 0,
            valueMode: "component", mode: "linear", clampMode: "range",
            domainMin: 0, domainMax: 7,
            clampMin: 0, clampMax: 7
        }
    });
    const unsubscribe = material.onVisualChange((kind) => changes.push(kind));
    material.upload(device, device.queue);

    assert.ok(material.dataBuffer);
    assert.equal(material.getUniformBufferSize(), (SCALE_UNIFORM_FLOAT_COUNT + 4) * 4);
    const uniforms = material.getUniformData();
    assert.equal(uniforms.length, SCALE_UNIFORM_FLOAT_COUNT + 4);
    numberApproxEqual(uniforms[SCALE_UNIFORM_FLOAT_COUNT + 0], 1);
    numberApproxEqual(uniforms[SCALE_UNIFORM_FLOAT_COUNT + 1], 0);
    const scaleSource = material.getScaleSourceDescriptor(77);
    assert.equal(scaleSource.count, 4);
    assert.equal(scaleSource.componentCount, 2);
    assert.equal(scaleSource.componentIndex, 1);
    assert.equal(scaleSource.stride, 2);
    assert.equal(scaleSource.offset, 0);
    assert.equal(scaleSource.revision, 77);
    assert.equal(material.getColormapForBinding(), colormap);
    assert.equal(material.getColormapKey(), `cm:${colormap.id}`);

    material.setScaleTransform({
        componentCount: 3, componentIndex: 2,
        stride: 4, offset: 1,
        valueMode: "magnitude", mode: "symlog", clampMode: "none",
        domainMin: -10, domainMax: 10,
        symlogLinThresh: 0.5, gamma: 0.8, invert: true
    });
    material.colormap = "magma";
    assert.deepEqual(changes, ["scale", "colormap"]);
    assert.equal(material.getColormapKey(), "cm:magma");
    assert.equal(material.getColormapForBinding(), Colormap.builtin("magma"));

    const externalBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    material.setDataBuffer(externalBuffer);
    const externalSource = material.getScaleSourceDescriptor();
    assert.equal(externalSource.buffer, externalBuffer);
    assert.equal(externalSource.count, 1);
    assert.throws(() => material.setData(new Float32Array()), /non-empty/);
    unsubscribe();
    material.setScaleTransform({ componentCount: 1, stride: 1, offset: 0 });
    assert.deepEqual(changes, ["scale", "colormap"]);
    material.destroy();
}

// 6) Colormaps support builtins, CPU sampling, GPU-resource caching, and external GPU views.
{
    const builtin = Colormap.builtin("viridis");
    assert.equal(builtin.width, 256);
    assert.equal(builtin.filter, "linear");
    assert.equal(builtin.canSampleCPU, true);
    assert.equal(builtin.getRGBA8LinearLUT().length, builtin.width * 4);
    assert.equal(builtin.toUniformStops(99).length, 8);

    const stops = Colormap.fromStops([{ t: 0, color: [0, 0, 0, 1] }, { t: 0.5, color: [0.5, 0.5, 0, 1] }, { t: 1, color: [1, 1, 1, 1] }], { resolution: 3, filter: "linear", colorSpace: "linear" });
    arraysApproxEqual(stops.sampleCPU(0.5), [128 / 255, 128 / 255, 0, 1], 1 / 255);
    const resourcesA = stops.getGPUResources(device, device.queue);
    const resourcesB = stops.getGPUResources(device, device.queue);
    assert.equal(resourcesA.texture, resourcesB.texture);
    assert.equal(resourcesA.view, resourcesB.view);
    assert.equal(resourcesA.width, 3);

    const palette = Colormap.fromPalette([[0, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1]], { filter: "nearest", colorSpace: "linear" });
    arraysApproxEqual(palette.sampleCPU(0.9), [0, 0, 1, 1]);
    assert.equal(palette.toUniformStops(3, "linear").length, 3);

    const externalTexture = device.createTexture({ size: { width: 2, height: 1, depthOrArrayLayers: 1 }, dimension: "1d", format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING });
    const externalView = externalTexture.createView({ dimension: "1d" });
    const externalSampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
    const external = Colormap.fromGPUTextureView(device, externalView, externalSampler, 2, "nearest");
    assert.equal(external.canSampleCPU, false);
    assert.throws(() => external.sampleCPU(0.5), /CPU sampling/);
    const externalResources = external.getGPUResources(device, device.queue);
    assert.equal(externalResources.texture, null);
    assert.equal(externalResources.view, externalView);
    assert.equal(externalResources.sampler, externalSampler);
    externalTexture.destroy();
}

// 7) CustomMaterial aligns uniform data, updates named uniforms, and composes custom shaders.
{
    const material = new CustomMaterial({
        fragmentShader: `
            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                return vec4f(custom.gain + in.uv.x, custom.axis.y, custom.tint.z, 1.0);
            }
        `,
        uniforms: {
            gain: { type: "f32", value: 0.5 },
            axis: { type: "vec3f", value: [1, 2, 3] },
            tint: { type: "vec4f", value: [0.2, 0.4, 0.6, 0.8] }
        }
    });

    assert.equal(material.getUniformBufferSize(), 48);
    const uniforms = material.getUniformData();
    numberApproxEqual(uniforms[0], 0.5);
    arraysApproxEqual(Array.from(uniforms.slice(4, 7)), [1, 2, 3]);
    arraysApproxEqual(Array.from(uniforms.slice(8, 12)), [0.2, 0.4, 0.6, 0.8]);
    assert.deepEqual(material.getUniform("axis"), [1, 2, 3]);
    material.markClean();
    material.setUniform("gain", 0.75);
    material.setUniform("missing", 1);
    assert.equal(material.dirty, true);
    numberApproxEqual(material.getUniformData()[0], 0.75);

    const shaderCode = material.getShaderCode();
    assert.ok(shaderCode.includes("struct CustomUniforms"));
    assert.ok(shaderCode.includes("gain: f32"));
    assert.ok(shaderCode.includes("axis: vec3f"));
    assert.ok(shaderCode.includes("@fragment"));
    const layoutA = material.createBindGroupLayout(device);
    const layoutB = material.createBindGroupLayout(device);
    assert.equal(layoutA, layoutB);

    const uniformBuffer = createUniformBuffer(device, device.queue, material.getUniformData());
    assert.ok(device.createBindGroup({ layout: layoutA, entries: [{ binding: 0, resource: { buffer: uniformBuffer } }] }));
    material.destroy();
}

// 8) Cleanup releases material-owned runtime state and invalidates released material use.
{
    const standard = new StandardMaterial();
    standard.uniformBuffer = device.createBuffer({ size: standard.getUniformBufferSize(), usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    standard.bindGroupKey = "cached-standard";
    assert.ok(cleanupPipeline);
    standard.pipeline = cleanupPipeline;
    standard.destroy();
    assert.equal(standard.uniformBuffer, null);
    assert.equal(standard.bindGroup, null);
    assert.equal(standard.bindGroupKey, null);
    assert.equal(standard.pipeline, null);
    assert.throws(() => standard.getUniformData(), /already been released/);

    const data = new DataMaterial({
        data: new Float32Array([1, 2, 3, 4]),
        scaleTransform: { componentCount: 1, stride: 1, offset: 0 }
    });
    data.upload(device, device.queue);
    assert.ok(data.dataBuffer);
    data.destroy();
    assert.equal(data.dataBuffer, null);
    assert.equal(data.getScaleSourceDescriptor(), null);
    assert.throws(() => data.upload(device, device.queue), /already been released/);
}

// 9) Cleanup releases shared textures before their browser GPU device.
{
    white.texture.destroy();
    normal.texture.destroy();
    metallicRoughness.texture.destroy();
    occlusion.texture.destroy();
    anisotropy.texture.destroy();
    await destroyTestDevice(device);
}
