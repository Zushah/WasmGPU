# animation.createPlayer#update

## Summary
animation.createPlayer#update advances `time` by `dtSeconds * speed` and samples the clip when `playing` is true. Looping wraps into `[startTime, endTime)` in either direction; non-looping playback clamps to the inclusive endpoints but does not automatically set `playing` to false. A zero-duration clip samples `startTime` without advancing.

## Syntax
```ts
AnimationPlayer.update(dtSeconds: number): void
player.update(dtSeconds);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dtSeconds` | `number` | Yes | Finite elapsed time in seconds. Non-finite values are unsupported. |

## Returns
`void`

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const clip = wgpu.animation.createClip({ name: "clip", samplerCount: 0, channelCount: 0, samplersPtr: 0, channelsPtr: 0, startTime: 0, endTime: 1 });
const player = wgpu.animation.createPlayer(clip, { speed: 1, loop: true, playing: true });
const dtSeconds = 1;
player.update(dtSeconds);
console.log(player.time); // 0 after looping across the one-second clip
```

## See Also
- [WasmGPU.animation.createClip](./animation-createclip.md)
- [animation.createPlayer](./animation-createplayer.md)
- [animation.createClip#sample](./animation-createclip-sample.md)
