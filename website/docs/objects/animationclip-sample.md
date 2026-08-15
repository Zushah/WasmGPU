# AnimationClip.sample

## Summary
AnimationClip.sample evaluates transform, morph-weight, and animation-pointer channels at `timeSeconds`. It throws after the clip is disposed.

## Syntax
```ts
AnimationClip.sample(timeSeconds: number): void
clip.sample(timeSeconds);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `timeSeconds` | `number` | Yes | Numeric input controlling `timeSeconds` for this operation. |

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
try {
    clip.sample(0.5);
} finally {
    clip.dispose();
}
```

## See Also
- [AnimationClip.dispose](./animationclip-dispose.md)
- [AnimationClip.duration](./animationclip-duration.md)
