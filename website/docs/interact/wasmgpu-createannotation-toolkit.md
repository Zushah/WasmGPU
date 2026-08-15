# WasmGPU.createAnnotation.toolkit

## Summary
WasmGPU.createAnnotation.toolkit creates an annotation interaction subsystem built on top of picking, overlay labels, and marker rendering.
The toolkit supports marker, distance, and angle annotations, staging, hover/selection readouts, and optional automatic pointer binding.
Use it when you need interactive scientific measurement and markup directly in the render canvas.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit(options?: AnnotationToolkitDescriptor): AnnotationToolkit
const toolkit = wgpu.createAnnotation.toolkit(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `AnnotationToolkitDescriptor` | No | Initial scene/view wiring, overlay behavior, pointer target binding, display units, and renderer/layer customization. |

## Returns
`AnnotationToolkit` - Annotation controller object with interaction, creation, update, and event APIs.

## Type Details
```ts
type AnnotationToolkitDescriptor = {
    scene?: Scene | null;
    camera?: Camera | null;
    controls?: NavigationControls | null;
    overlaySystem?: OverlaySystem | null;
    canvas?: HTMLCanvasElement | null;
    pointerTarget?: HTMLElement | null;
    autoBindPointerEvents?: boolean; // default: true
    autoCreateOverlay?: boolean; // default: true
    overlaySystemOptions?: Omit<OverlaySystemDescriptor, "canvas" | "camera" | "scene" | "controls">;
    markerRenderer?: AnnotationMarkerRendererDescriptor;
    labelLayer?: AnnotationLabelLayerDescriptor;
    units?: AnnotationUnitsDescriptor;
    storeIdPrefix?: string;
};

type AnnotationUnitsDescriptor = {
    worldUnitsPerUnit?: number; // default: 1
    symbol?: string; // e.g. "m", "mm"
    decimals?: number; // distance display precision
    autoMetric?: boolean; // enable metric auto-scaling
    angleUnit?: "deg" | "rad";
    angleDecimals?: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene([0.03, 0.03, 0.05]);
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.orbit(camera, canvas, { target: [0, 0, 0], enableDamping: true });

const toolkit = wgpu.createAnnotation.toolkit({
    scene,
    camera,
    controls,
    canvas,
    autoBindPointerEvents: true,
    units: { worldUnitsPerUnit: 0.001, symbol: "mm", autoMetric: false, angleUnit: "deg", decimals: 2, angleDecimals: 1 }
});
toolkit.setMode("distance");
toolkit.onAnnotationsChange((records) => console.log("annotations", records.length));

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

## See Also
- [WasmGPU.createAnnotation.toolkit().attach](./wasmgpu-annotationtoolkit-attach.md)
- [WasmGPU.createAnnotation.toolkit().setMode](./wasmgpu-annotationtoolkit-setmode.md)
- [WasmGPU.createAnnotation.toolkit().pickAtAndCommit](./wasmgpu-annotationtoolkit-pickatandcommit.md)
- [WasmGPU.pick](./wasmgpu-pick.md)
- [WasmGPU.createOverlay.system](../world/wasmgpu-createoverlay-system.md)
