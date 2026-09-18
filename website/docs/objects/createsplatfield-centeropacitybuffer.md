# createSplatField#centerOpacityBuffer

## Summary

`createSplatField#centerOpacityBuffer` exposes the current packed `[x, y, z, opacity]` GPU storage buffer, or `null` before data is uploaded.

## Syntax

```ts
SplatField.centerOpacityBuffer: GPUBuffer | null
```

## Notes

Use creation and WebAssembly-source APIs to manage data. Do not replace this renderer-facing handle directly.

## See Also

- [createSplatField#upload](./createsplatfield-upload.md)
- [createSplatField#setWasmCenterOpacity](./createsplatfield-setwasmcenteropacity.md)
