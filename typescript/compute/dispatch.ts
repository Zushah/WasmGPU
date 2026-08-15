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

export const validateWorkgroupsForDevice = (device: GPUDevice, workgroups: DispatchWorkgroups): void => {
    const { x, y, z } = normalizeWorkgroups(workgroups);
    const max = device.limits.maxComputeWorkgroupsPerDimension;
    assert(x <= max && y <= max && z <= max, `dispatchWorkgroups exceeds device.limits.maxComputeWorkgroupsPerDimension (${max})`);
};

const resolvePipeline = (p: GPUComputePipeline | ComputePipeline): GPUComputePipeline => {
    return (p instanceof ComputePipeline) ? p.pipeline : p;
};

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
    const { x, y, z } = normalizeWorkgroups(cmd.workgroups);
    if (x > 0 && y > 0 && z > 0) pass.dispatchWorkgroups(x, y, z);
    pass.end();
};

export const encodeDispatchBatch = (encoder: GPUCommandEncoder, commands: ReadonlyArray<ComputeDispatchCommand>, label?: string): void => {
    const pass = encoder.beginComputePass({ label });
    let lastPipeline: GPUComputePipeline | null = null;
    for (const cmd of commands) {
        const pipeline = resolvePipeline(cmd.pipeline);
        if (pipeline !== lastPipeline) {
            pass.setPipeline(pipeline);
            lastPipeline = pipeline;
        }
        if (cmd.bindGroups) {
            for (let i = 0; i < cmd.bindGroups.length; i++) {
                const bg = cmd.bindGroups[i];
                if (bg) pass.setBindGroup(i, bg);
            }
        }
        const { x, y, z } = normalizeWorkgroups(cmd.workgroups);
        if (x === 0 || y === 0 || z === 0) continue;
        if (cmd.label) pass.pushDebugGroup(cmd.label);
        pass.dispatchWorkgroups(x, y, z);
        if (cmd.label) pass.popDebugGroup();
    }
    pass.end();
};
