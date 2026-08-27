/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { Camera } from "../world/camera";
import type { NavigationControls } from "../world/controls";
import type { Scene } from "../world/scene";
import type { PointCloud } from "../world/pointcloud";
import type { GlyphField } from "../world/glyphfield";
import type { NodeLink } from "../world/nodelink";
import type { LatticeSpace } from "../world/latticespace";
import type { Colormap, BuiltinColormapName } from "../graphics/colormap";
import type { Color4, DataMaterial } from "../graphics/material";
import type { ScaleTransform, ScaleTransformDescriptor } from "../scaling";

export type OverlayInvalidationReason = "manual" | "camera" | "viewport" | "layout" | "scale" | "colormap" | "interaction";

export type OverlayVisualChangeKind = "scale" | "colormap" | "visual";

export type OverlayVisualChangeListener = (kind: OverlayVisualChangeKind) => void;

export type OverlayVisualChangeEmitter = {
    onVisualChange?: (listener: OverlayVisualChangeListener) => (() => void);
};

export type ScreenCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type ScreenAnchorDescriptor = {
    kind: "screen";
    corner?: ScreenCorner;
    x?: number;
    y?: number;
    offsetPx?: [number, number];
};

export type WorldAnchorDescriptor = {
    kind: "world";
    position: [number, number, number];
};

export type OverlayAnchorDescriptor = ScreenAnchorDescriptor | WorldAnchorDescriptor;

export type OverlayCSSStyleProperty = "background" | "backgroundColor" | "border" | "borderColor" | "borderRadius" | "boxShadow" | "color" | "filter" | "font" | "fontFamily" | "fontSize" | "fontStyle" | "fontWeight" | "letterSpacing" | "lineHeight" | "opacity" | "outline" | "textShadow" | "textTransform";

export type OverlayCSSStyle = Partial<Record<OverlayCSSStyleProperty, string>>;

export type OverlaySystemLike = {
    invalidate: (reason?: OverlayInvalidationReason) => void;
};

export type OverlayUpdateContext = {
    camera: Camera;
    scene: Scene | null;
    width: number;
    height: number;
    dpr: number;
    nowMs: number;
    reasons: ReadonlySet<OverlayInvalidationReason>;
    root: HTMLDivElement;
};

export interface OverlayLayer {
    readonly id: string;
    attach(root: HTMLDivElement): void;
    detach(): void;
    update(ctx: OverlayUpdateContext): void;
    setSystem?(system: OverlaySystemLike | null): void;
}

export type OverlaySystemDescriptor = {
    canvas: HTMLCanvasElement;
    parent?: HTMLElement;
    className?: string;
    zIndex?: number;
    camera?: Camera | null;
    scene?: Scene | null;
    controls?: NavigationControls | null;
    interactionThrottleMs?: number;
    autoUpdate?: boolean;
};

export type OverlayUpdateRequest = {
    camera?: Camera | null;
    scene?: Scene | null;
    reasons?: OverlayInvalidationReason | OverlayInvalidationReason[];
    force?: boolean;
    nowMs?: number;
};

export type AxisTriadLayerDescriptor = {
    id?: string;
    anchor?: OverlayAnchorDescriptor;
    lengthWorld?: number;
    sizePx?: number;
    lineWidthPx?: number;
    labels?: [string, string, string];
    colors?: [string, string, string];
    labelOffsetPx?: number;
    font?: string;
    directions?: AxisTriadDirections;
    negativeLabels?: [string, string, string];
    arrowSizePx?: number;
    originSizePx?: number;
    className?: string;
    style?: AxisTriadStyle;
};

export type AxisTriadDirection = "positive" | "negative" | "both" | "none";

export type AxisTriadDirections = {
    x?: AxisTriadDirection;
    y?: AxisTriadDirection;
    z?: AxisTriadDirection;
};

export type AxisTriadStyle = {
    container?: OverlayCSSStyle;
    axisLine?: OverlayCSSStyle;
    arrowhead?: OverlayCSSStyle;
    label?: OverlayCSSStyle;
    originMarker?: OverlayCSSStyle;
};

export type GridPlane = "xy" | "xz" | "yz";

export type GridAxis = "u" | "v";

export type GridLabelSide = "min" | "max" | "both" | "none";

export type GridAxisMetadata = {
    name?: string;
    unit?: string;
    labelSide?: GridLabelSide;
};

export type GridStyle = {
    container?: OverlayCSSStyle;
    minorLine?: OverlayCSSStyle;
    majorLine?: OverlayCSSStyle;
    zeroAxisLine?: OverlayCSSStyle;
    tickLabel?: OverlayCSSStyle;
    axisTitle?: OverlayCSSStyle;
};

export type GridLayerDescriptor = {
    id?: string;
    plane?: GridPlane;
    origin?: [number, number, number];
    extentMode?: "scene-fit" | "fixed";
    fixedUMin?: number;
    fixedUMax?: number;
    fixedVMin?: number;
    fixedVMax?: number;
    targetMinorSpacingPx?: number;
    majorStepFactor?: number;
    minLabelSpacingPx?: number;
    maxLines?: number;
    maxLabels?: number;
    minorColor?: string;
    majorColor?: string;
    axisColor?: string;
    labelColor?: string;
    lineWidthMinorPx?: number;
    lineWidthMajorPx?: number;
    font?: string;
    tickFormatter?: (value: number, axis: GridAxis) => string;
    uAxis?: GridAxisMetadata;
    vAxis?: GridAxisMetadata;
    className?: string;
    style?: GridStyle;
};

export type OverlayLegendExplicitSource = {
    scaleTransform: ScaleTransformDescriptor | ScaleTransform;
    colormap: Colormap | BuiltinColormapName;
    colormapStops?: ReadonlyArray<Color4>;
};

export type OverlayLegendNodeLinkSource = {
    nodelink: NodeLink;
    component?: "node" | "edge";
};

export type OverlayLegendSource = PointCloud | GlyphField | NodeLink | LatticeSpace | OverlayLegendNodeLinkSource | DataMaterial | OverlayLegendExplicitSource;

export type LegendOrientation = "vertical" | "horizontal";

export type LegendStyle = {
    container?: OverlayCSSStyle;
    title?: OverlayCSSStyle;
    subtitle?: OverlayCSSStyle;
    gradient?: OverlayCSSStyle;
    tickMark?: OverlayCSSStyle;
    tickLabel?: OverlayCSSStyle;
    units?: OverlayCSSStyle;
};

export type LegendLayerDescriptor = {
    id?: string;
    source: OverlayLegendSource;
    title?: string;
    anchor?: ScreenAnchorDescriptor;
    widthPx?: number;
    heightPx?: number;
    tickCount?: number;
    strictParity?: boolean;
    font?: string;
    formatValue?: (value: number) => string;
    orientation?: LegendOrientation;
    subtitle?: string;
    units?: string;
    className?: string;
    style?: LegendStyle;
};
