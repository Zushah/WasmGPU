/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import mipmapWGSL from "../wgsl/graphics/mipmap.wgsl";

export type TextureColorSpace = "srgb" | "linear";

export type TextureSource =
    | { kind: "bytes"; bytes: ArrayBuffer; mimeType?: string }
    | { kind: "url"; url: string; mimeType?: string }
    | { kind: "bitmap"; bitmap: ImageBitmap };

export type TextureSamplerOptions = {
    addressModeU?: GPUAddressMode;
    addressModeV?: GPUAddressMode;
    addressModeW?: GPUAddressMode;
    magFilter?: GPUFilterMode;
    minFilter?: GPUFilterMode;
    mipmapFilter?: GPUMipmapFilterMode;
    lodMinClamp?: number;
    lodMaxClamp?: number;
};

export type Texture2DDescriptor = {
    source: TextureSource;
    mipmaps?: boolean;
    sampler?: TextureSamplerOptions;
};

let __texture2d_id = 1;

const hasCreateImageBitmap = (): boolean => typeof (globalThis as any).createImageBitmap === "function";

const mipLevelCountForSize = (w: number, h: number): number => {
    const m = Math.max(1, w | 0, h | 0);
    return (Math.floor(Math.log2(m)) | 0) + 1;
};

type MipmapPipelineCache = {
    pipelineLinear: GPURenderPipeline;
    pipelineSrgb: GPURenderPipeline;
    sampler: GPUSampler;
    bindGroupLayout: GPUBindGroupLayout;
};

const mipmapCache = new WeakMap<GPUDevice, MipmapPipelineCache>();

const getMipmapCache = (device: GPUDevice): MipmapPipelineCache => {
    const cached = mipmapCache.get(device);
    if (cached) return cached;
    const module = device.createShaderModule({ code: mipmapWGSL });
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
        ],
    });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
    const createPipeline = (format: GPUTextureFormat): GPURenderPipeline => {
        return device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: { module, entryPoint: "vs_main" },
            fragment: { module, entryPoint: "fs_main", targets: [{ format }] },
            primitive: { topology: "triangle-list" },
        });
    };
    const sampler = device.createSampler({ minFilter: "linear", magFilter: "linear" });
    const created: MipmapPipelineCache = {
        pipelineLinear: createPipeline("rgba8unorm"),
        pipelineSrgb: createPipeline("rgba8unorm-srgb"),
        sampler,
        bindGroupLayout,
    };
    mipmapCache.set(device, created);
    return created;
};

export class Texture2D {
    readonly id: number = __texture2d_id++;
    private _source: TextureSource;
    private _mipmaps: boolean;
    private _mipmapColorSpace: TextureColorSpace | null = null;
    readonly samplerDesc: GPUSamplerDescriptor;
    private _gpuTexture: GPUTexture | null = null;
    private _viewLinear: GPUTextureView | null = null;
    private _viewSrgb: GPUTextureView | null = null;
    private _sampler: GPUSampler | null = null;
    private _uploadPromise: Promise<void> | null = null;
    private _uploadStarted = false;
    private _uploadGeneration = 0;
    private _revision = 0;
    private _width = 0;
    private _height = 0;

    constructor(desc: Texture2DDescriptor) {
        this._source = desc.source;
        this._mipmaps = desc.mipmaps ?? true;
        this.samplerDesc = {
            addressModeU: desc.sampler?.addressModeU ?? "repeat",
            addressModeV: desc.sampler?.addressModeV ?? "repeat",
            addressModeW: desc.sampler?.addressModeW ?? "repeat",
            magFilter: desc.sampler?.magFilter ?? "linear",
            minFilter: desc.sampler?.minFilter ?? "linear",
            mipmapFilter: desc.sampler?.mipmapFilter ?? "linear",
            lodMinClamp: desc.sampler?.lodMinClamp ?? 0,
            lodMaxClamp: desc.sampler?.lodMaxClamp ?? 32,
        };
    }

    get revision(): number {
        return this._revision;
    }

    get width(): number {
        return this._width;
    }

    get height(): number {
        return this._height;
    }

    get uploaded(): boolean {
        return !!this._gpuTexture;
    }

    static createFrom(desc: Texture2DDescriptor): Texture2D {
        return new Texture2D(desc);
    }

    getSampler(device: GPUDevice, fallback?: GPUSampler): GPUSampler {
        if (this._sampler) return this._sampler;
        try {
            this._sampler = device.createSampler(this.samplerDesc);
            return this._sampler;
        } catch (e) {
            if (fallback) return fallback;
            throw e;
        }
    }

    getView(device: GPUDevice, queue: GPUQueue, colorSpace: TextureColorSpace, fallbackView: GPUTextureView): GPUTextureView {
        if (this._gpuTexture) {
            if (colorSpace === "srgb") return this._viewSrgb ?? fallbackView;
            return this._viewLinear ?? fallbackView;
        }
        this.ensureUploaded(device, queue, colorSpace);
        return fallbackView;
    }

    destroy(): void {
        this._uploadGeneration++;
        this._gpuTexture?.destroy();
        this._gpuTexture = null;
        this._viewLinear = null;
        this._viewSrgb = null;
        this._sampler = null;
        this._uploadStarted = false;
        this._uploadPromise = null;
        this._mipmapColorSpace = null;
        this._revision++;
    }

    ensureUploaded(device: GPUDevice, queue: GPUQueue, colorSpace: TextureColorSpace = "linear"): void {
        if (this._uploadStarted) return;
        const uploadGeneration = this._uploadGeneration;
        this._uploadStarted = true;
        this._mipmapColorSpace = colorSpace;
        this._uploadPromise = (async () => {
            let bitmap: ImageBitmap | null = null;
            let texture: GPUTexture | null = null;
            try {
                bitmap = await this.decodeBitmap();
                if (uploadGeneration !== this._uploadGeneration) return;
                const w = bitmap.width | 0;
                const h = bitmap.height | 0;
                const mipLevelCount = this._mipmaps ? mipLevelCountForSize(w, h) : 1;
                texture = device.createTexture({
                    size: { width: w, height: h },
                    format: "rgba8unorm",
                    mipLevelCount,
                    usage: this._mipmaps
                        ? (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT)
                        : (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST),
                    viewFormats: ["rgba8unorm-srgb"],
                });
                queue.copyExternalImageToTexture({ source: bitmap }, { texture }, { width: w, height: h });
                if (this._mipmaps && mipLevelCount > 1) this.generateMipmaps(device, texture, mipLevelCount, this._mipmapColorSpace ?? "linear");
                const viewLinear = texture.createView({ format: "rgba8unorm" });
                const viewSrgb = texture.createView({ format: "rgba8unorm-srgb" });
                this._viewLinear = viewLinear;
                this._viewSrgb = viewSrgb;
                this._width = w;
                this._height = h;
                this._gpuTexture = texture;
                this._revision++;
            } catch (e) {
                if (uploadGeneration === this._uploadGeneration) {
                    this._uploadStarted = false;
                    this._uploadPromise = null;
                    this._mipmapColorSpace = null;
                }
                try { texture?.destroy(); } catch { /* ignore */ }
                throw e;
            } finally {
                if (bitmap && this._source.kind !== "bitmap") try { (bitmap as unknown as { close?: () => void }).close?.(); } catch { /* ignore */ }
            }
        })();
        this._uploadPromise.catch((e) => console.warn("Texture2D upload failed: ", e));
    }

    private async decodeBitmap(): Promise<ImageBitmap> {
        const src = this._source;
        if (src.kind === "bitmap") return src.bitmap;
        if (!hasCreateImageBitmap()) throw new Error("createImageBitmap() is not available in this environment.");
        const options: ImageBitmapOptions = {
            premultiplyAlpha: "none",
            imageOrientation: "none",
            colorSpaceConversion: (this._mipmapColorSpace === "srgb") ? "default" : "none",
        };
        if (src.kind === "url") {
            const res = await fetch(src.url);
            if (!res.ok) throw new Error(`Failed to fetch texture: ${res.status} ${res.statusText}`);
            const blob = await res.blob();
            try {
                return await createImageBitmap(blob, options);
            } catch {
                return await createImageBitmap(blob);
            }
        }
        const blob = new Blob([src.bytes], { type: src.mimeType ?? "application/octet-stream" });
        try {
            return await createImageBitmap(blob, options);
        } catch {
            return await createImageBitmap(blob);
        }
    }

    private generateMipmaps(device: GPUDevice, texture: GPUTexture, mipLevels: number, colorSpace: TextureColorSpace): void {
        const cache = getMipmapCache(device);
        const pipeline = (colorSpace === "srgb") ? cache.pipelineSrgb : cache.pipelineLinear;
        const viewFormat: GPUTextureFormat = (colorSpace === "srgb") ? "rgba8unorm-srgb" : "rgba8unorm";
        const encoder = device.createCommandEncoder();
        for (let level = 1; level < mipLevels; level++) {
            const srcView = texture.createView({ baseMipLevel: level - 1, mipLevelCount: 1, format: viewFormat });
            const dstView = texture.createView({ baseMipLevel: level, mipLevelCount: 1, format: viewFormat });
            const bindGroup = device.createBindGroup({
                layout: cache.bindGroupLayout,
                entries: [
                    { binding: 0, resource: cache.sampler },
                    { binding: 1, resource: srcView },
                ],
            });
            const pass = encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: dstView,
                        clearValue: { r: 0, g: 0, b: 0, a: 0 },
                        loadOp: "clear",
                        storeOp: "store",
                    },
                ],
            });
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);
            pass.draw(3);
            pass.end();
        }
        device.queue.submit([encoder.finish()]);
    }
}
