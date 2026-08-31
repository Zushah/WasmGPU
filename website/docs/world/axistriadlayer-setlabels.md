# AxisTriadLayer.setLabels

## Summary
AxisTriadLayer.setLabels sets the X, Y, and Z labels.
When negative labels are omitted, each positive label is prefixed with `-`.

## Syntax
```ts
AxisTriadLayer.setLabels(labels: [string, string, string], negativeLabels?: [string, string, string]): this
layer.setLabels(labels, negativeLabels);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `labels` | `[string, string, string]` | Yes | Positive X/Y/Z labels. |
| `negativeLabels` | `[string, string, string]` | No | Optional negative X/Y/Z labels. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type AxisLabels = [string, string, string];
```

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setLabels(["X", "Y", "Z"], ["−X", "−Y", "−Z"]);
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
