/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert, isNonNegativeInt } from "../utils";
import type { WorkgroupCounts } from "./workgroups";
import { ComputePipeline } from "./pipeline";

export type DispatchWorkgroups = WorkgroupCounts | { x: number; y?: number; z?: number };

export type ComputeDispatchCommand = {
    pipeline: GPUComputePipeline | ComputePipeline;
    bindGroups?: ReadonlyArray<GPUBindGroup | null | undefined>;
    workgroups: DispatchWorkgroups;
    label?: string;
};

export const normalizeWorkgroups = (w: DispatchWorkgroups): { x: number; y: number; z: number } => {
    if (Array.isArray(w)) {
        const x = w[0] ?? 0;
        const y = w[1] ?? 1;
        const z = w[2] ?? 1;
        assert(isNonNegativeInt(x), `workgroups.x must be an integer >= 0 (got ${x})`);
        assert(isNonNegativeInt(y), `workgroups.y must be an integer >= 0 (got ${y})`);
        assert(isNonNegativeInt(z), `workgroups.z must be an integer >= 0 (got ${z})`);
        return { x, y, z };
    }
    const x = (w as { x: number; y?: number; z?: number }).x;
    const y = (w as { x: number; y?: number; z?: number }).y ?? 1;
    const z = (w as { x: number; y?: number; z?: number }).z ?? 1;
    assert(isNonNegativeInt(x), `workgroups.x must be an integer >= 0 (got ${x})`);
    assert(isNonNegativeInt(y), `workgroups.y must be an integer >= 0 (got ${y})`);
    assert(isNonNegativeInt(z), `workgroups.z must be an integer >= 0 (got ${z})`);
    return { x, y, z };
};

export const validateWorkgroupsForDevice = (device: GPUDevice, workgroups: DispatchWorkgroups): void => validateWorkgroups(workgroups, device.limits.maxComputeWorkgroupsPerDimension);

const validateWorkgroups = (w: DispatchWorkgroups, maxWorkgroupsPerDimension?: number): void => {
    const obj = w as { x: number; y?: number; z?: number }, x = Array.isArray(w) ? (w[0] ?? 0) : obj.x, y = Array.isArray(w) ? (w[1] ?? 1) : (obj.y ?? 1), z = Array.isArray(w) ? (w[2] ?? 1) : (obj.z ?? 1);
    assert(isNonNegativeInt(x), `workgroups.x must be an integer >= 0 (got ${x})`);
    assert(isNonNegativeInt(y), `workgroups.y must be an integer >= 0 (got ${y})`);
    assert(isNonNegativeInt(z), `workgroups.z must be an integer >= 0 (got ${z})`);
    if (maxWorkgroupsPerDimension !== undefined) assert(x <= maxWorkgroupsPerDimension && y <= maxWorkgroupsPerDimension && z <= maxWorkgroupsPerDimension, `dispatchWorkgroups exceeds device.limits.maxComputeWorkgroupsPerDimension (${maxWorkgroupsPerDimension})`);
};

const resolvePipeline = (p: GPUComputePipeline | ComputePipeline): GPUComputePipeline => (p instanceof ComputePipeline) ? p.pipeline : p;

export const encodeDispatch = (encoder: GPUCommandEncoder, cmd: ComputeDispatchCommand): void => {
    const pass = encoder.beginComputePass({ label: cmd.label });
    const pipeline = resolvePipeline(cmd.pipeline);
    pass.setPipeline(pipeline);
    if (cmd.bindGroups) {
        for (let i = 0; i < cmd.bindGroups.length; i++) {
            const bg = cmd.bindGroups[i];
            if (bg) pass.setBindGroup(i, bg);
        }
    }
    const w = cmd.workgroups, obj = w as { x: number; y?: number; z?: number }, x = Array.isArray(w) ? (w[0] ?? 0) : obj.x, y = Array.isArray(w) ? (w[1] ?? 1) : (obj.y ?? 1), z = Array.isArray(w) ? (w[2] ?? 1) : (obj.z ?? 1);
    assert(isNonNegativeInt(x), `workgroups.x must be an integer >= 0 (got ${x})`);
    assert(isNonNegativeInt(y), `workgroups.y must be an integer >= 0 (got ${y})`);
    assert(isNonNegativeInt(z), `workgroups.z must be an integer >= 0 (got ${z})`);
    if (x > 0 && y > 0 && z > 0) pass.dispatchWorkgroups(x, y, z);
    pass.end();
};

export const encodeDispatchBatch = (encoder: GPUCommandEncoder, commands: ReadonlyArray<ComputeDispatchCommand>, label?: string): void => {
    encodeDispatchBatchWithLimit(encoder, commands, label);
};

export const encodeDispatchBatchWithLimit = (encoder: GPUCommandEncoder, commands: ReadonlyArray<ComputeDispatchCommand>, label?: string, maxWorkgroupsPerDimension?: number): void => {
    for (let commandIndex = 0; commandIndex < commands.length; commandIndex++) validateWorkgroups(commands[commandIndex]!.workgroups, maxWorkgroupsPerDimension);
    const pass = encoder.beginComputePass({ label });
    let lastPipelineSource: GPUComputePipeline | ComputePipeline | null = null;
    let lastPipeline: GPUComputePipeline | null = null;
    let lastBindGroupsSource: ReadonlyArray<GPUBindGroup | null | undefined> | null = null;
    const lastBindGroups: Array<GPUBindGroup | undefined> = [];
    let lastWorkgroupsSource: DispatchWorkgroups | null = null;
    let lastX = 0, lastY = 1, lastZ = 1;
    for (let commandIndex = 0; commandIndex < commands.length; commandIndex++) {
        const cmd = commands[commandIndex]!;
        const pipeline: GPUComputePipeline = (cmd.pipeline === lastPipelineSource && lastPipeline !== null) ? lastPipeline : resolvePipeline(cmd.pipeline);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
            lastBindGroupsSource = null;
            lastBindGroups.length = 0;
        }
        lastPipelineSource = cmd.pipeline;
        if (cmd.bindGroups && cmd.bindGroups !== lastBindGroupsSource) {
            for (let i = 0; i < cmd.bindGroups.length; i++) {
                const bg = cmd.bindGroups[i];
                if (bg && bg !== lastBindGroups[i]) {
                    pass.setBindGroup(i, bg);
                    lastBindGroups[i] = bg;
                }
            }
            lastBindGroupsSource = cmd.bindGroups;
        }
        const w = cmd.workgroups;
        if (w !== lastWorkgroupsSource) {
            const obj = w as { x: number; y?: number; z?: number };
            lastX = Array.isArray(w) ? (w[0] ?? 0) : obj.x;
            lastY = Array.isArray(w) ? (w[1] ?? 1) : (obj.y ?? 1);
            lastZ = Array.isArray(w) ? (w[2] ?? 1) : (obj.z ?? 1);
            lastWorkgroupsSource = w;
        }
        const x = lastX;
        const y = lastY;
        const z = lastZ;
        if (x === 0 || y === 0 || z === 0) continue;
        if (cmd.label) pass.pushDebugGroup(cmd.label);
        pass.dispatchWorkgroups(x, y, z);
        if (cmd.label) pass.popDebugGroup();
    }
    pass.end();
};
