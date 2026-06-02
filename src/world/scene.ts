/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Mesh, registerMeshSceneOwner, unregisterMeshSceneOwner } from "./mesh";
import { PointCloud } from "./pointcloud";
import { GlyphField } from "./glyphfield";
import { NodeLink } from "./nodelink";
import { SplatField } from "./splatfield";
import { Color } from "../graphics/material";
import { Light, AmbientLight } from "./light";
import { Bounds3, emptyBounds, unionBounds } from "./bounds";

export type SceneDescriptor = {
    background?: Color;
};

export type SceneBoundsOptions = {
    visibleOnly?: boolean;
};

export class Scene {
    private _meshes: Mesh[] = [];
    private _pointClouds: PointCloud[] = [];
    private _glyphFields: GlyphField[] = [];
    private _nodeLinks: NodeLink[] = [];
    private _splatFields: SplatField[] = [];
    private _lights: Light[] = [];
    private _background: Color;
    static readonly MAX_LIGHTS = 8;

    constructor(descriptor: SceneDescriptor = {}) {
        this._background = descriptor.background ?? [0, 0, 0];
    }

    get background(): Color {
        return this._background;
    }

    set background(value: Color) {
        this._background = value;
    }

    get meshes(): readonly Mesh[] {
        return this._meshes;
    }

    get pointClouds(): readonly PointCloud[] {
        return this._pointClouds;
    }

    get glyphFields(): readonly GlyphField[] {
        return this._glyphFields;
    }

    get nodeLinks(): readonly NodeLink[] {
        return this._nodeLinks;
    }

    get splatFields(): readonly SplatField[] {
        return this._splatFields;
    }

    add(mesh: Mesh): this;
    add(pointCloud: PointCloud): this;
    add(glyphField: GlyphField): this;
    add(nodeLink: NodeLink): this;
    add(splatField: SplatField): this;
    add(obj: Mesh | PointCloud | GlyphField | NodeLink | SplatField): this {
        if (obj instanceof Mesh) {
            if (obj.destroyed) throw new Error("Scene: cannot add a destroyed mesh.");
            if (!this._meshes.includes(obj)) {
                this._meshes.push(obj);
                registerMeshSceneOwner(obj, this);
            }
        } else if (obj instanceof PointCloud) {
            if (!this._pointClouds.includes(obj)) this._pointClouds.push(obj);
        } else if (obj instanceof GlyphField) {
            if (!this._glyphFields.includes(obj)) this._glyphFields.push(obj);
        } else if (obj instanceof NodeLink) {
            if (!this._nodeLinks.includes(obj)) this._nodeLinks.push(obj);
        } else {
            if (!this._splatFields.includes(obj)) this._splatFields.push(obj);
        }
        return this;
    }

    remove(mesh: Mesh): this;
    remove(pointCloud: PointCloud): this;
    remove(glyphField: GlyphField): this;
    remove(nodeLink: NodeLink): this;
    remove(splatField: SplatField): this;
    remove(obj: Mesh | PointCloud | GlyphField | NodeLink | SplatField): this {
        if (obj instanceof Mesh) {
            const idx = this._meshes.indexOf(obj);
            if (idx !== -1) this._meshes.splice(idx, 1);
            unregisterMeshSceneOwner(obj, this);
        } else if (obj instanceof PointCloud) {
            const idx = this._pointClouds.indexOf(obj);
            if (idx !== -1) this._pointClouds.splice(idx, 1);
        } else if (obj instanceof GlyphField) {
            const idx = this._glyphFields.indexOf(obj);
            if (idx !== -1) this._glyphFields.splice(idx, 1);
        } else if (obj instanceof NodeLink) {
            const idx = this._nodeLinks.indexOf(obj);
            if (idx !== -1) this._nodeLinks.splice(idx, 1);
        } else {
            const idx = this._splatFields.indexOf(obj);
            if (idx !== -1) this._splatFields.splice(idx, 1);
        }
        return this;
    }

    clear(): this {
        for (const mesh of this._meshes) unregisterMeshSceneOwner(mesh, this);
        this._meshes = [];
        this._pointClouds = [];
        this._glyphFields = [];
        this._nodeLinks = [];
        this._splatFields = [];
        return this;
    }

    clearPointClouds(): this {
        this._pointClouds = [];
        return this;
    }

    clearGlyphFields(): this {
        this._glyphFields = [];
        return this;
    }

    clearNodeLinks(): this {
        this._nodeLinks = [];
        return this;
    }

    clearSplatFields(): this {
        this._splatFields = [];
        return this;
    }

    get lights(): readonly Light[] {
        return this._lights;
    }

    addLight(light: Light): this {
        if (!this._lights.includes(light)) {
            if (this._lights.length >= Scene.MAX_LIGHTS && light.type !== "ambient") console.warn(`Scene: Maximum of ${Scene.MAX_LIGHTS} non-ambient lights supported.`);
            this._lights.push(light);
        }
        return this;
    }

    removeLight(light: Light): this {
        const idx = this._lights.indexOf(light);
        if (idx !== -1) this._lights.splice(idx, 1);
        return this;
    }

    clearLights(): this {
        this._lights = [];
        return this;
    }

    findByName(name: string): Mesh | undefined {
        return this._meshes.find(m => m.name === name);
    }

    findAllByName(name: string): Mesh[] {
        return this._meshes.filter(m => m.name === name);
    }

    findPointCloudByName(name: string): PointCloud | undefined {
        return this._pointClouds.find(p => p.name === name);
    }

    findAllPointCloudsByName(name: string): PointCloud[] {
        return this._pointClouds.filter(p => p.name === name);
    }

    findGlyphFieldByName(name: string): GlyphField | undefined {
        return this._glyphFields.find(g => g.name === name);
    }

    findAllGlyphFieldsByName(name: string): GlyphField[] {
        return this._glyphFields.filter(g => g.name === name);
    }

    findNodeLinkByName(name: string): NodeLink | undefined {
        return this._nodeLinks.find(n => n.name === name);
    }

    findAllNodeLinksByName(name: string): NodeLink[] {
        return this._nodeLinks.filter(n => n.name === name);
    }

    findSplatFieldByName(name: string): SplatField | undefined {
        return this._splatFields.find(s => s.name === name);
    }

    findAllSplatFieldsByName(name: string): SplatField[] {
        return this._splatFields.filter(s => s.name === name);
    }

    get visibleMeshes(): Mesh[] {
        return this._meshes.filter(m => m.visible);
    }

    get visiblePointClouds(): PointCloud[] {
        return this._pointClouds.filter(p => p.visible);
    }

    get visibleGlyphFields(): GlyphField[] {
        return this._glyphFields.filter(g => g.visible);
    }

    get visibleNodeLinks(): NodeLink[] {
        return this._nodeLinks.filter(n => n.visible);
    }

    get visibleSplatFields(): SplatField[] {
        return this._splatFields.filter(s => s.visible);
    }

    get enabledLights(): Light[] {
        return this._lights.filter(l => l.enabled);
    }

    getAmbientColor(): Color {
        const ambient = this._lights.find((l): l is AmbientLight => l.type === "ambient" && l.enabled);
        if (ambient) {
            return [
                ambient.color[0] * ambient.intensity,
                ambient.color[1] * ambient.intensity,
                ambient.color[2] * ambient.intensity
            ];
        }
        return [0, 0, 0];
    }

    getLightingData(): { ambient: Color; lights: Light[] } {
        const ambient = this.getAmbientColor();
        const lights = this.enabledLights.filter(l => l.type !== "ambient").slice(0, Scene.MAX_LIGHTS);
        return { ambient, lights };
    }

    getBounds(options: SceneBoundsOptions = {}): Bounds3 {
        const visibleOnly = options.visibleOnly ?? true;
        let aggregated = emptyBounds(false);
        const addBounds = (bounds: Bounds3): void => {
            if (bounds.empty) {
                if (bounds.partial) aggregated.partial = true;
                return;
            }
            aggregated = unionBounds(aggregated, bounds);
        };
        const meshes = visibleOnly ? this.visibleMeshes : this._meshes;
        const clouds = visibleOnly ? this.visiblePointClouds : this._pointClouds;
        const glyphs = visibleOnly ? this.visibleGlyphFields : this._glyphFields;
        const links = visibleOnly ? this.visibleNodeLinks : this._nodeLinks;
        const splats = visibleOnly ? this.visibleSplatFields : this._splatFields;
        for (const mesh of meshes) addBounds(mesh.getWorldBounds());
        for (const pointCloud of clouds) addBounds(pointCloud.getWorldBounds());
        for (const glyphField of glyphs) addBounds(glyphField.getWorldBounds());
        for (const nodeLink of links) addBounds(nodeLink.getWorldBounds());
        for (const splatField of splats) addBounds(splatField.getWorldBounds());
        return aggregated;
    }

    traverse(callback: (mesh: Mesh) => void): void {
        for (const mesh of this._meshes) callback(mesh);
    }

    traverseVisible(callback: (mesh: Mesh) => void): void {
        for (const mesh of this._meshes) if (mesh.visible) callback(mesh);
    }

    traversePointClouds(callback: (pc: PointCloud) => void): void {
        for (const pc of this._pointClouds) callback(pc);
    }

    traverseVisiblePointClouds(callback: (pc: PointCloud) => void): void {
        for (const pc of this._pointClouds) if (pc.visible) callback(pc);
    }

    traverseGlyphFields(callback: (g: GlyphField) => void): void {
        for (const g of this._glyphFields) callback(g);
    }

    traverseVisibleGlyphFields(callback: (g: GlyphField) => void): void {
        for (const g of this._glyphFields) if (g.visible) callback(g);
    }

    traverseNodeLinks(callback: (n: NodeLink) => void): void {
        for (const n of this._nodeLinks) callback(n);
    }

    traverseVisibleNodeLinks(callback: (n: NodeLink) => void): void {
        for (const n of this._nodeLinks) if (n.visible) callback(n);
    }

    traverseSplatFields(callback: (s: SplatField) => void): void {
        for (const s of this._splatFields) callback(s);
    }

    traverseVisibleSplatFields(callback: (s: SplatField) => void): void {
        for (const s of this._splatFields) if (s.visible) callback(s);
    }

    destroy(): void {
        const meshes = [...this._meshes];
        for (const mesh of meshes) this.remove(mesh);
        for (const mesh of meshes) mesh.destroy();
        for (const pc of this._pointClouds) pc.destroy();
        for (const g of this._glyphFields) g.destroy();
        for (const n of this._nodeLinks) n.destroy();
        for (const s of this._splatFields) s.destroy();
        this._meshes = [];
        this._pointClouds = [];
        this._glyphFields = [];
        this._nodeLinks = [];
        this._splatFields = [];
        this._lights = [];
    }
}
