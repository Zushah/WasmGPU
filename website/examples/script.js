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
    const applyTheme = (theme) => {
        const selectedTheme = theme === "light" ? "light" : "dark";
        body.setAttribute("data-theme", selectedTheme);
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
        const observer = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("in-view"); observer.unobserve(entry.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -20px 0px" });
        revealNodes.forEach((node) => observer.observe(node));
    }
    const setupNavMenu = () => {
        const header = document.querySelector(".site-header");
        const navToggle = document.getElementById("nav-toggle");
        const navToggleIcon = document.getElementById("nav-toggle-icon");
        const navMenu = document.getElementById("nav-menu");
        if (!header || !navToggle || !navMenu) return;
        const setOpen = (open, returnFocus = false) => {
            header.classList.toggle("nav-open", open);
            navToggle.setAttribute("aria-expanded", String(open));
            navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
            if (navToggleIcon) navToggleIcon.textContent = open ? "close" : "menu";
            if (!open && returnFocus) navToggle.focus();
        };
        navToggle.addEventListener("click", (event) => {
            const open = !header.classList.contains("nav-open");
            const firstLink = navMenu.querySelector("a");
            setOpen(open);
            if (open && event.detail === 0 && firstLink) firstLink.focus();
        });
        navMenu.addEventListener("click", (event) => { if (event.target.closest("a")) setOpen(false); });
        document.addEventListener("click", (event) => { if (header.classList.contains("nav-open") && !header.contains(event.target)) setOpen(false); });
        document.addEventListener("keydown", (event) => { if (event.key === "Escape" && header.classList.contains("nav-open")) setOpen(false, true); });
        window.matchMedia("(max-width: 1080px)").addEventListener("change", (event) => { if (!event.matches) setOpen(false); });
    };
    setupNavMenu();
    const yearElem = document.getElementById("year");
    if (yearElem) yearElem.textContent = String(new Date().getFullYear());
})();
