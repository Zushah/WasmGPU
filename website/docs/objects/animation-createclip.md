# animation.createClip

## Summary
animation.createClip creates a clip over packed Wasm sampler and transform-channel tables. The optional owned-allocation lists transfer responsibility for those exact allocations to the clip; `dispose()` releases them.

## Syntax
```ts
WasmGPU.animation.createClip(descriptor: AnimationClipDescriptor): AnimationClip
const result = wgpu.animation.createClip(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `AnimationClipDescriptor` | Yes | Packed sampler/channel tables, clip time range, name, and optional Wasm allocations whose ownership transfers to the clip. |

## Returns
`AnimationClip` - Clip that borrows or owns the descriptor's packed Wasm data as specified.

## Type Details
### AnimationClipDescriptor

```ts
type AnimationClipDescriptor = {
    name: string;
    samplerCount: number;
    channelCount: number;
    samplersPtr: WasmPtr;
    channelsPtr: WasmPtr;
    startTime: number;
    endTime: number;
    ownedF32Allocs?: ReadonlyArray<{ ptr: WasmPtr; len: number }>;
    ownedU32Allocs?: ReadonlyArray<{ ptr: WasmPtr; len: number }>;
};
```

#### AnimationClipDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Human-readable clip name used for debugging, UI, or lookup. |
| `samplerCount` | `number` | Yes | Number of packed sampler records reachable from `samplersPtr`. |
| `channelCount` | `number` | Yes | Number of packed animation channel records reachable from `channelsPtr`. |
| `samplersPtr` | `WasmPtr` | Yes | Wasm pointer to packed animation sampler table data. |
| `channelsPtr` | `WasmPtr` | Yes | Wasm pointer to packed animation channel table data. |
| `startTime` | `number` | Yes | Clip start time in seconds. |
| `endTime` | `number` | Yes | Clip end time in seconds. |
| `ownedF32Allocs` | `ReadonlyArray<{ ptr: WasmPtr; len: number }>` | No | Float32 Wasm allocations transferred to the clip and freed by `dispose()`. |
| `ownedU32Allocs` | `ReadonlyArray<{ ptr: WasmPtr; len: number }>` | No | Uint32 Wasm allocations transferred to the clip and freed by `dispose()`. |

### WasmPtr

```ts
type WasmPtr = number;
```

## See Also
- [animation.createPlayer](./animation-createplayer.md)
- [animation.createSkin](./animation-createskin.md)
- [animation.createClip#dispose](./animation-createclip-dispose.md)
- [animation.createClip#disposed](./animation-createclip-disposed.md)
