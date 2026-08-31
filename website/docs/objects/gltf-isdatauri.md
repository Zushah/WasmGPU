# isDataUri

## Summary
isDataUri reports whether a string begins with the `data:` URI scheme, using a case-insensitive scheme comparison.

## Syntax
```ts
isDataUri(uri: string): boolean
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `uri` | `string` | Yes | URI string to inspect. |

## Returns
`boolean` - `true` when the first five characters case-insensitively equal `data:`.

## Type Details
This is a lightweight scheme-prefix check. It does not validate metadata, escaping, or payload contents; call `decodeDataUri` when validity matters.

## Example
```js
import { isDataUri } from "@zushah/wasmgpu";
console.log(isDataUri("data:application/octet-stream;base64,AA==")); // true
console.log(isDataUri("textures/base.png")); // false
```

## See Also
- [decodeDataUri](./gltf-decodedatauri.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
