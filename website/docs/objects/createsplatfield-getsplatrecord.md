# createSplatField#getSplatRecord

## Summary

`createSplatField#getSplatRecord()` reads one retained CPU record, including position, rotation, scale, opacity, packed center/opacity, and the active color representation.

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

- [createSplatField#getSphericalHarmonicsRecord](./createsplatfield-getsphericalharmonicsrecord.md)
- [createSplatField#dropCPUData](./createsplatfield-dropcpudata.md)
