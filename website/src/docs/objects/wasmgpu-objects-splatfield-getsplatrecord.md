# SplatField.getSplatRecord

## Summary

`SplatField.getSplatRecord()` reads one retained CPU record, including position, rotation, scale, opacity, packed center/opacity, and the active color representation.

## Syntax

```ts
SplatField.getSplatRecord(index: number): SplatRecord | null
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Zero-based splat index. |

## Returns

`SplatRecord | null` - The record, or `null` for an invalid index or when required CPU arrays were not retained.

## Notes

Set `keepCPUData: true` when creating or refreshing the field if records are needed after upload.

## See Also

- [SplatField.getSphericalHarmonicsRecord](./wasmgpu-objects-splatfield-getsphericalharmonicsrecord.md)
- [SplatField.dropCPUData](./wasmgpu-objects-splatfield-dropcpudata.md)
