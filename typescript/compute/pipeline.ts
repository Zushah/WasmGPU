/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert } from "../utils";
import { normalizeBindGroupLayout, normalizeBindGroupResources } from "../wgsl/interop";
import type { BindGroupLayoutDescriptor, BindGroupResources } from "../wgsl/interop";

export type ComputePipelineDescriptor = {
    label?: string;
    code: string;
    entryPoint?: string;
    constants?: Record<string, number>;
    bindGroups?: BindGroupLayoutDescriptor[];
};

export class ComputePipeline {
    readonly device: GPUDevice;
    readonly shaderCode: string;
    readonly entryPoint: string;
    readonly constants: Record<string, number> | undefined;
    readonly pipeline: GPUComputePipeline;
    readonly bindGroupLayouts: GPUBindGroupLayout[];
    readonly label: string | null;

    constructor(device: GPUDevice, desc: ComputePipelineDescriptor) {
        this.device = device;
        this.shaderCode = desc.code;
        this.entryPoint = desc.entryPoint ?? "main";
        this.constants = desc.constants;
        this.label = desc.label ?? null;
        const module = device.createShaderModule({ code: desc.code });
        if (desc.bindGroups && desc.bindGroups.length > 0) {
            const layouts = desc.bindGroups.map((group, index) => {
                const normalized = normalizeBindGroupLayout(group, `ComputePipeline bind group ${index}`);
                return device.createBindGroupLayout({ label: normalized.label, entries: normalized.entries });
            });
            const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: layouts });
            this.pipeline = device.createComputePipeline({
                label: desc.label,
                layout: pipelineLayout,
                compute: {
                    module,
                    entryPoint: this.entryPoint,
                    constants: this.constants
                }
            });
            this.bindGroupLayouts = layouts;
        } else {
            this.pipeline = device.createComputePipeline({
                label: desc.label,
                layout: "auto",
                compute: {
                    module,
                    entryPoint: this.entryPoint,
                    constants: this.constants
                }
            });
            this.bindGroupLayouts = [];
        }
    }

    getBindGroupLayout(groupIndex: number): GPUBindGroupLayout {
        if (this.bindGroupLayouts.length > 0) {
            const layout = this.bindGroupLayouts[groupIndex];
            assert(!!layout, `Bind group layout ${groupIndex} not found (pipeline has ${this.bindGroupLayouts.length} explicit groups)`);
            return layout;
        }
        return this.pipeline.getBindGroupLayout(groupIndex);
    }

    createBindGroup(groupIndex: number, resources: BindGroupResources, label?: string): GPUBindGroup {
        const layout = this.getBindGroupLayout(groupIndex);
        const entries = normalizeBindGroupResources(resources, `ComputePipeline bind group ${groupIndex}`);
        return this.device.createBindGroup({
            label,
            layout,
            entries
        });
    }
}
