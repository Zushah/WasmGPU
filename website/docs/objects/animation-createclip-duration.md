# animation.createClip#duration

## Summary
animation.createClip#duration is `max(0, endTime - startTime)`. Reversed or equal endpoints therefore produce a zero-duration clip; the property remains readable after disposal.

## Syntax
```ts
AnimationClip.duration: number
const value = clip.duration;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Nonnegative clip duration in seconds.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const clip = wgpu.animation.createClip({ name: "clip", samplerCount: 0, channelCount: 0, samplersPtr: 0, channelsPtr: 0, startTime: 0, endTime: 1 });
const value = clip.duration;
console.log(value);
```

## See Also
- [animation.createClip#dispose](./animation-createclip-dispose.md)
- [animation.createClip#sample](./animation-createclip-sample.md)
