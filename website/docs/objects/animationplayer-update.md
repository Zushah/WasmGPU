# AnimationPlayer.update

## Summary
AnimationPlayer.update operates on a AnimationPlayer runtime object to update state, query data, or manage lifecycle.

## Syntax
```ts
AnimationPlayer.update(dtSeconds: number): void
player.update(dtSeconds);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dtSeconds` | `number` | Yes | Numeric input controlling `dtSeconds` for this operation. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const clip = wgpu.animation.createClip({ name: "clip", samplerCount: 0, channelCount: 0, samplersPtr: 0, channelsPtr: 0, startTime: 0, endTime: 1 });
const player = wgpu.animation.createPlayer(clip, { speed: 1, loop: true, playing: true });
const dtSeconds = 1;
player.update(dtSeconds);
console.log("updated");
```

## See Also
- [WasmGPU.animation.createClip](./wasmgpu-animation-createclip.md)
- [WasmGPU.animation.createPlayer](./wasmgpu-animation-createplayer.md)
- [WasmGPU.animation.createSkin](./wasmgpu-animation-createskin.md)
- [WasmGPU.colormap.builtin](./wasmgpu-colormap-builtin.md)
- [WasmGPU.colormap.fromPalette](./wasmgpu-colormap-frompalette.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
