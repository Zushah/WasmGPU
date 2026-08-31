/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

(() => {
    const FOOTER_CLASS = "wasmgpu-docs-footer";
    const getRelativeRoot = () => {
        const path = window.location.pathname;
        if (path.includes("/docs/architecture/")) return "../../index.html";
        if (path.includes("/docs/")) return "../index.html";
        return "./index.html";
    };
    const ensureFooter = () => {
        const content = document.querySelector(".md-content__inner");
        if (!content) return;
        let footer = content.querySelector(`.${FOOTER_CLASS}`);
        if (!footer) {
            const rootLink = getRelativeRoot();
            footer = document.createElement("footer");
            footer.className = FOOTER_CLASS;
            footer.innerHTML = `<p>WasmGPU <a href="${rootLink}#latest-release" class="footer-link">v0.10.0</a>. Copyright &copy; <span id="docs-year">2026</span> <a href="https://github.com/Zushah" class="footer-link" target="_blank" rel="noreferrer">Zushah</a>. Available under the <a href="https://www.mozilla.org/MPL/2.0/" class="footer-link" target="_blank" rel="noreferrer">MPL-2.0</a>.</p>`;
            content.appendChild(footer);
        }
        const yearNode = footer.querySelector("#docs-year");
        if (yearNode) yearNode.textContent = String(new Date().getFullYear());
    };
    const bindWithMaterialInstantLoading = () => {
        const documentObservable = window.document$;
        if (documentObservable && typeof documentObservable.subscribe === "function") documentObservable.subscribe(() => requestAnimationFrame(ensureFooter));
    };
    bindWithMaterialInstantLoading();
    ensureFooter();
    window.addEventListener("DOMContentLoaded", ensureFooter);
})();
