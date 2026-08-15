# WasmGPU.animation.createClip

## Summary
WasmGPU.animation.createClip creates a clip over packed Wasm sampler and transform-channel tables. The optional owned-allocation lists transfer responsibility for those exact allocations to the clip; `dispose()` releases them.

## Syntax
```ts
WasmGPU.animation.createClip(descriptor: AnimationClipDescriptor): AnimationClip
const result = wgpu.animation.createClip(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `AnimationClipDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`AnimationClip` - AnimationClip runtime object created for animation workflows.

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

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const descriptor = { name: "walk", samplerCount: 0, channelCount: 0, samplersPtr: 0, channelsPtr: 0, startTime: 0, endTime: 1 };
const result = wgpu.animation.createClip(descriptor);
console.log(result);
result.dispose();
```

## See Also
- [WasmGPU.animation.createPlayer](./wasmgpu-animation-createplayer.md)
- [WasmGPU.animation.createSkin](./wasmgpu-animation-createskin.md)
- [AnimationClip.dispose](./animationclip-dispose.md)
- [AnimationClip.disposed](./animationclip-disposed.md)
