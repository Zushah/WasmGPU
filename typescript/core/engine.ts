/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Renderer, RendererDescriptor, RendererCullingStats } from "./renderer";
import type { RendererPickHit } from "./renderer";
import { PerformanceStats } from "./stats";
import type { PerformanceStatsDescriptor } from "./stats";
import { Transform } from "./transform";
import { Compute } from "../compute";
import type { ComputeDescriptor } from "../compute";
import { RenderEffects } from "../effects";
import { loadGltf, importGltf, parseGLB, readAccessor, readAccessorAsFloat32, readAccessorAsUint16, readIndicesAsUint32 } from "../gltf";
import type { GltfDocument, LoadGltfOptions, ImportGltfOptions, GltfImportResult, ParsedGLB, AccessorView } from "../gltf";
import { AnimationClip, AnimationPlayer, Skin } from "../graphics/animation";
import type { AnimationClipDescriptor } from "../graphics/animation";
import { Colormap } from "../graphics/colormap";
import type { BuiltinColormapName, ColormapDescriptor, ColormapStop } from "../graphics/colormap";
import { Geometry } from "../graphics/geometry";
import type { GeometryDescriptor, CartesianCurveDescriptor, CartesianSurfaceDescriptor, ParametricCurveDescriptor, ParametricSurfaceDescriptor } from "../graphics/geometry";
import { Material, UnlitMaterial, StandardMaterial, DataMaterial, CustomMaterial, Color } from "../graphics/material";
import type { UnlitMaterialDescriptor, StandardMaterialDescriptor, DataMaterialDescriptor, CustomMaterialDescriptor } from "../graphics/material";
import { Texture2D } from "../graphics/texture";
import type { Texture2DDescriptor } from "../graphics/texture";
import { AnnotationToolkit } from "../overlay";
import type { AnnotationToolkitDescriptor } from "../overlay";
import { OverlaySystem, AxisTriadLayer, GridLayer, LegendLayer } from "../overlay";
import type { OverlaySystemDescriptor, AxisTriadLayerDescriptor, GridLayerDescriptor, LegendLayerDescriptor } from "../overlay";
import { PythonInterop } from "../python";
import { ScaleService } from "../scaling";
import { driver, frameArena, initWebAssembly, mat4, mat4d, mat4f, quat, quatd, quatf, vec3, vec3d, vec3f, WasmHeapArena, webassemblyInterop } from "../wasm";
import { Camera, PerspectiveCamera, OrthographicCamera } from "../world/camera";
import type { PerspectiveCameraDescriptor, OrthographicCameraDescriptor } from "../world/camera";
import { NavigationControls, OrbitControls, TrackballControls, FlyControls } from "../world/controls";
import type { NavigationControlsDescriptor, OrbitControlsDescriptor, TrackballControlsDescriptor, FlyControlsDescriptor } from "../world/controls";
import { GlyphField } from "../world/glyphfield";
import type { GlyphFieldDescriptor } from "../world/glyphfield";
import { LatticeSpace } from "../world/latticespace";
import type { LatticeSpaceDescriptor } from "../world/latticespace";
import { AmbientLight, DirectionalLight, PointLight, SpotLight } from "../world/light";
import { Mesh } from "../world/mesh";
import { NodeLink } from "../world/nodelink";
import type { NodeLinkDescriptor } from "../world/nodelink";
import { SelectionStore } from "../world/picking";
import type { PickAttributes, PickHit, PickLassoPoint, PickQuery, PickRegionQuery, PickRegionResult, PickResult } from "../world/picking";
import { PointCloud } from "../world/pointcloud";
import type { PointCloudDescriptor } from "../world/pointcloud";
import { Scene } from "../world/scene";
import { SplatField } from "../world/splatfield";
import type { SplatFieldDescriptor } from "../world/splatfield";

export type WasmGPUDescriptor = RendererDescriptor & {
    // Future options: physics, audio, etc.
};

export type WasmGPUWarmupDescriptor = {
    scene?: Scene;
    camera?: Camera;
    render?: boolean;
    compute?: false;
};

export class WasmGPU {
    private renderer: Renderer;
    readonly effects: RenderEffects;
    readonly compute: Compute;
    readonly python: PythonInterop;
    readonly scale: ScaleService;
    private _performanceStats: PerformanceStats | null = null;
    private _isRunning: boolean = false;
    private _lastTime: number = 0;
    private _frameCallback: ((dt: number, time: number, wgpu: WasmGPU) => void) | null = null;
    private _animationFrameId: number | null = null;

    private constructor(renderer: Renderer, desc: WasmGPUDescriptor | ComputeDescriptor) {
        this.renderer = renderer;
        this.effects = renderer.effects;
        const gpu = renderer.gpu;
        this.compute = new Compute(gpu.device, gpu.queue, desc as ComputeDescriptor);
        this.python = new PythonInterop(this.compute);
        this.scale = new ScaleService(this.compute);
    }

    static async create(canvas: HTMLCanvasElement, descriptor: WasmGPUDescriptor = {}): Promise<WasmGPU> {
        await initWebAssembly();
        const renderer = await Renderer.create(canvas, descriptor);
        return new WasmGPU(renderer, descriptor);
    }

    run(callback: (dt: number, time: number, wgpu: WasmGPU) => void): void {
        if (this._isRunning) return;
        this._isRunning = true;
        this._frameCallback = callback;
        this._lastTime = performance.now();
        const loop = (now: number) => {
            if (!this._isRunning) return;
            frameArena.reset();
            const dt = (now - this._lastTime) / 1000;
            this._lastTime = now;
            const cpuStart = performance.now();
            this._frameCallback?.(dt, now / 1000, this);
            const cpuMs = performance.now() - cpuStart;
            this._performanceStats?.update(dt, cpuMs);
            this._animationFrameId = requestAnimationFrame(loop);
        };
        this._animationFrameId = requestAnimationFrame(loop);
    }

    stop(): void {
        this._isRunning = false;
        if (this._animationFrameId !== null) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
    }

    get gpu(): { device: GPUDevice; queue: GPUQueue; format: GPUTextureFormat } {
        return this.renderer.gpu;
    }

    get isRunning(): boolean {
        return this._isRunning;
    }

    get cullingStats(): RendererCullingStats {
        return this.renderer.cullingStats;
    }

    static get driver() {
        return driver;
    }

    get driver() {
        return driver;
    }

    static get webassembly() {
        return webassemblyInterop;
    }

    get webassembly() {
        return webassemblyInterop;
    }

    static get math() {
        return { mat4, mat4f, mat4d, quat, quatf, quatd, vec3, vec3f, vec3d };
    }

    get math() {
        return { mat4, mat4f, mat4d, quat, quatf, quatd, vec3, vec3f, vec3d };
    }

    static createHeapArena(capBytes: number, align: number = 16): WasmHeapArena {
        return driver.createHeapArena(capBytes, align);
    }

    createHeapArena(capBytes: number, align: number = 16): WasmHeapArena {
        return driver.createHeapArena(capBytes, align);
    }

    static get frameArena() {
        return frameArena;
    }

    get frameArena() {
        return frameArena;
    }

    static createSelectionStore(): SelectionStore {
        return new SelectionStore();
    }

    createSelectionStore(): SelectionStore {
        return new SelectionStore();
    }

    createPerformanceStats(desc: PerformanceStatsDescriptor = {}): PerformanceStats {
        this._performanceStats?.destroy();
        this.renderer.enableGpuTiming(desc.showGpuTime ?? true);
        const stats = new PerformanceStats({
            getGpuTimeNs: () => this.renderer.gpuTimeNs,
            getCullingStats: () => this.renderer.cullingStats
        }, {
            canvas: this.renderer.canvas,
            ...desc
        });
        this._performanceStats = stats;
        return stats;
    }

    get performanceStats(): PerformanceStats | null {
        return this._performanceStats;
    }

    destroyPerformanceStats(): void {
        this._performanceStats?.destroy();
        this._performanceStats = null;
        this.renderer.enableGpuTiming(false);
    }

    render(scene: Scene, camera: Camera): void {
        if (!this._isRunning) frameArena.reset();
        this.renderer.render(scene, camera);
    }

    async warmup(options: WasmGPUWarmupDescriptor = {}): Promise<void> {
        const compute = (options as WasmGPUWarmupDescriptor & { compute?: boolean }).compute ?? false;
        if (compute) throw new Error("WasmGPU.warmup: compute warmup is not implemented yet.");
        const render = options.render ?? true;
        if (!render) return;
        const { scene, camera } = options;
        if (!scene || !camera) throw new Error("WasmGPU.warmup: scene and camera are required when render warmup is enabled.");
        if (!this._isRunning) frameArena.reset();
        this.renderer.warmup(scene, camera);
    }

    private buildPickNdIndex(hit: RendererPickHit): number[] | null {
        if (hit.kind === "pointcloud") return hit.object.mapLinearIndexToNd(hit.elementIndex);
        if (hit.kind === "glyphfield") return hit.object.mapLinearIndexToNd(hit.elementIndex);
        if (hit.kind === "splatfield") return hit.object.mapLinearIndexToNd(hit.elementIndex);
        if (hit.kind === "latticespace") return hit.object.mapLinearIndexToCell(hit.elementIndex);
        if (hit.kind === "nodelink") { const decoded = hit.object.decodePickElement(hit.elementIndex); if (!decoded || decoded.component !== "node") return null; return hit.object.mapLinearNodeIndexToNd(decoded.componentIndex); }
        return null;
    }

    private buildPickAttributes(hit: RendererPickHit, includeAttributes: boolean): PickAttributes | null {
        if (!includeAttributes) return null;
        if (hit.kind === "pointcloud") {
            const rec = hit.object.getPointRecord(hit.elementIndex);
            if (!rec) return null;
            return {
                scalar: rec.scalar,
                packedPoint: rec.packed
            };
        }
        if (hit.kind === "glyphfield") {
            const vector = hit.object.getAttributeRecord(hit.elementIndex);
            if (!vector) return null;
            return { vector };
        }
        if (hit.kind === "nodelink") {
            const decoded = hit.object.decodePickElement(hit.elementIndex);
            if (!decoded) return null;
            if (decoded.component === "node") {
                const rec = hit.object.getNodeRecord(decoded.componentIndex);
                return {
                    component: "node",
                    componentIndex: decoded.componentIndex,
                    scalar: rec?.scalar ?? null,
                    color: rec?.color ?? null
                };
            }
            const rec = hit.object.getEdgeRecord(decoded.componentIndex);
            return {
                component: "edge",
                componentIndex: decoded.componentIndex,
                scalar: rec?.scalar ?? null,
                color: rec?.color ?? null,
                edgeEndpoints: rec ? [rec.src, rec.dst] : null,
                edgePositions: (rec && rec.srcPosition && rec.dstPosition) ? [rec.srcPosition[0], rec.srcPosition[1], rec.srcPosition[2], rec.dstPosition[0], rec.dstPosition[1], rec.dstPosition[2]] : null
            };
        }
        if (hit.kind === "splatfield") {
            const rec = hit.object.getSplatRecord(hit.elementIndex);
            if (!rec) return null;
            return {
                position: rec.position,
                rotation: rec.rotation,
                scale: rec.scale,
                opacity: rec.opacity,
                packedSplat: rec.packed,
                color: rec.color,
                sphericalHarmonicsDegree: rec.sphericalHarmonicsDegree,
                sphericalHarmonics: rec.sphericalHarmonics
            };
        }
        if (hit.kind === "latticespace") {
            const record = hit.object.getCellRecord(hit.elementIndex);
            if (!record || record.values.length === 0) return null;
            const vector: [number, number, number, number] = [record.values[0] ?? 0, record.values[1] ?? 0, record.values[2] ?? 0, record.values[3] ?? 0];
            return { scalar: record.scalar, vector, color: record.color };
        }
        return null;
    }

    private buildPickHit(hit: RendererPickHit, includeAttributes: boolean): PickHit {
        return {
            kind: hit.kind,
            object: hit.object,
            objectId: hit.objectId,
            elementIndex: hit.elementIndex,
            worldPosition: [hit.worldPosition[0], hit.worldPosition[1], hit.worldPosition[2]],
            ndIndex: this.buildPickNdIndex(hit),
            attributes: this.buildPickAttributes(hit, includeAttributes)
        };
    }

    async pick(scene: Scene, camera: Camera, x: number, y: number, opts: PickQuery = {}): Promise<PickResult | null> {
        const hit = await this.renderer.pick(scene, camera, x, y, opts);
        if (!hit) return null;
        const includeAttributes = opts.includeAttributes ?? true;
        return this.buildPickHit(hit, includeAttributes);
    }

    async pickRect(scene: Scene, camera: Camera, x0: number, y0: number, x1: number, y1: number, opts: PickRegionQuery = {}): Promise<PickRegionResult> {
        const includeAttributes = opts.includeAttributes ?? true;
        const result = await this.renderer.pickRect(scene, camera, x0, y0, x1, y1, opts);
        return {
            mode: result.mode,
            hits: result.hits.map((hit) => this.buildPickHit(hit, includeAttributes)),
            truncated: result.truncated,
            bounds: {
                x: result.bounds.x,
                y: result.bounds.y,
                width: result.bounds.width,
                height: result.bounds.height
            },
            sampledPixels: result.sampledPixels
        };
    }

    async pickLasso(scene: Scene, camera: Camera, points: PickLassoPoint[], opts: PickRegionQuery = {}): Promise<PickRegionResult> {
        const includeAttributes = opts.includeAttributes ?? true;
        const result = await this.renderer.pickLasso(scene, camera, points, opts);
        return {
            mode: result.mode,
            hits: result.hits.map((hit) => this.buildPickHit(hit, includeAttributes)),
            truncated: result.truncated,
            bounds: {
                x: result.bounds.x,
                y: result.bounds.y,
                width: result.bounds.width,
                height: result.bounds.height
            },
            sampledPixels: result.sampledPixels
        };
    }

    createScene(background?: Color): Scene {
        return new Scene({ background });
    }

    readonly createCamera = {
        perspective: (options?: PerspectiveCameraDescriptor): PerspectiveCamera => {
            return new PerspectiveCamera(options);
        },
        orthographic: (options?: OrthographicCameraDescriptor): OrthographicCamera => {
            return new OrthographicCamera(options);
        }
    };

    readonly createControls = {
        navigation: (camera: Camera, domElement: HTMLCanvasElement, options?: NavigationControlsDescriptor): NavigationControls => {
            return new NavigationControls(camera, domElement, options);
        },
        orbit: (camera: Camera, domElement: HTMLCanvasElement, options?: OrbitControlsDescriptor): OrbitControls => {
            return new OrbitControls(camera, domElement, options);
        },
        trackball: (camera: Camera, domElement: HTMLCanvasElement, options?: TrackballControlsDescriptor): TrackballControls => {
            return new TrackballControls(camera, domElement, options);
        },
        fly: (camera: Camera, domElement: HTMLCanvasElement, options?: FlyControlsDescriptor): FlyControls => {
            return new FlyControls(camera, domElement, options);
        }
    };

    readonly createOverlay = {
        system: (options: Omit<OverlaySystemDescriptor, "canvas"> = {}): OverlaySystem => {
            return new OverlaySystem({ canvas: this.renderer.canvas, ...options });
        },
        axisTriad: (descriptor: AxisTriadLayerDescriptor = {}): AxisTriadLayer => {
            return new AxisTriadLayer(descriptor);
        },
        grid: (descriptor: GridLayerDescriptor = {}): GridLayer => {
            return new GridLayer(descriptor);
        },
        legend: (descriptor: LegendLayerDescriptor): LegendLayer => {
            return new LegendLayer(descriptor);
        }
    };

    readonly createAnnotation = {
        toolkit: (options: AnnotationToolkitDescriptor = {}): AnnotationToolkit => {
            return new AnnotationToolkit({
                pick: this.pick.bind(this),
                createOverlay: this.createOverlay
            }, {
                canvas: this.renderer.canvas,
                ...options
            });
        }
    };

    readonly geometry = {
        custom: (descriptor: GeometryDescriptor): Geometry => {
            return new Geometry(descriptor);
        },
        point: (size?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry => {
            return Geometry.point(size, plane, doubleSided);
        },
        line: (length?: number, thickness?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry => {
            return Geometry.line(length, thickness, plane, doubleSided);
        },
        plane: (width?: number, height?: number, widthSegments?: number, heightSegments?: number): Geometry => {
            return Geometry.plane(width, height, widthSegments, heightSegments);
        },
        triangle: (width?: number, height?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry => {
            return Geometry.triangle(width, height, plane, doubleSided);
        },
        rectangle: (width?: number, height?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry => {
            return Geometry.rectangle(width, height, plane, doubleSided);
        },
        circle: (radius?: number, segments?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry => {
            return Geometry.circle(radius, segments, plane, doubleSided);
        },
        ellipse: (radiusX?: number, radiusY?: number, segments?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry => {
            return Geometry.ellipse(radiusX, radiusY, segments, plane, doubleSided);
        },
        box: (width?: number, height?: number, depth?: number): Geometry => {
            return Geometry.box(width, height, depth);
        },
        sphere: (radius?: number, widthSegments?: number, heightSegments?: number): Geometry => {
            return Geometry.sphere(radius, widthSegments, heightSegments);
        },
        cylinder: (radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number, heightSegments?: number, openEnded?: boolean): Geometry => {
            return Geometry.cylinder(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded);
        },
        pyramid: (baseWidth?: number, baseDepth?: number, height?: number): Geometry => {
            return Geometry.pyramid(baseWidth, baseDepth, height);
        },
        torus: (radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number): Geometry => {
            return Geometry.torus(radius, tube, radialSegments, tubularSegments);
        },
        prism: (radius?: number, height?: number, sides?: number): Geometry => {
            return Geometry.prism(radius, height, sides);
        },
        cartesianCurve: (descriptor: CartesianCurveDescriptor): Geometry => {
            return Geometry.cartesianCurve(descriptor);
        },
        cartesianSurface: (descriptor: CartesianSurfaceDescriptor): Geometry => {
            return Geometry.cartesianSurface(descriptor);
        },
        parametricCurve: (descriptor: ParametricCurveDescriptor): Geometry => {
            return Geometry.parametricCurve(descriptor);
        },
        parametricSurface: (descriptor: ParametricSurfaceDescriptor): Geometry => {
            return Geometry.parametricSurface(descriptor);
        }
    };

    readonly material = {
        unlit: (options?: UnlitMaterialDescriptor): UnlitMaterial => {
            return new UnlitMaterial(options);
        },
        standard: (options?: StandardMaterialDescriptor): StandardMaterial => {
            return new StandardMaterial(options);
        },
        data: (options: DataMaterialDescriptor): DataMaterial => {
            return new DataMaterial(options);
        },
        custom: (options: CustomMaterialDescriptor): CustomMaterial => {
            return new CustomMaterial(options);
        }
    };

    readonly texture = {
        create2D: (descriptor: Texture2DDescriptor): Texture2D => {
            return Texture2D.createFrom(descriptor);
        }
    };

    createTransform(): Transform {
        return new Transform();
    }

    createMesh(geometry: Geometry, material: Material): Mesh {
        return new Mesh(geometry, material);
    }

    createPointCloud(descriptor: PointCloudDescriptor): PointCloud {
        return new PointCloud(descriptor);
    }

    createGlyphField(descriptor: GlyphFieldDescriptor): GlyphField {
        return new GlyphField(descriptor);
    }

    createNodeLink(descriptor: NodeLinkDescriptor): NodeLink {
        return new NodeLink(descriptor);
    }

    createSplatField(descriptor: SplatFieldDescriptor): SplatField {
        return new SplatField(descriptor);
    }

    createLatticeSpace(descriptor: LatticeSpaceDescriptor): LatticeSpace {
        return new LatticeSpace(descriptor);
    }

    readonly colormap = {
        builtin: (name: BuiltinColormapName): Colormap => {
            return Colormap.builtin(name);
        },
        grayscale: (): Colormap => {
            return Colormap.builtin("grayscale");
        },
        turbo: (): Colormap => {
            return Colormap.builtin("turbo");
        },
        viridis: (): Colormap => {
            return Colormap.builtin("viridis");
        },
        magma: (): Colormap => {
            return Colormap.builtin("magma");
        },
        plasma: (): Colormap => {
            return Colormap.builtin("plasma");
        },
        inferno: (): Colormap => {
            return Colormap.builtin("inferno");
        },
        fromStops: (stops: ReadonlyArray<ColormapStop>, desc: ColormapDescriptor = {}): Colormap => {
            return Colormap.fromStops(stops, desc);
        },
        fromPalette: (colors: ReadonlyArray<[number, number, number, number]>, desc: ColormapDescriptor = {}): Colormap => {
            return Colormap.fromPalette(colors, desc);
        }
    };

    readonly createLight = {
        ambient: (options?: { color?: Color; intensity?: number; }): AmbientLight => {
            return new AmbientLight(options);
        },
        directional: (options?: { direction?: [number, number, number]; color?: Color; intensity?: number; }): DirectionalLight => {
            return new DirectionalLight(options);
        },
        point: (options?: { position?: [number, number, number]; color?: Color; intensity?: number; range?: number; }): PointLight => {
            return new PointLight(options);
        },
        spot: (options?: { position?: [number, number, number]; direction?: [number, number, number]; color?: Color; intensity?: number; range?: number; innerCone?: number; outerCone?: number; }): SpotLight => {
            return new SpotLight(options);
        }
    };

    readonly gltf = {
        load: async (source: string | ArrayBuffer, options?: LoadGltfOptions) => {
            return loadGltf(source, options);
        },
        import: async (doc: GltfDocument, options?: ImportGltfOptions): Promise<GltfImportResult> => {
            return importGltf(doc, options);
        },
        loadAndImport: async (source: string | ArrayBuffer, options: { load?: LoadGltfOptions; import?: ImportGltfOptions; } = {}): Promise<GltfImportResult> => {
            const doc = await loadGltf(source, options.load);
            return importGltf(doc, options.import);
        },
        parseGLB: (glb: ArrayBuffer): ParsedGLB => {
            return parseGLB(glb);
        },
        readAccessor: (doc: GltfDocument, accessorIndex: number): AccessorView => {
            return readAccessor(doc, accessorIndex);
        },
        readAccessorAsFloat32: (doc: GltfDocument, accessorIndex: number): Float32Array => {
            return readAccessorAsFloat32(doc, accessorIndex);
        },
        readAccessorAsUint16: (doc: GltfDocument, accessorIndex: number): Uint16Array => {
            return readAccessorAsUint16(doc, accessorIndex);
        },
        readIndicesAsUint32: (doc: GltfDocument, accessorIndex: number): Uint32Array => {
            return readIndicesAsUint32(doc, accessorIndex);
        }
    };

    readonly animation = {
        createClip: (descriptor: AnimationClipDescriptor): AnimationClip => {
            return new AnimationClip(descriptor);
        },
        createPlayer: (clip: AnimationClip, options?: Partial<Pick<AnimationPlayer, "speed" | "loop" | "playing">>): AnimationPlayer => {
            return new AnimationPlayer(clip, options);
        },
        createSkin: (name: string, joints: Transform[], inverseBindMatrices: Float32Array | null): Skin => {
            return new Skin(name, joints, inverseBindMatrices);
        }
    };

    destroy(): void {
        this.stop();
        this.destroyPerformanceStats();
        this.scale.clearCache();
        this.compute.destroy();
        this.renderer.destroy();
    }
}
