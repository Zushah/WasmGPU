# dirnameUrl

## Summary
dirnameUrl returns the directory portion of an absolute, protocol-relative, root-relative, or relative URL and removes its query and fragment.

## Syntax
```ts
dirnameUrl(url: string): string
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | `string` | Yes | Absolute, protocol-relative, root-relative, or relative URL. |

## Returns
`string` - Directory prefix ending in `/`, or an empty string when the input has no directory component.

## Type Details
For absolute and protocol-relative URLs, the result preserves the origin and normalized path while removing the query and fragment. Relative inputs are handled textually: the function removes any query or fragment, then retains everything through the last `/`.

## Example
```js
import { dirnameUrl } from "@zushah/wasmgpu";
console.log(dirnameUrl("https://example.test/models/scene.gltf?rev=2"));
// https://example.test/models/
```

## See Also
- [normalizeDirectoryUrl](./gltf-normalizedirectoryurl.md)
- [resolveUri](./gltf-resolveuri.md)
