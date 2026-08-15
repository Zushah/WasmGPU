/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
(() => {
    const STORAGE_KEY = "wasmgpu-theme";
    const body = document.body;
    const themeToggleButton = document.getElementById("theme-toggle");
    const themeToggleIcon = document.getElementById("theme-toggle-icon");
    const logoNodes = document.querySelectorAll("[data-theme-logo]");
    const applyTheme = (theme) => {
        const selectedTheme = theme === "light" ? "light" : "dark";
        body.setAttribute("data-theme", selectedTheme);
        logoNodes.forEach((logoNode) => {
            const darkLogo = logoNode.getAttribute("data-dark-logo");
            const lightLogo = logoNode.getAttribute("data-light-logo");
            if (selectedTheme === "dark" && darkLogo) logoNode.setAttribute("src", darkLogo);
            if (selectedTheme === "light" && lightLogo) logoNode.setAttribute("src", lightLogo);
        });
        if (themeToggleIcon) themeToggleIcon.textContent = selectedTheme === "dark" ? "light_mode" : "dark_mode";
    };
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    applyTheme(savedTheme || "dark");
    if (themeToggleButton) {
        themeToggleButton.addEventListener("click", () => {
            const nextTheme = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
            applyTheme(nextTheme);
            localStorage.setItem(STORAGE_KEY, nextTheme);
        });
    }
    const copyText = async (value) => {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return;
        }
        const tempTextArea = document.createElement("textarea");
        tempTextArea.value = value;
        tempTextArea.style.position = "fixed";
        tempTextArea.style.opacity = "0";
        document.body.appendChild(tempTextArea);
        tempTextArea.focus();
        tempTextArea.select();
        document.execCommand("copy");
        document.body.removeChild(tempTextArea);
    };
    const showCopyFeedback = (button, label) => {
        const original = button.innerHTML;
        button.innerHTML = `<span class="material-icons-outlined">check</span>${label}`;
        button.disabled = true;
        window.setTimeout(() => {
            button.innerHTML = original;
            button.disabled = false;
        }, 1200);
    };
    document.querySelectorAll(".copy-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const targetId = button.getAttribute("data-copy-target");
            if (!targetId) return;
            const targetNode = document.getElementById(targetId);
            if (!targetNode) return;
            try {
                await copyText(targetNode.innerText.trim());
                showCopyFeedback(button, "Copied");
            } catch (_error) { showCopyFeedback(button, "Copy failed"); }
        });
    });
    const fallbackDownload = (url, filename) => {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.rel = "noreferrer";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const manualDownloadLink = document.getElementById("manual-download-link");
    if (manualDownloadLink) {
        manualDownloadLink.addEventListener("click", async (event) => {
            const href = manualDownloadLink.getAttribute("href") || "./WasmGPU.min.js";
            const filename = manualDownloadLink.getAttribute("download") || "WasmGPU.min.js";
            const savePicker = window.showSaveFilePicker;
            if (typeof savePicker !== "function" || !window.isSecureContext) return;
            event.preventDefault();
            try {
                const response = await fetch(href, { cache: "no-store" });
                if (!response.ok) throw new Error("Download source unavailable");
                const fileHandle = await savePicker({
                    suggestedName: filename,
                    types: [
                        {
                            description: "JavaScript File",
                            accept: {
                                "application/javascript": [".js"],
                                "text/javascript": [".js"]
                            }
                        }
                    ]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(await response.blob());
                await writable.close();
            } catch (error) {
                if (error && error.name === "AbortError") return;
                fallbackDownload(href, filename);
            }
        });
    }
    const revealNodes = document.querySelectorAll(".reveal");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) revealNodes.forEach((node) => node.classList.add("in-view"));
    else {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("in-view");
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.18, rootMargin: "0px 0px -30px 0px" }
        );
        revealNodes.forEach((node) => observer.observe(node));
    }
    document.getElementById("year").textContent = new Date().getFullYear();
})();
