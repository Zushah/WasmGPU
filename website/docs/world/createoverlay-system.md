# createOverlay.system

## Summary
createOverlay.system creates an `OverlaySystem` tied to the engine canvas. It requires a DOM environment, owns an HTML overlay root, tracks invalidation reasons, and updates registered overlay layers against the current camera/scene state. Use this as the entry point for axis triad, grid, and legend layers.

## Syntax
```ts
WasmGPU.createOverlay.system(options?: OverlaySystemOptions): OverlaySystem
const overlay = wgpu.createOverlay.system(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `OverlaySystemOptions` | No | Overlay behavior/layout overrides; WasmGPU injects `canvas` automatically. |

## Returns
`OverlaySystem` - Overlay manager that owns layers and update scheduling.

## Type Details
### OverlaySystemOptions

```ts
type OverlaySystemOptions = {
    parent?: HTMLElement;
    className?: string;
    zIndex?: number;
    camera?: Camera | null;
    scene?: Scene | null;
    controls?: NavigationControls | null;
    interactionThrottleMs?: number;
    autoUpdate?: boolean;
};
```

#### OverlaySystemOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `parent` | `HTMLElement` | No | Parent element where the overlay root is inserted. |
| `className` | `string` | No | CSS class for the overlay root node. |
| `zIndex` | `number` | No | CSS stacking order for the overlay root. |
| `camera` | `Camera \| null` | No | Initial camera reference for projection updates. |
| `scene` | `Scene \| null` | No | Initial scene context for layers needing scene bounds/data. |
| `controls` | `NavigationControls \| null` | No | Controls object used for camera/interaction invalidation signals. |
| `interactionThrottleMs` | `number` | No | Minimum update interval during active interaction; default `24`. |
| `autoUpdate` | `boolean` | No | Enables automatic animation-frame updates; default `true`. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
const controls = wgpu.createControls.orbit(camera, canvas, { enableDamping: true, dampingFactor: 0.12 });

const overlay = wgpu.createOverlay.system({ camera, scene, controls, zIndex: 30 });
overlay.update({ force: true });
```

## See Also
- [createOverlay.system#isLayerEnabled](./createoverlay-system-islayerenabled.md)
- [createOverlay.system#setLayerEnabled](./createoverlay-system-setlayerenabled.md)
- [createOverlay.axisTriad](./createoverlay-axistriad.md)
- [createOverlay.grid](./createoverlay-grid.md)
- [createOverlay.legend](./createoverlay-legend.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
- [createOverlay.system#update](./createoverlay-system-update.md)
