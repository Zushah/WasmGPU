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
3. Install development dependencies with `npm install`, then install the pinned Playwright Chromium build with `npx playwright install --with-deps --no-shell chromium`. These commands install [TypeScript](https://www.npmjs.com/package/typescript), [Node](https://www.npmjs.com/package/@types/node) types, [WebGPU](https://www.npmjs.com/package/@webgpu/types) types, [esbuild](https://www.npmjs.com/package/esbuild), and [Playwright](https://www.npmjs.com/package/playwright). Depending on where exactly you want to contribute to the codebase, you may also need additional development dependencies, such as [Rust](https://rust-lang.org/tools/install/), [Python](https://www.python.org/downloads/), [MkDocs Material](https://squidfunk.github.io/mkdocs-material/getting-started/), [NumPy](https://numpy.org/install/), and [Matplotlib](https://matplotlib.org/stable/users/getting_started/). Note that WasmGPU has zero runtime dependencies and it is highly preferable to keep it that way.
4. Make your contribution. Make sure each commit is focused on a single contribution, whether it's a big or small. Breaking changes are actually fine (since WasmGPU is still pre-v1.0.0) as long as they are explicitly mentioned and reasonably justified. Also, please try to follow the existing code and documentation styles and conventions and whatnot.
5. Build the JavaScript bundles and run tests with `npm run build` and `npm run test`, or simply `npm run dev`. Note that `npm run test:js` launches isolated Chromium pages with WebGPU enabled, while CI selects software GPU backends on each operating system. Use `npm run test:ex` to run the automated examples tests, or use `npm run test:js:headed` or `npm run test:js:debug` when diagnosing browser failures. Make sure all tests pass. Update current tests or add new tests if applicable.
6. Running the automated examples tests with `npm run test:ex` will verify startup, browser and WebGPU diagnostics, completed GPU work, and selected interactions for every file under `./examples/`. So make sure to visually inspect or manually exercise examples affected by your contribution, because automated checks do not replace exploratory interaction and rendering review. Update current examples or add new examples if applicable.
7. Particularly for performance-sensitive changes, run the benchmarking suite with `npm run bench`. See [`./benchmarks/README.md`](./benchmarks/README.md) for more info.
8. Use `npm run restore` to restore the built JavaScript bundles of the latest release, since new bundles are only committed for new releases.
9. Submit a [pull request](https://www.github.com/Zushah/WasmGPU/pulls) against the `main` branch of the `Zushah/WasmGPU` repository. In the pull request's description, thoroughly explain your contribution and, if applicable, link it to relevant open [issues](https://www.github.com/Zushah/WasmGPU/issues).
10. Thanks!

## License

By contributing to WasmGPU, you agree that your contributions will be licensed under the [Mozilla Public License 2.0](https://www.github.com/Zushah/WasmGPU/blob/main/LICENSE.md).
