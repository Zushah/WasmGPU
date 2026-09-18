# geometry#isIndexed

## Summary
geometry#isIndexed reports whether indexed drawing is available after upload. Use it after `upload(device)`; it is not a test for whether index source data has been configured.

## Syntax
```ts
Geometry.isIndexed: boolean
const value = geometry.isIndexed;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Whether indexed drawing is available from the uploaded geometry.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.sphere(1, 24, 16);
const value = geometry.isIndexed;
console.log(value);
```

## See Also
- [geometry#boundsCenter](./geometry-boundscenter.md)
- [geometry#boundsMax](./geometry-boundsmax.md)
- [geometry#boundsMin](./geometry-boundsmin.md)
- [geometry#boundsRadius](./geometry-boundsradius.md)
- [geometry#destroy](./geometry-destroy.md)
- [geometry#indexBuffer](./geometry-indexbuffer.md)
- [geometry#isSkinned](./geometry-isskinned.md)
- [geometry#isSkinned8](./geometry-isskinned8.md)
- [geometry#joints1Buffer](./geometry-joints1buffer.md)
- [geometry#jointsBuffer](./geometry-jointsbuffer.md)
- [geometry#normalBuffer](./geometry-normalbuffer.md)
- [geometry#positionBuffer](./geometry-positionbuffer.md)
