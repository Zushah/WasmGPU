# AnimationClip.duration

## Summary
AnimationClip.duration reads the current `duration` value from this AnimationClip instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
AnimationClip.duration: number
const value = clip.duration;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Numeric scalar result produced by this operation.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const clip = wgpu.animation.createClip({ name: "clip", samplerCount: 0, channelCount: 0, samplersPtr: 0, channelsPtr: 0, startTime: 0, endTime: 1 });
const value = clip.duration;
console.log(value);
```

## See Also
- [AnimationClip.dispose](./animationclip-dispose.md)
- [AnimationClip.sample](./animationclip-sample.md)
