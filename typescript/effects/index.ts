/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ShadowSystem, ShadowSystemDescriptor } from "./shadows";

export type RenderEffectsDescriptor = {
    shadows?: ShadowSystemDescriptor;
};

export class RenderEffects {
    readonly shadows: ShadowSystem;

    constructor(descriptor: RenderEffectsDescriptor = {}) {
        this.shadows = new ShadowSystem(descriptor.shadows);
    }

    destroy(): void {
        this.shadows.destroy();
    }
}

export { ShadowSystem } from "./shadows";
export type { DirectionalShadowConfiguration, DirectionalShadowDescriptor, DirectionalShadowVolume, ShadowFilter, ShadowSystemDescriptor, ShadowUpdateMode } from "./shadows";
