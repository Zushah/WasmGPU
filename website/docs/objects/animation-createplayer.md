# animation.createPlayer

## Summary
animation.createPlayer creates a lightweight playback controller for one clip. Its initial time is `clip.startTime`; speed defaults to `1`, looping and playback default to `true`, and the player does not own or dispose the clip.

## Syntax
```ts
WasmGPU.animation.createPlayer(clip: AnimationClip, options?: Partial<Pick<AnimationPlayer, "speed" | "loop" | "playing">>): AnimationPlayer
const result = wgpu.animation.createPlayer(clip, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `clip` | `AnimationClip` | Yes | AnimationClip used by playback/update operations. |
| `options` | `Partial<Pick<AnimationPlayer, "speed" \| "loop" \| "playing">>` | No | Initial speed, looping, and playing flags. |

## Returns
`AnimationPlayer` - Playback controller positioned at `clip.startTime` with the requested initial flags.

## See Also
- [animation.createClip](./animation-createclip.md)
- [animation.createPlayer#update](./animation-createplayer-update.md)
