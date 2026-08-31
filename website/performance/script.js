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
    const chartsContainer = document.getElementById("benchmark-charts-container");
    const tableBody = document.getElementById("bench-table-body");
    const catButtons = document.querySelectorAll(".cat-btn");
    const tableTitle = document.getElementById("benchmark-table-title");
    const BENCHMARK_COMMIT_SHA = "32b58fde6ac68dd3b40fe73ecd95ca3215c947ef";
    const GITHUB_REPOSITORY = "Zushah/WasmGPU";
    const GITHUB_API_ROOT = `https://api.github.com/repos/${GITHUB_REPOSITORY}`;
    const BENCHMARK_SOURCE_ROOT = `https://github.com/${GITHUB_REPOSITORY}/blob/${BENCHMARK_COMMIT_SHA}/benchmarks/`;
    let benchmarkData = [];
    let benchmarkGroups = [];
    const fetchJson = async (url) => {
        const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
        if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${url}`);
        return response.json();
    };
    const parseBenchmarkSummary = (markdown) => {
        const rows = [];
        for (const line of markdown.split(/\r?\n/)) {
            if (!line.startsWith("| ") || line.startsWith("| Benchmark ") || line.startsWith("|---")) continue;
            const columns = line.split("|").slice(1, -1).map((column) => column.trim());
            if (columns.length !== 5) continue;
            const [name, size, medianWithUnit, mean, p95] = columns;
            const medianParts = medianWithUnit.match(/^(\S+)\s+(.+)$/);
            if (!medianParts) continue;
            const median = medianParts[1];
            const unit = medianParts[2];
            const toNumber = (value) => Number(value.replaceAll(",", ""));
            const medianNum = toNumber(median);
            const meanNum = toNumber(mean);
            const p95Num = toNumber(p95);
            if (![medianNum, meanNum, p95Num].every(Number.isFinite)) continue;
            rows.push({ name, size, medianNum, meanNum, p95Num, median, mean, p95, unit });
        }
        if (!rows.length) throw new Error("The selected commit contains no parseable benchmark results.");
        return rows;
    };
    const loadBenchmarkData = async () => {
        const commit = await fetchJson(`${GITHUB_API_ROOT}/commits/${BENCHMARK_COMMIT_SHA}`);
        const tree = await fetchJson(`${GITHUB_API_ROOT}/git/trees/${commit.commit.tree.sha}?recursive=1`);
        const reports = tree.tree.filter((entry) => entry.type === "blob" && /^benchmarks\/reports\/[^/]+\/[^/]+\/SUMMARY\.bench\.md$/.test(entry.path)).map((entry) => entry.path).sort((a, b) => a.localeCompare(b));
        const reportPath = reports.at(-1);
        if (!reportPath) throw new Error("The selected commit contains no benchmark summary report.");
        const reportUrl = `https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${BENCHMARK_COMMIT_SHA}/${reportPath}`;
        const response = await fetch(reportUrl);
        if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${reportPath}`);
        return parseBenchmarkSummary(await response.text());
    };
    const CHART_PALETTE = {
        mean: "#005a9c",
        dark: { grid: "rgba(132, 114, 243, 0.15)", text: "#ffffff", subtext: "rgba(255, 255, 255, 0.7)" },
        light: { grid: "rgba(51, 85, 198, 0.15)", text: "#000000", subtext: "rgba(0, 0, 0, 0.7)" }
    };
    let activeCharts = [];
    const groupBenchmarksByName = () => {
        const groups = new Map();
        for (const item of benchmarkData) {
            if (!groups.has(item.name)) groups.set(item.name, { name: item.name, subsystem: item.name.split("/")[0], unit: item.unit, items: [] });
            groups.get(item.name).items.push(item);
        }
        return Array.from(groups.values());
    };
    const populateDataTable = (filterSubsystem = "all") => {
        if (!tableBody) return;
        tableBody.innerHTML = "";
        const filtered = filterSubsystem === "all" ? benchmarkData : benchmarkData.filter((item) => item.name.startsWith(`${filterSubsystem}/`));
        filtered.forEach((row) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><a class="benchmark-source-link" href="${BENCHMARK_SOURCE_ROOT}${row.name}.bench.js" target="_blank" rel="noreferrer">${row.name}</a></td>
                <td>${row.size}</td>
                <td>${row.median}</td>
                <td>${row.mean}</td>
                <td>${row.p95}</td>
                <td>${row.unit}</td>
            `;
            tableBody.appendChild(tr);
        });
    };
    const renderCharts = (theme, filterSubsystem = "all") => {
        if (!chartsContainer) return;
        activeCharts.forEach((chart) => { if (chart && typeof chart.destroy === "function") chart.destroy(); });
        activeCharts = [];
        chartsContainer.innerHTML = "";
        const themeCfg = theme === "light" ? CHART_PALETTE.light : CHART_PALETTE.dark;
        const filteredGroups = filterSubsystem === "all" ? benchmarkGroups : benchmarkGroups.filter((g) => g.subsystem === filterSubsystem);
        filteredGroups.forEach((group, index) => {
            const card = document.createElement("div");
            card.className = "chart-card reveal in-view";
            const header = document.createElement("div");
            header.className = "chart-header";
            header.innerHTML = `
                <h3 class="chart-title">${group.name}</h3>
                <span class="chart-unit-badge">${group.unit}</span>
            `;
            card.appendChild(header);
            const wrapper = document.createElement("div");
            wrapper.className = "chart-wrapper";
            if (typeof window.Chart !== "undefined") {
                const canvas = document.createElement("canvas");
                canvas.id = `chart-canvas-${index}`;
                wrapper.appendChild(canvas);
                card.appendChild(wrapper);
                chartsContainer.appendChild(card);
                try {
                    const labels = group.items.map((i) => `Size ${i.size}`);
                    const meanValues = group.items.map((i) => i.meanNum);
                    const chart = new window.Chart(canvas, {
                        type: "bar",
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: "Mean",
                                    data: meanValues,
                                    backgroundColor: CHART_PALETTE.mean,
                                    borderRadius: 4,
                                    categoryPercentage: 0.68,
                                    barPercentage: 0.52
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: "top",
                                    labels: {
                                        color: themeCfg.text,
                                        font: { family: "Montserrat", size: 11, weight: "600" },
                                        boxWidth: 12, boxHeight: 12,
                                        borderRadius: 2
                                    }
                                }
                            },
                            scales: {
                                x: { grid: { color: themeCfg.grid, drawBorder: false }, ticks: { color: themeCfg.subtext, font: { family: "Montserrat", size: 10, weight: "600" } } },
                                y: { grid: { color: themeCfg.grid, drawBorder: false }, ticks: { color: themeCfg.subtext, font: { family: "Consolas", size: 10 } } }
                            }
                        }
                    });
                    activeCharts.push(chart);
                } catch (_err) { renderSvgChart(wrapper, group, themeCfg); }
            } else { renderSvgChart(wrapper, group, themeCfg); card.appendChild(wrapper); chartsContainer.appendChild(card); }
        });
    };
    const renderSvgChart = (container, group, themeCfg) => {
        container.innerHTML = "";
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 500 240");
        svg.style.width = "100%";
        svg.style.height = "100%";
        const items = group.items;
        const maxVal = Math.max(...items.map((i) => i.meanNum)) || 1;
        const chartH = 160;
        const baseY = 200;
        const colW = (420 / items.length);
        const leg = document.createElementNS(svgNS, "g");
        leg.innerHTML = `
            <rect x="220" y="10" width="10" height="10" fill="${CHART_PALETTE.mean}" rx="2"/>
            <text x="235" y="19" fill="${themeCfg.text}" font-size="10" font-family="Montserrat" font-weight="600">Mean</text>
        `;
        svg.appendChild(leg);
        items.forEach((item, idx) => {
            const columnX = 50 + idx * colW;
            const barW = Math.min(24, colW * 0.36);
            const startX = columnX + (colW - barW) / 2;
            const hMean = (item.meanNum / maxVal) * chartH;
            const bar = document.createElementNS(svgNS, "rect");
            bar.setAttribute("x", startX);
            bar.setAttribute("y", baseY - hMean);
            bar.setAttribute("width", barW);
            bar.setAttribute("height", Math.max(2, hMean));
            bar.setAttribute("fill", CHART_PALETTE.mean);
            bar.setAttribute("rx", "3");
            const label = document.createElementNS(svgNS, "text");
            label.setAttribute("x", startX + barW / 2);
            label.setAttribute("y", baseY + 18);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("fill", themeCfg.subtext);
            label.setAttribute("font-size", "10");
            label.setAttribute("font-family", "Montserrat");
            label.setAttribute("font-weight", "600");
            label.textContent = item.size;
            svg.appendChild(bar);
            svg.appendChild(label);
        });
        container.appendChild(svg);
    };
    let currentFilter = "all";
    const applyTheme = (theme) => {
        const selectedTheme = theme === "light" ? "light" : "dark";
        body.setAttribute("data-theme", selectedTheme);
        if (themeToggleIcon) themeToggleIcon.textContent = selectedTheme === "dark" ? "light_mode" : "dark_mode";
        renderCharts(selectedTheme, currentFilter);
    };
    const savedTheme = localStorage.getItem(STORAGE_KEY) || "dark";
    body.setAttribute("data-theme", savedTheme === "light" ? "light" : "dark");
    if (themeToggleIcon) themeToggleIcon.textContent = savedTheme === "light" ? "dark_mode" : "light_mode";
    const showBenchmarkLoadError = (error) => {
        if (chartsContainer) chartsContainer.innerHTML = `<div class="benchmark-load-state">Unable to load benchmark results for <code>${BENCHMARK_COMMIT_SHA}</code>.</div>`;
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="benchmark-load-cell">${error.message}</td></tr>`;
    };
    const initializeBenchmarks = async () => {
        try {
            benchmarkData = await loadBenchmarkData();
            benchmarkGroups = groupBenchmarksByName();
            if (tableTitle) tableTitle.textContent = `Complete Benchmark Data Table (${benchmarkGroups.length} Benchmarks)`;
            populateDataTable("all");
            applyTheme(savedTheme);
        } catch (error) { showBenchmarkLoadError(error); }
    };
    initializeBenchmarks();
    if (themeToggleButton) { themeToggleButton.addEventListener("click", () => { const nextTheme = body.getAttribute("data-theme") === "dark" ? "light" : "dark"; applyTheme(nextTheme); localStorage.setItem(STORAGE_KEY, nextTheme); }); }
    catButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            catButtons.forEach((b) => b.classList.remove("cat-btn-active", "active"));
            btn.classList.add("cat-btn-active", "active");
            currentFilter = btn.getAttribute("data-subsystem") || "all";
            const theme = body.getAttribute("data-theme") || "dark";
            populateDataTable(currentFilter);
            renderCharts(theme, currentFilter);
        });
    });
    const revealNodes = document.querySelectorAll(".reveal");
    revealNodes.forEach((node) => node.classList.add("in-view"));
    const yearElem = document.getElementById("year");
    if (yearElem) yearElem.textContent = String(new Date().getFullYear());
})();
