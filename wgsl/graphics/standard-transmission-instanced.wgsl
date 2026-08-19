/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const PI: f32 = 3.14159265359;

struct MaterialUniforms {
    color: vec4<f32>,
    emissive: vec4<f32>,
    params: vec4<f32>,
    params2: vec4<f32>,
    base_color_transform0: vec4<f32>,
    base_color_transform1: vec4<f32>,
    metallic_roughness_transform0: vec4<f32>,
    metallic_roughness_transform1: vec4<f32>,
    normal_transform0: vec4<f32>,
    normal_transform1: vec4<f32>,
    occlusion_transform0: vec4<f32>,
    occlusion_transform1: vec4<f32>,
    emissive_transform0: vec4<f32>,
    emissive_transform1: vec4<f32>,
    clearcoat_params: vec4<f32>,
    specular_params: vec4<f32>,
    extension_params: vec4<f32>,
    clearcoat_transform0: vec4<f32>,
    clearcoat_transform1: vec4<f32>,
    clearcoat_roughness_transform0: vec4<f32>,
    clearcoat_roughness_transform1: vec4<f32>,
    clearcoat_normal_transform0: vec4<f32>,
    clearcoat_normal_transform1: vec4<f32>,
    specular_transform0: vec4<f32>,
    specular_transform1: vec4<f32>,
    specular_color_transform0: vec4<f32>,
    specular_color_transform1: vec4<f32>,
    sheen_params: vec4<f32>,
    iridescence_params: vec4<f32>,
    anisotropy_params: vec4<f32>,
    sheen_color_transform0: vec4<f32>,
    sheen_color_transform1: vec4<f32>,
    sheen_roughness_transform0: vec4<f32>,
    sheen_roughness_transform1: vec4<f32>,
    iridescence_transform0: vec4<f32>,
    iridescence_transform1: vec4<f32>,
    iridescence_thickness_transform0: vec4<f32>,
    iridescence_thickness_transform1: vec4<f32>,
    anisotropy_transform0: vec4<f32>,
    anisotropy_transform1: vec4<f32>,
    transmission_params: vec4<f32>,
    diffuse_transmission_color: vec4<f32>,
    volume_attenuation: vec4<f32>,
    transmission_transform0: vec4<f32>,
    transmission_transform1: vec4<f32>,
    volume_thickness_transform0: vec4<f32>,
    volume_thickness_transform1: vec4<f32>,
    diffuse_transmission_transform0: vec4<f32>,
    diffuse_transmission_transform1: vec4<f32>,
    diffuse_transmission_color_transform0: vec4<f32>,
    diffuse_transmission_color_transform1: vec4<f32>,
}

struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(11) uv1: vec2<f32>,
    @location(12) tangent: vec4<f32>,
    @location(13) color: vec4<f32>,
    @location(3) m0: vec4<f32>,
    @location(4) m1: vec4<f32>,
    @location(5) m2: vec4<f32>,
    @location(6) m3: vec4<f32>,
    @location(7) n0: vec4<f32>,
    @location(8) n1: vec4<f32>,
    @location(9) n2: vec4<f32>,
    @location(10) n3: vec4<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) uv1: vec2<f32>,
    @location(4) tangent: vec4<f32>,
    @location(5) color: vec4<f32>,
    @location(6) model_scale: vec3<f32>,
}

struct CameraUniforms {
    view_projection: mat4x4<f32>,
    position: vec3<f32>,
}

struct Light {
    position: vec4<f32>,
    color: vec4<f32>,
    direction: vec4<f32>,
    params: vec4<f32>,
}

struct LightingUniforms {
    ambient: vec4<f32>,
    light_count: u32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
    lights: array<Light, 8>,
}

struct TangentFrame {
    t: vec3<f32>,
    b: vec3<f32>,
    n: vec3<f32>,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(2) var<uniform> lighting: LightingUniforms;
@group(1) @binding(0) var<uniform> material: MaterialUniforms;
@group(1) @binding(1) var base_color_sampler: sampler;
@group(1) @binding(2) var base_color_tex: texture_2d<f32>;
@group(1) @binding(3) var metallic_roughness_sampler: sampler;
@group(1) @binding(4) var metallic_roughness_tex: texture_2d<f32>;
@group(1) @binding(5) var normal_sampler: sampler;
@group(1) @binding(6) var normal_tex: texture_2d<f32>;
@group(1) @binding(7) var occlusion_sampler: sampler;
@group(1) @binding(8) var occlusion_tex: texture_2d<f32>;
@group(1) @binding(9) var emissive_sampler: sampler;
@group(1) @binding(10) var emissive_tex: texture_2d<f32>;
@group(1) @binding(11) var clearcoat_sampler: sampler;
@group(1) @binding(12) var clearcoat_tex: texture_2d<f32>;
@group(1) @binding(13) var clearcoat_roughness_sampler: sampler;
@group(1) @binding(14) var clearcoat_roughness_tex: texture_2d<f32>;
@group(1) @binding(15) var clearcoat_normal_sampler: sampler;
@group(1) @binding(16) var clearcoat_normal_tex: texture_2d<f32>;
@group(1) @binding(17) var specular_sampler: sampler;
@group(1) @binding(18) var specular_tex: texture_2d<f32>;
@group(1) @binding(19) var specular_color_sampler: sampler;
@group(1) @binding(20) var specular_color_tex: texture_2d<f32>;
@group(1) @binding(21) var sheen_color_sampler: sampler;
@group(1) @binding(22) var sheen_color_tex: texture_2d<f32>;
@group(1) @binding(23) var sheen_roughness_sampler: sampler;
@group(1) @binding(24) var sheen_roughness_tex: texture_2d<f32>;
@group(1) @binding(25) var iridescence_sampler: sampler;
@group(1) @binding(26) var iridescence_tex: texture_2d<f32>;
@group(1) @binding(27) var iridescence_thickness_sampler: sampler;
@group(1) @binding(28) var iridescence_thickness_tex: texture_2d<f32>;
@group(1) @binding(29) var anisotropy_sampler: sampler;
@group(1) @binding(30) var anisotropy_tex: texture_2d<f32>;
@group(1) @binding(31) var transmission_sampler: sampler;
@group(1) @binding(32) var transmission_tex: texture_2d<f32>;
@group(1) @binding(33) var volume_thickness_sampler: sampler;
@group(1) @binding(34) var volume_thickness_tex: texture_2d<f32>;
@group(1) @binding(35) var diffuse_transmission_sampler: sampler;
@group(1) @binding(36) var diffuse_transmission_tex: texture_2d<f32>;
@group(1) @binding(37) var diffuse_transmission_color_sampler: sampler;
@group(1) @binding(38) var diffuse_transmission_color_tex: texture_2d<f32>;
@group(1) @binding(39) var transmission_source_sampler: sampler;
@group(1) @binding(40) var transmission_source_tex: texture_2d<f32>;

fn apply_texture_transform(
    uv0: vec2<f32>,
    uv1: vec2<f32>,
    transform0: vec4<f32>,
    transform1: vec4<f32>,
) -> vec2<f32> {
    let uv = select(uv0, uv1, transform1.z >= 0.5);
    let scaled = uv * transform1.xy;
    let rotated = vec2<f32>(
        transform0.z * scaled.x + transform0.w * scaled.y,
        -transform0.w * scaled.x + transform0.z * scaled.y,
    );
    return rotated + transform0.xy;
}

fn fresnel_schlick(cos_theta: f32, f0: vec3<f32>, f90: vec3<f32>) -> vec3<f32> {
    let one_minus_cos = 1.0 - clamp(cos_theta, 0.0, 1.0);
    return f0 + (f90 - f0) * pow(one_minus_cos, 5.0);
}

fn max_component(v: vec3<f32>) -> f32 {
    return max(max(v.x, v.y), v.z);
}

fn distribution_ggx(n: vec3<f32>, h: vec3<f32>, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let a2 = a * a;
    let n_dot_h = max(dot(n, h), 0.0);
    let n_dot_h2 = n_dot_h * n_dot_h;
    let denom = n_dot_h2 * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
}

fn geometry_schlick_ggx(n_dot_v: f32, roughness: f32) -> f32 {
    let r = roughness + 1.0;
    let k = (r * r) / 8.0;
    return n_dot_v / (n_dot_v * (1.0 - k) + k);
}

fn geometry_smith(n: vec3<f32>, v: vec3<f32>, l: vec3<f32>, roughness: f32) -> f32 {
    let n_dot_v = max(dot(n, v), 0.0);
    let n_dot_l = max(dot(n, l), 0.0);
    return geometry_schlick_ggx(n_dot_v, roughness) * geometry_schlick_ggx(n_dot_l, roughness);
}

fn fallback_tangent_frame(normal: vec3<f32>) -> TangentFrame {
    let n = normalize(normal);
    let axis = select(vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(1.0, 0.0, 0.0), abs(n.x) < 0.9);
    let t = normalize(cross(axis, n));
    let b = cross(n, t);
    return TangentFrame(t, b, n);
}

fn derivative_tangent_frame(
    normal: vec3<f32>,
    world_pos: vec3<f32>,
    uv: vec2<f32>,
) -> TangentFrame {
    let n = normalize(normal);
    let dp1 = dpdx(world_pos);
    let dp2 = dpdy(world_pos);
    let duv1 = dpdx(uv);
    let duv2 = dpdy(uv);
    let dp2perp = cross(dp2, n);
    let dp1perp = cross(n, dp1);
    let t = (dp2perp * duv1.x) + (dp1perp * duv2.x);
    let b = (dp2perp * duv1.y) + (dp1perp * duv2.y);
    let frame_length2 = max(dot(t, t), dot(b, b));
    if (frame_length2 <= 1e-20) {
        return fallback_tangent_frame(n);
    }
    let frame_scale = 1.0 / sqrt(frame_length2);
    return TangentFrame(t * frame_scale, b * frame_scale, n);
}

fn build_tangent_frame(
    normal: vec3<f32>,
    tangent: vec4<f32>,
    world_pos: vec3<f32>,
    uv: vec2<f32>,
    face_sign: f32,
) -> TangentFrame {
    let n = normalize(normal);
    let derivative_frame = derivative_tangent_frame(n, world_pos, uv);
    var t = tangent.xyz - n * dot(n, tangent.xyz);
    let t_len2 = dot(t, t);
    if (t_len2 <= 1e-20) {
        return TangentFrame(
            derivative_frame.t,
            derivative_frame.b * face_sign,
            derivative_frame.n * face_sign,
        );
    }
    t = t * inverseSqrt(t_len2);
    let b =
        normalize(cross(n, t)) * select(-1.0, 1.0, tangent.w >= 0.0) * face_sign;
    return TangentFrame(t, b, n * face_sign);
}

fn apply_normal_map(
    n: vec3<f32>,
    tangent: vec4<f32>,
    world_pos: vec3<f32>,
    uv: vec2<f32>,
    normal_sample: vec3<f32>,
    normal_scale: f32,
    face_sign: f32,
) -> vec3<f32> {
    if (normal_scale == 0.0) {
        return normalize(n) * face_sign;
    }
    let frame = build_tangent_frame(n, tangent, world_pos, uv, face_sign);
    var ns = normal_sample * 2.0 - vec3<f32>(1.0);
    ns = vec3<f32>(ns.x * normal_scale, ns.y * normal_scale, ns.z);
    return normalize(frame.t * ns.x + frame.b * ns.y + frame.n * ns.z);
}

fn sqr(v: f32) -> f32 {
    return v * v;
}

fn ior_to_fresnel0(transmitted_ior: f32, incident_ior: f32) -> f32 {
    let r = (transmitted_ior - incident_ior) / (transmitted_ior + incident_ior);
    return r * r;
}

fn ior_to_fresnel0_vec(transmitted_ior: vec3<f32>, incident_ior: f32) -> vec3<f32> {
    let r =
        (transmitted_ior - vec3<f32>(incident_ior)) / (transmitted_ior + vec3<f32>(incident_ior));
    return r * r;
}

fn fresnel0_to_ior(f0: vec3<f32>) -> vec3<f32> {
    let sqrt_f0 = sqrt(clamp(f0, vec3<f32>(0.0), vec3<f32>(0.9999)));
    return (vec3<f32>(1.0) + sqrt_f0) / max(vec3<f32>(1.0) - sqrt_f0, vec3<f32>(1e-4));
}

fn fresnel_schlick_scalar(cos_theta: f32, f0: f32) -> f32 {
    let one_minus_cos = 1.0 - clamp(cos_theta, 0.0, 1.0);
    return f0 + (1.0 - f0) * pow(one_minus_cos, 5.0);
}

fn sanitize_reflectance(value: vec3<f32>, fallback: vec3<f32>) -> vec3<f32> {
    var result = clamp(fallback, vec3<f32>(0.0), vec3<f32>(1.0));
    if (value.x == value.x && abs(value.x) < 1.0e6) {
        result.x = clamp(value.x, 0.0, 1.0);
    }
    if (value.y == value.y && abs(value.y) < 1.0e6) {
        result.y = clamp(value.y, 0.0, 1.0);
    }
    if (value.z == value.z && abs(value.z) < 1.0e6) {
        result.z = clamp(value.z, 0.0, 1.0);
    }
    return result;
}

fn eval_iridescence_sensitivity(opd: f32, shift: vec3<f32>) -> vec3<f32> {
    let phase = 2.0 * PI * opd * 1.0e-9;
    let phase2 = phase * phase;
    let val = vec3<f32>(5.4856e-13, 4.4201e-13, 5.2481e-13);
    let pos = vec3<f32>(1.6810e+06, 1.7953e+06, 2.2084e+06);
    let variance = vec3<f32>(4.3278e+09, 9.3046e+09, 6.6121e+09);
    var xyz = val * sqrt(2.0 * PI * variance) * cos(pos * phase + shift) * exp(-phase2 * variance);
    xyz.x += 9.7470e-14
        * sqrt(2.0 * PI * 4.5282e+09)
        * cos(2.2399e+06 * phase + shift.x)
        * exp(-4.5282e+09 * phase2);
    xyz /= 1.0685e-7;
    return vec3<f32>(
        3.2404542 * xyz.x - 1.5371385 * xyz.y - 0.4985314 * xyz.z,
        -0.9692660 * xyz.x + 1.8760108 * xyz.y + 0.0415560 * xyz.z,
        0.0556434 * xyz.x - 0.2040259 * xyz.y + 1.0572252 * xyz.z,
    );
}

fn iridescent_fresnel(
    outside_ior: f32,
    iridescence_ior: f32,
    base_f0: vec3<f32>,
    thickness: f32,
    cos_theta1: f32,
) -> vec3<f32> {
    let safe_cos_theta1 = clamp(cos_theta1, 0.0, 1.0);
    let thin_film_ior = mix(outside_ior, iridescence_ior, smoothstep(0.0, 0.03, thickness));
    let r0 = ior_to_fresnel0(thin_film_ior, outside_ior);
    let r12 = fresnel_schlick_scalar(safe_cos_theta1, r0);
    let t121 = 1.0 - r12;
    let base_ior = fresnel0_to_ior(base_f0);
    let r1 = ior_to_fresnel0_vec(base_ior, thin_film_ior);
    let eta = outside_ior / thin_film_ior;
    let sin_theta2_sq = eta * eta * (1.0 - safe_cos_theta1 * safe_cos_theta1);
    let cos_theta2_sq = 1.0 - sin_theta2_sq;
    if (cos_theta2_sq < 0.0) {
        return vec3<f32>(1.0);
    }
    let cos_theta2 = sqrt(cos_theta2_sq);
    let r23 = fresnel_schlick(cos_theta2, r1, vec3<f32>(1.0));
    let phi12 = select(0.0, PI, thin_film_ior < outside_ior);
    let phi21 = PI - phi12;
    let phi23 = vec3<f32>(
        select(0.0, PI, base_ior.x < thin_film_ior),
        select(0.0, PI, base_ior.y < thin_film_ior),
        select(0.0, PI, base_ior.z < thin_film_ior),
    );
    let phi = vec3<f32>(phi21) + phi23;
    let opd = 2.0 * thin_film_ior * thickness * cos_theta2;
    let r123_product = clamp(vec3<f32>(r12) * r23, vec3<f32>(1e-5), vec3<f32>(0.9999));
    let r123 = sqrt(r123_product);
    let rs = sqr(t121) * r23 / (vec3<f32>(1.0) - r123_product);
    var i = vec3<f32>(r12) + rs;
    var cm = rs - vec3<f32>(t121);
    cm *= r123;
    i += cm * 2.0 * eval_iridescence_sensitivity(opd, phi);
    cm *= r123;
    i += cm * 2.0 * eval_iridescence_sensitivity(2.0 * opd, 2.0 * phi);
    return sanitize_reflectance(i, base_f0);
}

fn distribution_ggx_anisotropic(n_dot_h: f32, t_dot_h: f32, b_dot_h: f32, at: f32, ab: f32) -> f32 {
    let a2 = at * ab;
    let f = vec3<f32>(ab * t_dot_h, at * b_dot_h, a2 * n_dot_h);
    let w2 = a2 / max(dot(f, f), 1e-8);
    return a2 * w2 * w2 / PI;
}

fn visibility_ggx_anisotropic(
    n_dot_l: f32,
    n_dot_v: f32,
    b_dot_v: f32,
    t_dot_v: f32,
    t_dot_l: f32,
    b_dot_l: f32,
    at: f32,
    ab: f32,
) -> f32 {
    let ggx_v = n_dot_l * length(vec3<f32>(at * t_dot_v, ab * b_dot_v, n_dot_v));
    let ggx_l = n_dot_v * length(vec3<f32>(at * t_dot_l, ab * b_dot_l, n_dot_l));
    return clamp(0.5 / max(ggx_v + ggx_l, 1e-8), 0.0, 1.0);
}

fn sheen_distribution(n_dot_h: f32, sheen_roughness: f32) -> f32 {
    let alpha_g = max(sheen_roughness * sheen_roughness, 1e-4);
    let inv_r = 1.0 / alpha_g;
    let sin2h = max(1.0 - n_dot_h * n_dot_h, 0.0);
    return (2.0 + inv_r) * pow(sin2h, inv_r * 0.5) / (2.0 * PI);
}

fn sheen_l(cos_theta: f32, alpha_g: f32) -> f32 {
    let one_minus_alpha_sq = sqr(1.0 - alpha_g);
    let a = mix(21.5473, 25.3245, one_minus_alpha_sq);
    let b = mix(3.82987, 3.32435, one_minus_alpha_sq);
    let c = mix(0.19823, 0.16801, one_minus_alpha_sq);
    let d = mix(-1.97760, -1.27393, one_minus_alpha_sq);
    let e = mix(-4.32054, -4.85967, one_minus_alpha_sq);
    return a / (1.0 + b * pow(cos_theta, c)) + d * cos_theta + e;
}

fn sheen_lambda(cos_theta: f32, alpha_g: f32) -> f32 {
    let safe_cos_theta = clamp(cos_theta, 1e-4, 1.0);
    if (safe_cos_theta < 0.5) {
        return exp(sheen_l(safe_cos_theta, alpha_g));
    }
    return exp(2.0 * sheen_l(0.5, alpha_g) - sheen_l(1.0 - safe_cos_theta, alpha_g));
}

fn sheen_visibility(n_dot_l: f32, n_dot_v: f32, sheen_roughness: f32) -> f32 {
    let alpha_g = max(sheen_roughness * sheen_roughness, 1e-4);
    let visibility = 1.0 + sheen_lambda(n_dot_v, alpha_g) + sheen_lambda(n_dot_l, alpha_g);
    return clamp(1.0 / max(visibility * 4.0 * n_dot_v * n_dot_l, 1e-6), 0.0, 1.0);
}

fn dielectric_f0_from_ior(ior: f32) -> f32 {
    if (ior == 0.0) {
        return 1.0;
    }
    let safe_ior = max(ior, 1.0);
    let r = (safe_ior - 1.0) / (safe_ior + 1.0);
    return r * r;
}

fn standard_direct_visibility(light_index: u32, world_position: vec3<f32>, geometric_normal: vec3<f32>, light_direction: vec3<f32>, world_position_dx: vec3<f32>, world_position_dy: vec3<f32>) -> f32 { return 1.0; }

fn compute_range_attenuation(distance: f32, range: f32) -> f32 {
    let inv_sq = 1.0 / max(distance * distance, 0.0001);
    if (range <= 0.0) {
        return inv_sq;
    }
    let fade = clamp(1.0 - distance / range, 0.0, 1.0);
    return inv_sq * fade * fade;
}

fn compute_spot_factor(l: vec3<f32>, direction: vec3<f32>, cos_inner: f32, cos_outer: f32) -> f32 {
    let angle_cos = dot(-l, normalize(direction));
    if (cos_inner <= cos_outer) {
        return select(0.0, 1.0, angle_cos >= cos_outer);
    }
    return clamp((angle_cos - cos_outer) / max(cos_inner - cos_outer, 1e-4), 0.0, 1.0);
}

fn screen_uv_from_fragment(position: vec4<f32>) -> vec2<f32> {
    let dims = vec2<f32>(textureDimensions(transmission_source_tex, 0));
    return clamp(position.xy / max(dims, vec2<f32>(1.0)), vec2<f32>(0.0), vec2<f32>(1.0));
}

fn project_world_to_screen_uv(world_pos: vec3<f32>) -> vec2<f32> {
    let clip = camera.view_projection * vec4<f32>(world_pos, 1.0);
    let inv_w = 1.0 / max(abs(clip.w), 1e-5);
    let ndc = clip.xy * inv_w * select(-1.0, 1.0, clip.w >= 0.0);
    return clamp(vec2<f32>(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5), vec2<f32>(0.0), vec2<f32>(1.0));
}

fn transmission_screen_uv(
    position: vec4<f32>,
    world_pos: vec3<f32>,
    n: vec3<f32>,
    v: vec3<f32>,
    ior: f32,
    thickness: f32,
    model_scale: vec3<f32>,
) -> vec2<f32> {
    let base_uv = screen_uv_from_fragment(position);
    if (thickness <= 1e-5) {
        return base_uv;
    }
    let eta = 1.0 / max(ior, 1.0001);
    var ray = refract(-v, n, eta);
    let ray_length2 = dot(ray, ray);
    if (ray_length2 <= 1e-8) {
        ray = -v;
    } else {
        ray = ray * inverseSqrt(ray_length2);
    }
    let transmission_ray = ray * max(thickness, 0.0) * max(model_scale, vec3<f32>(1e-4));
    return project_world_to_screen_uv(world_pos + transmission_ray);
}

fn transmission_source_to_linear(color: vec3<f32>) -> vec3<f32> {
    return pow(clamp(color, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(2.2));
}

fn sample_transmission_source_at(uv: vec2<f32>) -> vec3<f32> {
    let source_color = textureSampleLevel(
        transmission_source_tex,
        transmission_source_sampler,
        clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0)),
        0.0,
    ).rgb;
    return transmission_source_to_linear(source_color);
}

fn dispersion_iors(ior: f32, dispersion: f32) -> vec3<f32> {
    let half_spread = max(ior - 1.0, 0.0) * 0.025 * max(dispersion, 0.0);
    return max(vec3<f32>(ior - half_spread, ior, ior + half_spread), vec3<f32>(1.0));
}

fn sample_transmission_source(
    position: vec4<f32>,
    world_pos: vec3<f32>,
    n: vec3<f32>,
    v: vec3<f32>,
    ior: f32,
    dispersion: f32,
    thickness: f32,
    model_scale: vec3<f32>,
) -> vec3<f32> {
    if (dispersion <= 1e-5 || thickness <= 1e-5) {
        return sample_transmission_source_at(
            transmission_screen_uv(position, world_pos, n, v, ior, thickness, model_scale),
        );
    }
    let iors = dispersion_iors(ior, dispersion);
    let r = sample_transmission_source_at(
        transmission_screen_uv(position, world_pos, n, v, iors.r, thickness, model_scale),
    ).r;
    let g = sample_transmission_source_at(
        transmission_screen_uv(position, world_pos, n, v, iors.g, thickness, model_scale),
    ).g;
    let b = sample_transmission_source_at(
        transmission_screen_uv(position, world_pos, n, v, iors.b, thickness, model_scale),
    ).b;
    return vec3<f32>(r, g, b);
}

fn volume_transmission_attenuation(
    thickness: f32,
    attenuation_distance: f32,
    attenuation_color: vec3<f32>,
) -> vec3<f32> {
    if (thickness <= 1e-5 || attenuation_distance <= 1e-5) {
        return vec3<f32>(1.0);
    }
    return pow(
        max(attenuation_color, vec3<f32>(1e-4)),
        vec3<f32>(thickness / attenuation_distance),
    );
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let model_m = mat4x4<f32>(in.m0, in.m1, in.m2, in.m3);
    let normal_m = mat4x4<f32>(in.n0, in.n1, in.n2, in.n3);
    let world_pos4 = model_m * vec4<f32>(in.position, 1.0);
    out.position = camera.view_projection * world_pos4;
    out.world_pos = world_pos4.xyz;
    out.normal = normalize((normal_m * vec4<f32>(in.normal, 0.0)).xyz);
    out.tangent = vec4<f32>((normal_m * vec4<f32>(in.tangent.xyz, 0.0)).xyz, in.tangent.w);
    out.model_scale = vec3<f32>(
        length(model_m[0].xyz),
        length(model_m[1].xyz),
        length(model_m[2].xyz),
    );
    out.uv = in.uv;
    out.uv1 = in.uv1;
    out.color = in.color;
    return out;
}

@fragment
fn fs_main(in: VertexOutput, @builtin(front_facing) is_front: bool) -> @location(0) vec4<f32> {
    let face_sign = select(-1.0, 1.0, is_front);
    let front_geom_normal = normalize(in.normal);
    let geom_normal = front_geom_normal * face_sign;
    let shadow_world_dx = dpdx(in.world_pos);
    let shadow_world_dy = dpdy(in.world_pos);

    let base_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.base_color_transform0,
        material.base_color_transform1,
    );
    let mr_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.metallic_roughness_transform0,
        material.metallic_roughness_transform1,
    );
    let normal_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.normal_transform0,
        material.normal_transform1,
    );
    let occlusion_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.occlusion_transform0,
        material.occlusion_transform1,
    );
    let emissive_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.emissive_transform0,
        material.emissive_transform1,
    );
    let clearcoat_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.clearcoat_transform0,
        material.clearcoat_transform1,
    );
    let clearcoat_roughness_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.clearcoat_roughness_transform0,
        material.clearcoat_roughness_transform1,
    );
    let clearcoat_normal_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.clearcoat_normal_transform0,
        material.clearcoat_normal_transform1,
    );
    let specular_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.specular_transform0,
        material.specular_transform1,
    );
    let specular_color_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.specular_color_transform0,
        material.specular_color_transform1,
    );
    let sheen_color_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.sheen_color_transform0,
        material.sheen_color_transform1,
    );
    let sheen_roughness_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.sheen_roughness_transform0,
        material.sheen_roughness_transform1,
    );
    let iridescence_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.iridescence_transform0,
        material.iridescence_transform1,
    );
    let iridescence_thickness_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.iridescence_thickness_transform0,
        material.iridescence_thickness_transform1,
    );
    let anisotropy_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.anisotropy_transform0,
        material.anisotropy_transform1,
    );
    let transmission_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.transmission_transform0,
        material.transmission_transform1,
    );
    let volume_thickness_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.volume_thickness_transform0,
        material.volume_thickness_transform1,
    );
    let diffuse_transmission_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.diffuse_transmission_transform0,
        material.diffuse_transmission_transform1,
    );
    let diffuse_transmission_color_uv = apply_texture_transform(
        in.uv,
        in.uv1,
        material.diffuse_transmission_color_transform0,
        material.diffuse_transmission_color_transform1,
    );
    let base_sample = textureSample(base_color_tex, base_color_sampler, base_uv);
    let base_color = material.color * base_sample * in.color;
    let alpha_cutoff = material.params2.x;
    if (alpha_cutoff > 0.0 && base_color.a < alpha_cutoff) {
        discard;
    }
    let mr_sample = textureSample(metallic_roughness_tex, metallic_roughness_sampler, mr_uv);
    let metallic = clamp(material.params.x * mr_sample.b, 0.0, 1.0);
    let roughness = clamp(material.params.y * mr_sample.g, 0.04, 1.0);
    let normal_sample = textureSample(normal_tex, normal_sampler, normal_uv).xyz;
    let n = apply_normal_map(
        front_geom_normal,
        in.tangent,
        in.world_pos,
        normal_uv,
        normal_sample,
        material.params.z,
        face_sign,
    );
    let occl_sample = textureSample(occlusion_tex, occlusion_sampler, occlusion_uv).r;
    let ao = 1.0 + material.params.w * (occl_sample - 1.0);
    let emissive_sample = textureSample(emissive_tex, emissive_sampler, emissive_uv).rgb;
    let emissive =
        emissive_sample * material.emissive.rgb * material.emissive.a * material.extension_params.y;
    let clearcoat = clamp(
        material.clearcoat_params.x
            * textureSample(clearcoat_tex, clearcoat_sampler, clearcoat_uv).r,
        0.0,
        1.0,
    );
    let clearcoat_roughness = clamp(
        material.clearcoat_params.y
            * textureSample(
                clearcoat_roughness_tex,
                clearcoat_roughness_sampler,
                clearcoat_roughness_uv,
            ).g,
        0.04,
        1.0,
    );
    let clearcoat_normal_sample = textureSample(
        clearcoat_normal_tex,
        clearcoat_normal_sampler,
        clearcoat_normal_uv,
    ).xyz;
    let clearcoat_normal = apply_normal_map(
        front_geom_normal,
        in.tangent,
        in.world_pos,
        clearcoat_normal_uv,
        clearcoat_normal_sample,
        material.clearcoat_params.z,
        face_sign,
    );
    let specular_strength = clamp(
        material.specular_params.x * textureSample(specular_tex, specular_sampler, specular_uv).a,
        0.0,
        1.0,
    );
    let specular_color = material.specular_params.yzw
            * textureSample(specular_color_tex, specular_color_sampler, specular_color_uv).rgb;
    let sheen_color = material.sheen_params.rgb
            * textureSample(sheen_color_tex, sheen_color_sampler, sheen_color_uv).rgb;
    let sheen_roughness = clamp(
        material.sheen_params.w
            * textureSample(sheen_roughness_tex, sheen_roughness_sampler, sheen_roughness_uv).a,
        0.0,
        1.0,
    );
    let iridescence = clamp(
        material.iridescence_params.x
            * textureSample(iridescence_tex, iridescence_sampler, iridescence_uv).r,
        0.0,
        1.0,
    );
    let iridescence_thickness_sample = textureSample(
        iridescence_thickness_tex,
        iridescence_thickness_sampler,
        iridescence_thickness_uv,
    ).g;
    let iridescence_thickness = mix(
        material.iridescence_params.z,
        material.iridescence_params.w,
        iridescence_thickness_sample,
    );
    let anisotropy_sample = textureSample(anisotropy_tex, anisotropy_sampler, anisotropy_uv).rgb;
    let transmission = clamp(
        material.transmission_params.x
            * textureSample(transmission_tex, transmission_sampler, transmission_uv).r,
        0.0,
        1.0,
    );
    let diffuse_transmission = clamp(
        material.transmission_params.y
            * textureSample(
                diffuse_transmission_tex,
                diffuse_transmission_sampler,
                diffuse_transmission_uv,
            ).a,
        0.0,
        1.0,
    );
    let volume_thickness = max(
        material.transmission_params.z
            * textureSample(volume_thickness_tex, volume_thickness_sampler, volume_thickness_uv).g,
        0.0,
    );
    let dispersion = max(material.transmission_params.w, 0.0);
    let diffuse_transmission_color = material.diffuse_transmission_color.rgb
            * textureSample(
                diffuse_transmission_color_tex,
                diffuse_transmission_color_sampler,
                diffuse_transmission_color_uv,
            ).rgb;
    let volume_attenuation = volume_transmission_attenuation(
        volume_thickness,
        material.diffuse_transmission_color.w,
        material.volume_attenuation.rgb,
    );
    let anisotropy_strength = clamp(material.anisotropy_params.x * anisotropy_sample.b, 0.0, 1.0);
    var anisotropy_direction = anisotropy_sample.rg * 2.0 - vec2<f32>(1.0);
    let anisotropy_direction_length2 = dot(anisotropy_direction, anisotropy_direction);
    anisotropy_direction = select(
        vec2<f32>(1.0, 0.0),
        anisotropy_direction * inverseSqrt(max(anisotropy_direction_length2, 1e-8)),
        anisotropy_direction_length2 > 1e-8,
    );
    anisotropy_direction = vec2<f32>(
        material.anisotropy_params.y * anisotropy_direction.x
            - material.anisotropy_params.z * anisotropy_direction.y,
        material.anisotropy_params.z * anisotropy_direction.x
            + material.anisotropy_params.y * anisotropy_direction.y,
    );
    let albedo = base_color.rgb;
    let v = normalize(camera.position - in.world_pos);
    let dielectric_f0 = dielectric_f0_from_ior(material.extension_params.x);
    let dielectric_f0_color =
        min(vec3<f32>(dielectric_f0) * specular_color, vec3<f32>(1.0)) * specular_strength;
    let f0 = mix(dielectric_f0_color, albedo, metallic);
    let f90 = mix(vec3<f32>(specular_strength), vec3<f32>(1.0), metallic);
    let view_ndot_v = max(dot(n, v), 0.0);
    var iridescence_fresnel_color = f0;
    if (iridescence > 1e-5 && iridescence_thickness > 0.0) {
        iridescence_fresnel_color = iridescent_fresnel(
            1.0,
            material.iridescence_params.y,
            f0,
            iridescence_thickness,
            view_ndot_v,
        );
    }
    var view_fresnel = fresnel_schlick(view_ndot_v, f0, f90);
    if (iridescence > 1e-5) {
        view_fresnel = mix(view_fresnel, iridescence_fresnel_color, iridescence);
    }
    let transmission_weight =
        transmission * (1.0 - metallic) * max(1.0 - max_component(view_fresnel), 0.0);
    let geometric_n = geom_normal;
    let anisotropy_frame = build_tangent_frame(
        front_geom_normal,
        in.tangent,
        in.world_pos,
        anisotropy_uv,
        face_sign,
    );
    let clearcoat_view_fresnel = clamp(
        clearcoat * fresnel_schlick_scalar(abs(dot(v, clearcoat_normal)), 0.04),
        0.0,
        1.0,
    );
    var lo = lighting.ambient.rgb * albedo * ao * (1.0 - transmission);
    for (var i = 0u; i < lighting.light_count; i++) {
        let light = lighting.lights[i];
        var l: vec3<f32>;
        var attenuation: f32 = 1.0;
        if (light.position.w == 0.0) {
            l = normalize(-light.position.xyz);
        } else {
            let light_dir = light.position.xyz - in.world_pos;
            let distance = length(light_dir);
            if (distance <= 1e-5) {
                continue;
            }
            l = light_dir / distance;
            attenuation = compute_range_attenuation(distance, light.params.x);
            if (light.position.w == 2.0) {
                attenuation = attenuation
                        * compute_spot_factor(
                            l,
                            light.direction.xyz,
                            light.params.y,
                            light.params.z,
                        );
            }
        }
        if (attenuation <= 0.0) {
            continue;
        }
        let h = normalize(v + l);
        let radiance = light.color.rgb * light.color.a * attenuation * standard_direct_visibility(i, in.world_pos, geom_normal, l, shadow_world_dx, shadow_world_dy);
        let n_dot_l = max(dot(n, l), 0.0);
        let n_dot_v = view_ndot_v;
        let n_dot_h = max(dot(n, h), 0.0);
        let vdot_h = max(dot(v, h), 0.0);
        let base_f = fresnel_schlick(vdot_h, f0, f90);
        var f = base_f;
        if (iridescence > 1e-5) {
            f = mix(base_f, iridescence_fresnel_color, iridescence);
        }
        var specular_brdf: vec3<f32>;
        if (anisotropy_strength > 1e-5) {
            let anisotropic_t = normalize(
                anisotropy_frame.t * anisotropy_direction.x
                    + anisotropy_frame.b * anisotropy_direction.y,
            );
            let anisotropic_b = normalize(cross(geometric_n, anisotropic_t));
            let t_dot_v = dot(anisotropic_t, v);
            let b_dot_v = dot(anisotropic_b, v);
            let t_dot_l = dot(anisotropic_t, l);
            let b_dot_l = dot(anisotropic_b, l);
            let t_dot_h = dot(anisotropic_t, h);
            let b_dot_h = dot(anisotropic_b, h);
            let alpha_roughness = max(roughness * roughness, 0.001);
            let at = mix(alpha_roughness, 1.0, anisotropy_strength * anisotropy_strength);
            let ab = alpha_roughness;
            let d = distribution_ggx_anisotropic(n_dot_h, t_dot_h, b_dot_h, at, ab);
            let vg = visibility_ggx_anisotropic(
                n_dot_l,
                n_dot_v,
                b_dot_v,
                t_dot_v,
                t_dot_l,
                b_dot_l,
                at,
                ab,
            );
            specular_brdf = f * d * vg;
        } else {
            let ndf = distribution_ggx(n, h, roughness);
            let g = geometry_smith(n, v, l, roughness);
            let numerator = ndf * g * f;
            let denominator = 4.0 * n_dot_v * n_dot_l + 0.0001;
            specular_brdf = numerator / denominator;
        }
        let sheen_d = sheen_distribution(n_dot_h, sheen_roughness);
        let sheen_v = sheen_visibility(n_dot_l, n_dot_v, sheen_roughness);
        let sheen_brdf = sheen_color * sheen_d * sheen_v;
        let diffuse_energy = max(1.0 - max_component(f), 0.0);
        let k_d = vec3<f32>(diffuse_energy) * (1.0 - metallic);
        let front_diffuse = (1.0 - diffuse_transmission) * k_d * albedo * radiance * n_dot_l / PI;
        let back_diffuse = diffuse_transmission
                * k_d
                * diffuse_transmission_color
                * radiance
                * max(dot(-n, l), 0.0)
                / PI;
        let diffuse_contribution = (front_diffuse + back_diffuse) * (1.0 - transmission);
        let specular_contribution = (specular_brdf + sheen_brdf) * radiance * n_dot_l;
        let base_contribution = diffuse_contribution + specular_contribution;
        let clearcoat_ndot_l = max(dot(clearcoat_normal, l), 0.0);
        let clearcoat_ndot_v = max(dot(clearcoat_normal, v), 0.0);
        let clearcoat_ndf = distribution_ggx(clearcoat_normal, h, clearcoat_roughness);
        let clearcoat_g = geometry_smith(clearcoat_normal, v, l, clearcoat_roughness);
        let clearcoat_brdf =
            clearcoat_ndf * clearcoat_g / (4.0 * clearcoat_ndot_v * clearcoat_ndot_l + 0.0001);
        let clearcoat_contribution = vec3<f32>(clearcoat_brdf) * radiance * clearcoat_ndot_l;
        lo += mix(base_contribution, clearcoat_contribution, clearcoat_view_fresnel);
    }
    if (transmission_weight > 1e-5) {
        let transmitted_source = sample_transmission_source(
            in.position,
            in.world_pos,
            n,
            v,
            material.extension_params.x,
            dispersion,
            volume_thickness,
            in.model_scale,
        );
        lo += transmitted_source
            * albedo
            * volume_attenuation
            * transmission_weight
            * (1.0 - clearcoat_view_fresnel);
    }
    lo += emissive * (1.0 - clearcoat_view_fresnel);
    lo = lo / (lo + vec3<f32>(1.0));
    lo = pow(lo, vec3<f32>(1.0 / 2.2));
    return vec4<f32>(lo, base_color.a);
}
