# SplatField.ndShape

## Summary

`SplatField.ndShape` is an optional positive-integer shape used to decode linear splat indices.

## Syntax

```ts
SplatField.ndShape: number[] | null
splatField.ndShape = [depth, height, width];
```

## Notes

The getter returns a copy. Assign `null` to disable multidimensional index decoding. WasmGPU validates the dimensions but does not require their product to equal `splatCount`; callers should keep the two consistent when the shape describes the complete field.

## See Also

- [SplatField.mapLinearIndexToNd](./wasmgpu-objects-splatfield-maplinearindextond.md)
- [SplatField.splatCount](./wasmgpu-objects-splatfield-splatcount.md)
