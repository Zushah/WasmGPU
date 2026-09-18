# animation.createClip#dispose

## Summary
animation.createClip#dispose deterministically releases the Wasm allocations whose ownership was transferred to the clip at creation and invalidates its sampling state. The call is idempotent.

After disposal, `sample`, `samplersPtr`, and `channelsPtr` reject access. `disposed` remains available for checking state.

## Syntax
```ts
AnimationClip.dispose(): void
clip.dispose();
```

## Parameters
None.

## Returns
`void`

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const clip = wgpu.animation.createClip({ name: "clip", samplerCount: 0, channelCount: 0, samplersPtr: 0, channelsPtr: 0, startTime: 0, endTime: 1 });
clip.dispose();
console.log(clip.disposed); // true
```

## See Also
- [animation.createClip#duration](./animation-createclip-duration.md)
- [animation.createClip#sample](./animation-createclip-sample.md)
- [animation.createClip#disposed](./animation-createclip-disposed.md)
- [animation.createClip#samplersPtr](./animation-createclip-samplersptr.md)
- [animation.createClip#channelsPtr](./animation-createclip-channelsptr.md)
