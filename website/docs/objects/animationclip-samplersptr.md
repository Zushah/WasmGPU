# AnimationClip.samplersPtr

## Summary
AnimationClip.samplersPtr returns the Wasm pointer to the clip's packed sampler records. The table contains `samplerCount` records and is valid only while the clip is not disposed.

## Syntax
```ts
AnimationClip.samplersPtr: WasmPtr
```

## Returns
`WasmPtr` - Pointer to the packed sampler table. Access after `dispose()` throws.

## See Also
- [AnimationClip.channelsPtr](./animationclip-channelsptr.md)
- [AnimationClip.dispose](./animationclip-dispose.md)
