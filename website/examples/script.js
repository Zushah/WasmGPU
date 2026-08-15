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
            },
            { threshold: 0.18, rootMargin: "0px 0px -24px 0px" }
        );
        revealNodes.forEach((node) => observer.observe(node));
    }
    document.getElementById("year").textContent = new Date().getFullYear();
})();
