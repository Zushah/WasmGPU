# geometry#isSkinned8

## Summary
geometry#isSkinned8 is `true` when both first- and second-set joint and weight GPU buffers exist, enabling eight influences per vertex. It remains `false` before those four buffers are uploaded.

## Syntax
```ts
Geometry.isSkinned8: boolean
const value = geometry.isSkinned8;
```

## Returns
`true` when both uploaded joint/weight buffer pairs exist; otherwise `false`.

## See Also
- [geometry#isSkinned](./geometry-isskinned.md)
- [geometry#joints1Buffer](./geometry-joints1buffer.md)
- [geometry#jointsBuffer](./geometry-jointsbuffer.md)
- [geometry#weights1Buffer](./geometry-weights1buffer.md)
- [geometry#weightsBuffer](./geometry-weightsbuffer.md)
