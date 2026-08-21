/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { chromium } from "@playwright/test";
import { accessSync, constants, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { release } from "node:os";
import { basename, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const WINDOWS_POWERSHELL = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";

const CDP_RELAY = (listenAddress, listenPort, targetPort) => String.raw`
$source = @"
using System;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
public static class WasmGPUCDPRelay {
    public static void Run(string listenAddress, int listenPort, int targetPort) {
        TcpListener listener = new TcpListener(IPAddress.Parse(listenAddress), listenPort);
        listener.Start();
        while (true) {
            TcpClient client = listener.AcceptTcpClient();
            Thread worker = new Thread(() => Relay(client, targetPort));
            worker.IsBackground = true;
            worker.Start();
        }
    }
    private static void Relay(TcpClient client, int targetPort) {
        using (client)
        using (TcpClient target = new TcpClient()) {
            try {
                target.Connect(IPAddress.Loopback, targetPort);
                Task upstream = client.GetStream().CopyToAsync(target.GetStream());
                Task downstream = target.GetStream().CopyToAsync(client.GetStream());
                Task.WaitAny(upstream, downstream);
            } catch (SocketException) { } catch (ObjectDisposedException) { } catch (AggregateException) { }
        }
    }
}
"@
Add-Type -TypeDefinition $source
[WasmGPUCDPRelay]::Run("${listenAddress}", ${listenPort}, ${targetPort})
`;

export const isWSL = () => process.platform === "linux" && (!!process.env.WSL_DISTRO_NAME || /microsoft/i.test(release()));

const windowsToWslPath = (path) => {
    const match = /^([a-z]):[\\/](.*)$/i.exec(path);
    return match ? `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll("\\", "/")}` : path;
};

const wslToWindowsPath = (path) => {
    const match = /^\/mnt\/([a-z])\/(.*)$/i.exec(path);
    if (match) return `${match[1].toUpperCase()}:\\${match[2].replaceAll("/", "\\")}`;
    if (path.startsWith("/") && process.env.WSL_DISTRO_NAME) return `\\\\wsl.localhost\\${process.env.WSL_DISTRO_NAME}${path.replaceAll("/", "\\")}`;
    return path;
};

const windowsUserDirectories = () => {
    try {
        return readdirSync("/mnt/c/Users", { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => `/mnt/c/Users/${entry.name}`);
    } catch { return []; }
};

const browserCandidates = () => {
    const candidates = [
        "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
        "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        "/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe",
        "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    ];
    for (const user of windowsUserDirectories()) candidates.push(
        join(user, "AppData/Local/Google/Chrome/Application/chrome.exe"),
        join(user, "AppData/Local/Microsoft/Edge/Application/msedge.exe")
    );
    return candidates;
};

const resolveWindowsBrowser = (override) => {
    const requested = override ?? process.env.WASMGPU_WINDOWS_BROWSER;
    if (requested) {
        const path = windowsToWslPath(requested);
        if (!existsSync(path)) throw new Error(`Windows browser executable does not exist: ${requested}`);
        return path;
    }
    const detected = browserCandidates().find(existsSync);
    if (!detected) throw new Error("Could not find Windows Chrome or Edge. Pass --windows-browser=<path> or set WASMGPU_WINDOWS_BROWSER.");
    return detected;
};

const resolveWindowsTemp = () => {
    const requested = process.env.WASMGPU_WINDOWS_TEMP;
    if (requested) {
        const path = windowsToWslPath(requested);
        if (!existsSync(path)) throw new Error(`Windows temp directory does not exist: ${requested}`);
        return path;
    }
    const detected = windowsUserDirectories().map((user) => join(user, "AppData/Local/Temp")).find((path) => {
        try { accessSync(path, constants.W_OK); return true; }
        catch { return false; }
    });
    if (!detected) throw new Error("Could not locate a writable Windows temp directory. Set WASMGPU_WINDOWS_TEMP.");
    return detected;
};

const isPrivateIPv4 = (address) => {
    const parts = address.split(".").map(Number);
    return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) && (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168));
};

const resolveWindowsWSLAddress = () => {
    const addressQuery = "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like '*WSL*' -and $_.AddressState -eq 'Preferred' } | ForEach-Object { $_.IPAddress }";
    const result = spawnSync(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", addressQuery], { encoding: "utf8", windowsHide: true });
    const address = result.stdout?.split(/\s+/).find(isPrivateIPv4);
    if (!address) throw new Error("Could not identify a private IPv4 address for the Windows WSL interface. Refusing to expose the CDP relay on a broader interface.");
    return address;
};

const waitForCDP = async (host, port, browserChild, relayChild) => {
    let lastError = null;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        if (browserChild.benchmarkSpawnError) throw browserChild.benchmarkSpawnError;
        if (relayChild.benchmarkSpawnError) throw relayChild.benchmarkSpawnError;
        if (browserChild.exitCode !== null && browserChild.exitCode !== 0) throw new Error(`Windows browser launcher exited before CDP became available (exit ${browserChild.exitCode}).`);
        if (relayChild.exitCode !== null) throw new Error(`Windows CDP relay exited before CDP became available (exit ${relayChild.exitCode}).`);
        try { return await chromium.connectOverCDP(`http://${host}:${port}`, { timeout: 1_000 }); }
        catch (error) { lastError = error; }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Timed out connecting to the Windows browser over CDP on port ${port}: ${lastError?.message ?? "unknown error"}`);
};

const stopChild = async (child) => {
    if (child.exitCode !== null) return;
    child.kill("SIGTERM");
    await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        new Promise((resolve) => setTimeout(resolve, 3_000))
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
};

const waitForChild = (child) => new Promise((resolve) => {
    child.once("exit", (code) => resolve(code));
    child.once("error", () => resolve(-1));
});

const stopWindowsBrowser = async (profile) => {
    const windowsProfile = wslToWindowsPath(profile).replaceAll("'", "''");
    const script = `$profile = '${windowsProfile}'; Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'chrome.exe' -or $_.Name -eq 'msedge.exe') -and $_.CommandLine -like ('*' + $profile + '*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    const child = spawn(WINDOWS_POWERSHELL, ["-NoProfile", "-NonInteractive", "-Command", script], { stdio: "ignore", windowsHide: true });
    await Promise.race([waitForChild(child), new Promise((resolve) => setTimeout(resolve, 10_000))]);
};

const removeProfile = async (profile) => {
    for (let attempt = 0; attempt < 10; attempt++) {
        try { rmSync(profile, { recursive: true, force: true }); return; }
        catch { await new Promise((resolve) => setTimeout(resolve, 200)); }
    }
    throw new Error(`Failed to remove temporary Windows browser profile: ${profile}`);
};

const launchWindowsBrowser = async (override) => {
    const executable = resolveWindowsBrowser(override);
    const relayAddress = resolveWindowsWSLAddress();
    const profile = mkdtempSync(join(resolveWindowsTemp(), "wasmgpu-bench-"));
    const port = 9223 + Math.floor(Math.random() * 500);
    const relayPort = 10223 + Math.floor(Math.random() * 500);
    const launchArgs = [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${wslToWindowsPath(profile)}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--enable-unsafe-webgpu",
        "--enable-features=WebGPU",
        "--window-size=800,600",
        "about:blank"
    ];
    const child = spawn(executable, launchArgs, { stdio: "ignore", windowsHide: false });
    child.benchmarkSpawnError = null;
    child.on("error", (error) => { child.benchmarkSpawnError = error; });
    const relay = spawn(WINDOWS_POWERSHELL, [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        CDP_RELAY(relayAddress, relayPort, port)
    ], { stdio: "ignore", windowsHide: true });
    relay.benchmarkSpawnError = null;
    relay.on("error", (error) => { relay.benchmarkSpawnError = error; });
    let browser;
    try { browser = await waitForCDP(relayAddress, relayPort, child, relay); }
    catch (error) {
        await stopChild(relay);
        await stopWindowsBrowser(profile);
        await stopChild(child);
        try { await removeProfile(profile); }
        catch (cleanupError) { throw new AggregateError([error, cleanupError], "Windows browser launch failed and its temporary profile could not be removed."); }
        throw error;
    }
    return {
        browser,
        connection: "cdp",
        metadata: { name: basename(executable).toLowerCase().startsWith("msedge") ? "edge" : "chrome", connection: "cdp", hostPlatform: "windows" },
        async close() { await browser.close().catch(() => {}); await stopChild(relay); await stopWindowsBrowser(profile); await stopChild(child); await removeProfile(profile); }
    };
};

const launchLocalBrowser = async () => {
    const launchArgs = ["--enable-unsafe-webgpu", "--use-gpu-in-tests", "--enable-accelerated-2d-canvas"];
    if (process.platform === "linux") launchArgs.push("--enable-features=Vulkan", "--use-angle=vulkan");
    const browser = await chromium.launch({ channel: "chromium", headless: true, args: launchArgs });
    return {
        browser,
        connection: "launch",
        metadata: { name: "chromium", connection: "launch", hostPlatform: process.platform },
        async close() { await browser.close(); }
    };
};

export const launchBenchmarkBrowser = async ({ linuxBrowser = false, windowsBrowser } = {}) => {
    if (isWSL() && !linuxBrowser) return launchWindowsBrowser(windowsBrowser);
    if (windowsBrowser) throw new Error("--windows-browser is only supported when running the benchmark controller under WSL.");
    return launchLocalBrowser();
};

export const createBenchmarkPage = async (session) => {
    if (session.connection === "cdp") {
        const context = session.browser.contexts()[0];
        if (!context) throw new Error("Windows browser CDP connection did not expose its default context.");
        return context.newPage();
    }
    return session.browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
};

export const controllerMetadata = () => ({ platform: process.platform, environment: isWSL() ? "wsl" : "native", distro: process.env.WSL_DISTRO_NAME ?? null, kernel: release() });
