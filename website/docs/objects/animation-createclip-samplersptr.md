# animation.createClip#samplersPtr

## Summary
animation.createClip#samplersPtr returns the Wasm pointer to the clip's packed sampler records. The table contains `samplerCount` records and is valid only while the clip is not disposed.

## Syntax
```ts
AnimationClip.samplersPtr: WasmPtr
```

## Returns
`WasmPtr` - Pointer to the packed sampler table. Access after `dispose()` throws.

## See Also
- [animation.createClip#channelsPtr](./animation-createclip-channelsptr.md)
- [animation.createClip#dispose](./animation-createclip-dispose.md)
