# animation.createClip#channelsPtr

## Summary
animation.createClip#channelsPtr returns the Wasm pointer to the clip's packed transform-channel records. The table contains `channelCount` records and is valid only while the clip is not disposed.

## Syntax
```ts
AnimationClip.channelsPtr: WasmPtr
```

## Returns
`WasmPtr` - Pointer to the packed channel table. Access after `dispose()` throws.

## See Also
- [animation.createClip#samplersPtr](./animation-createclip-samplersptr.md)
- [animation.createClip#dispose](./animation-createclip-dispose.md)
