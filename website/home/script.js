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
    const themeImgNodes = document.querySelectorAll("[data-theme-img]");
    const waveCanvas = document.getElementById("wave-canvas");
    const waveFallback = document.getElementById("wave-fallback");
    const waveContainer = document.getElementById("wave-container");
    const LOGO_PALETTE = [
        [0 / 255, 90 / 255, 156 / 255, 1.0],
        [51 / 255, 85 / 255, 198 / 255, 1.0],
        [101 / 255, 79 / 255, 240 / 255, 1.0],
        [132 / 255, 114 / 255, 243 / 255, 1.0],
        [155 / 255, 141 / 255, 245 / 255, 1.0]
    ];
    let wgpu = null;
    let waveScene = null;
    let waveCamera = null;
    let waveDepthBands = [];
    let currentTheme = "dark";
    const applyThemeImages = (selectedTheme) => {
        themeImgNodes.forEach((imgNode) => {
            const darkSrc = imgNode.getAttribute("data-dark-src");
            const lightSrc = imgNode.getAttribute("data-light-src");
            if (selectedTheme === "dark" && darkSrc) imgNode.setAttribute("src", darkSrc);
            if (selectedTheme === "light" && lightSrc) imgNode.setAttribute("src", lightSrc);
        });
    };
    const updateWaveTheme = (selectedTheme) => {
        if (!wgpu || !waveScene) return;
        const isLight = selectedTheme === "light";
        waveScene.background = isLight ? [1.0, 1.0, 1.0] : [0.0, 0.0, 0.0];
        for (const band of waveDepthBands) {
            band.core.blendMode = isLight ? "transparent" : "additive";
            band.core.basePointSize = (isLight ? 22.5 : 9.0) * band.depth;
            band.core.maxPointSize = (isLight ? 22.5 : 9.0) * band.depth;
            band.halo.blendMode = isLight ? "transparent" : "additive";
            band.halo.basePointSize = (isLight ? 12.0 : 24.0) * band.depth;
            band.halo.maxPointSize = (isLight ? 12.0 : 24.0) * band.depth;
        }
    };
    const applyTheme = (theme) => {
        const selectedTheme = theme === "light" ? "light" : "dark";
        currentTheme = selectedTheme;
        body.setAttribute("data-theme", selectedTheme);
        applyThemeImages(selectedTheme);
        updateWaveTheme(selectedTheme);
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
    const initLiveWave = async () => {
        if (!waveCanvas || typeof navigator === "undefined" || !navigator.gpu) { showWaveFallback(); return; }
        try {
            let WasmGPUClass = window.WasmGPU;
            if (!WasmGPUClass) {
                try { const mod = await import("./WasmGPU.min.js"); WasmGPUClass = mod.WasmGPU; }
                catch { try { const mod = await import("../release/WasmGPU.min.js"); WasmGPUClass = mod.WasmGPU; } catch {} }
            }
            if (!WasmGPUClass) { showWaveFallback(); return; }
            wgpu = await WasmGPUClass.create(waveCanvas, { powerPreference: "high-performance", antialias: true });
            const isInitialLight = currentTheme === "light";
            waveScene = wgpu.createScene(isInitialLight ? [1.0, 1.0, 1.0] : [0.0, 0.0, 0.0]);
            const camPos = [0, 3.4, 7.8];
            waveCamera = wgpu.createCamera.perspective({ fov: 48, near: 0.1, far: 100 });
            waveCamera.transform.setPosition(camPos[0], camPos[1], camPos[2]);
            waveCamera.lookAt(0, -0.4, -0.5);
            const gridX = 124;
            const gridZ = 124;
            const pointCount = gridX * gridZ;
            const basePositions = new Float32Array(pointCount * 2);
            const pointColorIndices = new Uint8Array(pointCount);
            const initialDistances = new Float32Array(pointCount);
            const waveCoefficients = new Float32Array(pointCount * 10);
            const sizeX = 24.0;
            const sizeZ = 24.0;
            const stepX = sizeX / (gridX - 1);
            const stepZ = sizeZ / (gridZ - 1);
            const halfX = sizeX / 2;
            const halfZ = sizeZ / 2;
            let seed = 42;
            function pseudoRandom() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
            const weightedColorStops = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 4];
            let pInit = 0;
            for (let zIdx = 0; zIdx < gridZ; zIdx++) {
                const baseZ = -halfZ + zIdx * stepZ;
                for (let xIdx = 0; xIdx < gridX; xIdx++) {
                    const baseX = -halfX + xIdx * stepX;
                    const jitterX = (pseudoRandom() - 0.5) * stepX * 0.9;
                    const jitterZ = (pseudoRandom() - 0.5) * stepZ * 0.9;
                    basePositions[pInit * 2 + 0] = baseX + jitterX;
                    basePositions[pInit * 2 + 1] = baseZ + jitterZ;
                    const colorStopIdx = weightedColorStops[Math.floor(pseudoRandom() * weightedColorStops.length)];
                    pointColorIndices[pInit] = colorStopIdx;
                    const x = basePositions[pInit * 2 + 0];
                    const z = basePositions[pInit * 2 + 1];
                    const coefficientOffset = pInit * 10;
                    const phaseA = 0.42 * x + 1.2;
                    const phaseB = 0.32 * z + 0.4;
                    const phaseC = 0.64 * (x * 0.7 + z * 0.65);
                    const phaseD = 1.05 * x - 0.5 * z;
                    const phaseE = 0.15 * (x * x + z * z) * 0.03;
                    const sinA = Math.sin(phaseA);
                    const cosA = Math.cos(phaseA);
                    const sinB = Math.sin(phaseB);
                    const cosB = Math.cos(phaseB);
                    waveCoefficients[coefficientOffset + 0] = 0.7 * sinA * cosB;
                    waveCoefficients[coefficientOffset + 1] = -0.7 * sinA * sinB;
                    waveCoefficients[coefficientOffset + 2] = 0.7 * cosA * cosB;
                    waveCoefficients[coefficientOffset + 3] = -0.7 * cosA * sinB;
                    waveCoefficients[coefficientOffset + 4] = 0.44 * Math.sin(phaseC);
                    waveCoefficients[coefficientOffset + 5] = -0.44 * Math.cos(phaseC);
                    waveCoefficients[coefficientOffset + 6] = 0.28 * Math.cos(phaseD);
                    waveCoefficients[coefficientOffset + 7] = -0.28 * Math.sin(phaseD);
                    waveCoefficients[coefficientOffset + 8] = 0.35 * Math.sin(phaseE);
                    waveCoefficients[coefficientOffset + 9] = -0.35 * Math.cos(phaseE);
                    const y = waveCoefficients[coefficientOffset + 0] + waveCoefficients[coefficientOffset + 4] + waveCoefficients[coefficientOffset + 6] + waveCoefficients[coefficientOffset + 8] - 0.38;
                    const dist = Math.hypot(x - camPos[0], y - camPos[1], z - camPos[2]);
                    initialDistances[pInit] = dist;
                    pInit++;
                }
            }
            const isLight = currentTheme === "light";
            const bandCount = 16;
            const minDistance = Math.min(...initialDistances);
            const maxDistance = Math.max(...initialDistances);
            const bandIndices = Array.from({ length: bandCount }, () => []);
            for (let i = 0; i < pointCount; i++) {
                const depth = Math.max(0, Math.min(1, (maxDistance - initialDistances[i]) / (maxDistance - minDistance)));
                bandIndices[Math.round(depth * (bandCount - 1))].push(i);
            }
            const scaleTransform = { componentCount: 4, componentIndex: 3, stride: 4, offset: 0, mode: "linear", domainMin: 0, domainMax: 1 };
            const { device, queue } = wgpu.gpu;
            const activeBands = bandIndices.map((indices, bandIndex) => ({ indices, bandIndex })).filter((band) => band.indices.length > 0);
            waveDepthBands = activeBands.map(({ indices, bandIndex }) => {
                const depth = bandIndex / (bandCount - 1);
                const data = new Float32Array(indices.length * 4);
                const coefficients = new Float32Array(indices.length * 10);
                const colors = new Float32Array(indices.length * 4);
                indices.forEach((sourceIndex, targetIndex) => {
                    const sourcePositionOffset = sourceIndex * 2;
                    const targetDataOffset = targetIndex * 4;
                    const sourceCoefficientOffset = sourceIndex * 10;
                    const targetCoefficientOffset = targetIndex * 10;
                    const color = LOGO_PALETTE[pointColorIndices[sourceIndex]];
                    const coefficient = waveCoefficients.subarray(sourceCoefficientOffset, sourceCoefficientOffset + 10);
                    data[targetDataOffset + 0] = basePositions[sourcePositionOffset + 0];
                    data[targetDataOffset + 1] = coefficient[0] + coefficient[4] + coefficient[6] + coefficient[8] - 0.38;
                    data[targetDataOffset + 2] = basePositions[sourcePositionOffset + 1];
                    data[targetDataOffset + 3] = pointColorIndices[sourceIndex] / 4.0;
                    coefficients.set(coefficient, targetCoefficientOffset);
                    colors.set([color[0], color[1], color[2], depth], targetDataOffset);
                });
                const pointsBuffer = device.createBuffer({ label: `WasmGPU homepage wave points ${bandIndex}`, size: data.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
                const colorsBuffer = device.createBuffer({ label: `WasmGPU homepage wave colors ${bandIndex}`, size: colors.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
                queue.writeBuffer(pointsBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
                queue.writeBuffer(colorsBuffer, 0, colors.buffer, colors.byteOffset, colors.byteLength);
                const common = {
                    pointsBuffer, colorsBuffer, pointCount: indices.length,
                    boundsMin: [-halfX, -3.0, -halfZ], boundsMax: [halfX, 3.0, halfZ],
                    blendMode: isLight ? "transparent" : "additive",
                    sizeAttenuation: 0, colorMode: "rgba", scaleTransform,
                    keepCPUData: false
                };
                const core = wgpu.createPointCloud({ ...common, basePointSize: (isLight ? 22.5 : 9.0) * depth, minPointSize: 0, maxPointSize: (isLight ? 22.5 : 9.0) * depth, softness: 0.36, opacity: 1.0 });
                const halo = wgpu.createPointCloud({ ...common, basePointSize: (isLight ? 12.0 : 24.0) * depth, minPointSize: 0, maxPointSize: (isLight ? 12.0 : 24.0) * depth, softness: 0.9, opacity: 0.56 });
                waveScene.add(core);
                waveScene.add(halo);
                return { data, coefficients, pointsBuffer, colorsBuffer, core, halo, depth };
            });
            const updateWaveBands = (time) => {
                const t = time * 0.26;
                const sinT11 = Math.sin(t * 1.1);
                const cosT11 = Math.cos(t * 1.1);
                const sinT08 = Math.sin(t * 0.8);
                const cosT08 = Math.cos(t * 0.8);
                const sinT115 = Math.sin(t * 1.15);
                const cosT115 = Math.cos(t * 1.15);
                const sinT09 = Math.sin(t * 0.9);
                const cosT09 = Math.cos(t * 0.9);
                const sinT06 = Math.sin(t * 0.6);
                const cosT06 = Math.cos(t * 0.6);
                const cosT11CosT08 = cosT11 * cosT08;
                const cosT11SinT08 = cosT11 * sinT08;
                const sinT11CosT08 = sinT11 * cosT08;
                const sinT11SinT08 = sinT11 * sinT08;
                for (const band of waveDepthBands) {
                    const { data, coefficients } = band;
                    const bandPointCount = data.length / 4;
                    for (let i = 0; i < bandPointCount; i++) {
                        const dataOffset = i * 4;
                        const coefficientOffset = i * 10;
                        data[dataOffset + 1] = coefficients[coefficientOffset + 0] * cosT11CosT08 + coefficients[coefficientOffset + 1] * cosT11SinT08 + coefficients[coefficientOffset + 2] * sinT11CosT08 + coefficients[coefficientOffset + 3] * sinT11SinT08 + coefficients[coefficientOffset + 4] * cosT115 + coefficients[coefficientOffset + 5] * sinT115 + coefficients[coefficientOffset + 6] * cosT09 + coefficients[coefficientOffset + 7] * sinT09 + coefficients[coefficientOffset + 8] * cosT06 + coefficients[coefficientOffset + 9] * sinT06 - 0.38;
                    }
                    queue.writeBuffer(band.pointsBuffer, 0, data.buffer, data.byteOffset, data.byteLength);
                }
            };
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (reduceMotion) wgpu.render(waveScene, waveCamera);
            else wgpu.run((_dt, time) => { if (document.hidden) return; updateWaveBands(time); wgpu.render(waveScene, waveCamera); });
        } catch (_err) { showWaveFallback(); }
    };
    const showWaveFallback = () => {
        console.warn("WebGPU is unsupported or unavailable in this browser. Falling back to static visual background.");
        if (waveCanvas) waveCanvas.style.display = "none";
        if (waveFallback) waveFallback.classList.add("active");
        if (waveContainer) waveContainer.classList.add("fallback-active");
    };
    initLiveWave().catch(() => showWaveFallback());
    const copyText = async (value) => {
        if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(value); return; }
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
        button.innerHTML = `<span class="material-symbols-outlined">check</span>${label}`;
        button.disabled = true;
        window.setTimeout(() => { button.innerHTML = original; button.disabled = false; }, 1200);
    };
    document.querySelectorAll(".copy-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const targetId = button.getAttribute("data-copy-target");
            if (!targetId) return;
            const targetNode = document.getElementById(targetId);
            if (!targetNode) return;
            try { await copyText(targetNode.innerText.trim()); showCopyFeedback(button, "Copied"); } catch (_error) { showCopyFeedback(button, "Copy failed"); }
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
            } catch (error) { if (error && error.name === "AbortError") return; fallbackDownload(href, filename); }
        });
    }
    const revealNodes = document.querySelectorAll(".reveal");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) revealNodes.forEach((node) => node.classList.add("in-view"));
    else {
        const observer = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("in-view"); observer.unobserve(entry.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -20px 0px" });
        revealNodes.forEach((node) => observer.observe(node));
    }
    const yearElem = document.getElementById("year");
    if (yearElem) yearElem.textContent = String(new Date().getFullYear());
})();
