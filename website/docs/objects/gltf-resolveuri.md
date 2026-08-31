# resolveUri

## Summary
resolveUri resolves a glTF resource URI against an absolute, protocol-relative, root-relative, or relative base while preserving already absolute resource URIs.

## Syntax
```ts
resolveUri(baseUri: string, uri: string): string
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `baseUri` | `string` | Yes | Directory URL or path used for relative resolution. |
| `uri` | `string` | Yes | Resource URI to resolve. |

## Returns
`string` - Resolved resource URI.

## Type Details
Already absolute resource URIs are returned unchanged. Absolute, protocol-relative, root-relative, and relative bases are supported. An empty base returns `uri`; if native URL parsing fails for an absolute base, the function also falls back to the original `uri`.

## Example
```js
import { resolveUri } from "@zushah/wasmgpu";
console.log(resolveUri("https://example.test/models/", "textures/base.png"));
// https://example.test/models/textures/base.png
```

## See Also
- [dirnameUrl](./gltf-dirnameurl.md)
- [normalizeDirectoryUrl](./gltf-normalizedirectoryurl.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
