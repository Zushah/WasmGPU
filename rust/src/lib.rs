/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#![allow(non_snake_case)]
#![allow(clippy::too_many_arguments)]

mod accessors;
mod anim;
mod bounds;
mod cull;
#[cfg(target_arch = "wasm32")]
mod frame_arena;
#[cfg(target_arch = "wasm32")]
mod heap;
mod mat4;
mod mesh;
mod ndarray;
mod quat;
mod shared;
mod transform;
mod utils;
mod vec3;

#[cfg(test)]
mod tests;
