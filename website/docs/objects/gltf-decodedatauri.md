# decodeDataUri

## Summary
decodeDataUri validates and decodes a base64 or percent-encoded data URI into bytes and an optional media type.

## Syntax
```ts
decodeDataUri(uri: string): DecodedDataUri
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `uri` | `string` | Yes | Complete `data:` URI to validate and decode. |

## Returns
```ts
type DecodedDataUri = { mimeType: string | null; data: ArrayBuffer };
```

Malformed schemes, media types, parameters, escapes, or base64 payloads throw an `Error`.

## Type Details
`mimeType` contains the validated media type and parameters, excluding the `base64` marker, or `null` when no media type was supplied. `data` is a newly allocated byte buffer. Base64 payloads are decoded as bytes; non-base64 payloads support percent escapes and encode unescaped non-ASCII characters as UTF-8.

## Example
```js
import { decodeDataUri } from "@zushah/wasmgpu";

const decoded = decodeDataUri("data:application/octet-stream;base64,AQID");
console.log(decoded.mimeType); // application/octet-stream
console.log(Array.from(new Uint8Array(decoded.data))); // [1, 2, 3]
```

## See Also
- [isDataUri](./gltf-isdatauri.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
