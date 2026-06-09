/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { StandardMaterial } from "../graphics/material";
import type { Material } from "../graphics/material";
import type { RendererContext } from "./context";

export const isOpticallyTransmissiveMaterial = (material: Material): boolean => { if (!(material instanceof StandardMaterial)) return false; const transmission = material.extensions.transmission; return (transmission?.factor ?? 0) > 0; };

export const hasOpticalTransmissionDrawItems = (ctx: RendererContext): boolean => { for (const item of ctx.transparentDrawList) if (isOpticallyTransmissiveMaterial(item.material)) return true; return false; };

export const ensureTransmissionTargets = (ctx: RendererContext, needSceneTarget: boolean): void => {
    const haveSource = ctx.transmissionSourceTexture !== null && ctx.transmissionSourceView !== null;
    const haveSceneTarget = !needSceneTarget || (ctx.transmissionSceneColorTexture !== null && ctx.transmissionSceneColorView !== null);
    if (haveSource && haveSceneTarget) return;
    resizeTransmissionTargets(ctx, needSceneTarget);
};

export const resizeTransmissionTargets = (ctx: RendererContext, needSceneTarget: boolean): void => {
    ctx.transmissionSceneColorTexture?.destroy();
    ctx.transmissionSourceTexture?.destroy();
    ctx.transmissionSceneColorTexture = null;
    ctx.transmissionSceneColorView = null;
    ctx.transmissionSourceTexture = null;
    ctx.transmissionSourceView = null;
    const w = ctx.width | 0;
    const h = ctx.height | 0;
    if (w <= 0 || h <= 0) { ctx.transmissionSourceRevision++; return; }
    if (needSceneTarget) {
        ctx.transmissionSceneColorTexture = ctx.device.createTexture({
            size: { width: w, height: h, depthOrArrayLayers: 1 },
            format: ctx.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        });
        ctx.transmissionSceneColorView = ctx.transmissionSceneColorTexture.createView();
    }
    ctx.transmissionSourceTexture = ctx.device.createTexture({
        size: { width: w, height: h, depthOrArrayLayers: 1 },
        format: ctx.format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    ctx.transmissionSourceView = ctx.transmissionSourceTexture.createView();
    ctx.transmissionSourceRevision++;
};
