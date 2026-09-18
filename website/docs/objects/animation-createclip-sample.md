# animation.createClip#sample

## Summary
animation.createClip#sample evaluates transform, morph-weight, and animation-pointer channels at `timeSeconds` and writes the sampled values to their targets. Value channels use STEP, LINEAR, or cubic-spline sampling and clamp outside their keyframe range to the nearest endpoint. The method does not wrap time and throws after disposal.

## Syntax
```ts
AnimationClip.sample(timeSeconds: number): void
clip.sample(timeSeconds);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `timeSeconds` | `number` | Yes | Absolute clip time in seconds. Callers handle looping; values outside value-channel keys clamp to endpoints. |

## Returns
`void`

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const clip = wgpu.animation.createClip({ name: "clip", samplerCount: 0, channelCount: 0, samplersPtr: 0, channelsPtr: 0, startTime: 0, endTime: 1 });
try {
    clip.sample(0.5);
} finally {
    clip.dispose();
}
```

## See Also
- [animation.createClip#dispose](./animation-createclip-dispose.md)
- [animation.createClip#duration](./animation-createclip-duration.md)
