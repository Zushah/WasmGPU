# Contributing to WasmGPU

Thank you for considering to contribute to WasmGPU! This document provides guidelines and instructions for doing so.

## How to Ask Questions

If you have a question about how to use WasmGPU, please first check the [`README.md`](https://www.github.com/Zushah/WasmGPU/blob/main/README.md) file, or the [`./examples/`](https://www.github.com/Zushah/WasmGPU/tree/main/examples) folder, or above all, the [website](https://zushah.github.io/WasmGPU). If you still need help, feel free to open an [issue](https://www.github.com/Zushah/WasmGPU/issues) with the `question` label.

## How to Report Bugs

If you find a bug in the source code, please open an [issue](https://www.github.com/Zushah/WasmGPU/issues). 
- Tag the issue as `bug`
- Give it a descriptive title
- Explain the steps to reproduce the behavior
- Include the expected behavior vs the actual behavior
- Provide details about your environment (i.e. browser/node, operating system, hardware specs, graphics driver, etc.)

## How to Suggest Features

If you have an idea for a new feature or an improvement to an existing one, please submit an [issue](https://www.github.com/Zushah/WasmGPU/issues).
- Tag the issue as `feature`
- Explain why this feature would be beneficial
- Provide at least one example of how the new feature would be used

## How to Contribute Code

1. Fork the `Zushah/WasmGPU` repository and clone it.
2. Create a new branch for your contribution with a useful but concise name.
3. Install development dependencies with `npm install`, which will install [TypeScript](https://www.npmjs.com/package/typescript), [Node](https://www.npmjs.com/package/@types/node) and [WebGPU](https://www.npmjs.com/package/@webgpu/types) types, [esbuild](https://www.npmjs.com/package/esbuild), and [Dawn WebGPU](https://www.npmjs.com/package/webgpu). However, depending on where exactly you want to contribute to the codebase, you may also need to install additional development dependencies, such as [Rust](https://rust-lang.org/tools/install/), [Python](https://www.python.org/downloads/), [MkDocs Material](https://squidfunk.github.io/mkdocs-material/getting-started/), etc. Note that WasmGPU has zero runtime dependencies and it is highly preferable to keep it that way.
4. Make your contribution. Do multiple small commits rather than one big commit. Breaking changes are actually fine (since WasmGPU is still pre-v1.0.0) as long as they are explicitly mentioned and reasonably justified. Also, please try to follow the existing code and commit styles and conventions.
5. Build the JavaScript bundles and run tests with `npm run build` and `npm run test`, or simply `npm run dev`. Make sure all tests pass. Update current tests or add new tests if applicable.
6. Open the `./examples/` files locally using the [live server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) and make sure they all still work. Update current examples or add new examples if applicable.
7. Restore the built JavaScript bundles of the latest release, since new bundles are only committed for new releases, with `npm run restore`.
8. Submit a [pull request](https://www.github.com/Zushah/WasmGPU/pulls) for the `main` branch of the `Zushah/WasmGPU` repository.
9. In the pull request's description, thoroughly explain your contribution and, if applicable, link it to relevant open [issues](https://www.github.com/Zushah/WasmGPU/issues).
10. Thanks!

## License

By contributing to WasmGPU, you agree that your contributions will be licensed under the [Mozilla Public License 2.0](https://www.github.com/Zushah/WasmGPU/blob/main/LICENSE.md).
