# AnimationClip.channelsPtr

## Summary
AnimationClip.channelsPtr returns the Wasm pointer to the clip's packed transform-channel records. The table contains `channelCount` records and is valid only while the clip is not disposed.

## Syntax
```ts
AnimationClip.channelsPtr: WasmPtr
```

## Returns
`WasmPtr` - Pointer to the packed channel table. Access after `dispose()` throws.

## See Also
- [AnimationClip.samplersPtr](./animationclip-samplersptr.md)
- [AnimationClip.dispose](./animationclip-dispose.md)
