# AnimationClip.dispose

## Summary
AnimationClip.dispose deterministically releases every `ownedF32Allocs` and `ownedU32Allocs` Wasm allocation supplied when the clip was created, then clears weight and pointer-channel runtime state. The call is idempotent.

After disposal, `sample`, `samplersPtr`, and `channelsPtr` reject access. `disposed` remains available for checking state.

## Syntax
```ts
AnimationClip.dispose(): void
clip.dispose();
```

## Parameters
This API does not take parameters.

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
clip.dispose();
console.log(clip.disposed); // true
```

## See Also
- [AnimationClip.duration](./wasmgpu-objects-animationclip-duration.md)
- [AnimationClip.sample](./wasmgpu-objects-animationclip-sample.md)
- [AnimationClip.disposed](./wasmgpu-objects-animationclip-disposed.md)
- [AnimationClip.samplersPtr](./wasmgpu-objects-animationclip-samplersptr.md)
- [AnimationClip.channelsPtr](./wasmgpu-objects-animationclip-channelsptr.md)
