# normalizeDirectoryUrl

## Summary
normalizeDirectoryUrl ensures that the path portion of a non-empty URL ends with `/`, preserving any query or fragment suffix.

## Syntax
```ts
normalizeDirectoryUrl(url: string): string
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | `string` | Yes | Directory URL or path to normalize. |

## Returns
`string` - The input with a trailing path slash inserted when necessary.

## Type Details
The function preserves query and fragment suffixes and inserts `/` immediately before them. An empty string remains empty. It does not resolve `.` or `..` segments or convert a file URL into its parent directory; use `dirnameUrl` for the latter.

## Example
```js
import { normalizeDirectoryUrl } from "@zushah/wasmgpu";

console.log(normalizeDirectoryUrl("https://example.test/assets?rev=2"));
// https://example.test/assets/?rev=2
```

## Notes
An empty string remains empty. Use this for an explicit glTF `resourceBaseUrl` that represents a directory.

## See Also
- [dirnameUrl](./gltf-dirnameurl.md)
- [resolveUri](./gltf-resolveuri.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
