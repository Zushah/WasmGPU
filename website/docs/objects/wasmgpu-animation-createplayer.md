# WasmGPU.animation.createPlayer

## Summary
WasmGPU.animation.createPlayer creates animation runtime objects used for clip sampling, playback, and skinning.

## Syntax
```ts
WasmGPU.animation.createPlayer(clip: AnimationClip, options?: Partial<Pick<AnimationPlayer, "speed" | "loop" | "playing">>): AnimationPlayer
const result = wgpu.animation.createPlayer(clip, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `clip` | `AnimationClip` | Yes | AnimationClip used by playback/update operations. |
| `options` | `Partial<Pick<AnimationPlayer, "speed" \| "loop" \| "playing">>` | No | Optional configuration object that customizes behavior for this call. |

## Returns
`AnimationPlayer` - AnimationPlayer runtime object created for animation workflows.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const clip = wgpu.animation.createClip({ name: "clip", samplerCount: 0, channelCount: 0, samplersPtr: 0, channelsPtr: 0, startTime: 0, endTime: 1 });
const options = { speed: 1.0, loop: true, playing: true };
const result = wgpu.animation.createPlayer(clip, options);
console.log(result);
```

## See Also
- [WasmGPU.animation.createClip](./wasmgpu-animation-createclip.md)
- [WasmGPU.animation.createSkin](./wasmgpu-animation-createskin.md)
