/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
(() => {
    const FOOTER_CLASS = "wasmgpu-docs-footer";
    const FOOTER_HTML = '<p>Copyright &copy; <span id="year"></span> <a href="https://www.github.com/Zushah" target="_blank" rel="noreferrer">Zushah</a>.</p>';
    const ensureFooter = () => {
        const content = document.querySelector(".md-content__inner");
        if (!content) return;
        let footer = content.querySelector(`.${FOOTER_CLASS}`);
        if (!footer) {
            footer = document.createElement("footer");
            footer.className = FOOTER_CLASS;
            footer.innerHTML = FOOTER_HTML;
            content.appendChild(footer);
        }
        const yearNode = footer.querySelector("#year");
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
