# WasmGPU.animation

## Summary
WasmGPU.animation is the animation and skin factory facade. It creates animation clips, players that advance a clip over time, and reusable skins that can create per-mesh skin instances.

## Syntax
```ts
const clip = wgpu.animation.createClip(descriptor);
const player = wgpu.animation.createPlayer(clip);
```

## Available APIs
- [animation.createClip](./animation-createclip.md) creates an animation clip.
- [animation.createPlayer](./animation-createplayer.md) creates a player for a clip.
- [animation.createClip#sample](./animation-createclip-sample.md) samples a returned clip.
- [animation.createPlayer#update](./animation-createplayer-update.md) advances a returned player.
- [animation.createSkin](./animation-createskin.md) creates a skin, and [animation.createSkin#createInstance](./animation-createskin-createinstance.md) binds it to a mesh transform.

## See Also
- [WasmGPU.gltf](./wasmgpu-gltf.md)
- [WasmGPU.createTransform](../render/wasmgpu-createtransform.md)
- [WasmGPU.createMesh](./wasmgpu-createmesh.md)
