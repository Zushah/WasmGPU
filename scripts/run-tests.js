/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const portIndex = process.argv.indexOf("--port");
const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4173;

if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid port: ${process.argv[portIndex + 1] ?? port}`);

const MIME_TYPES = new Map([
    [".css", "text/css; charset=utf-8"],
    [".d.ts", "text/plain; charset=utf-8"],
    [".html", "text/html; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".wasm", "application/wasm"],
    [".wgsl", "text/plain; charset=utf-8"]
]);

const contentType = (path) => path.endsWith(".d.ts") ? MIME_TYPES.get(".d.ts") : MIME_TYPES.get(extname(path)) ?? "application/octet-stream";

const server = createServer((request, response) => {
    try {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        const decodedPath = decodeURIComponent(url.pathname);
        const relativePath = decodedPath === "/" ? "test/index.html" : decodedPath.replace(/^\/+/, "");
        const filePath = resolve(ROOT, relativePath);
        if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) { response.writeHead(403).end("Forbidden"); return; }
        if (!statSync(filePath).isFile()) { response.writeHead(404).end("Not Found"); return; }
        response.writeHead(200, {
            "Cache-Control": "no-store",
            "Content-Type": contentType(filePath),
            "Cross-Origin-Opener-Policy": "same-origin"
        });
        createReadStream(filePath).pipe(response);
    } catch { response.writeHead(404).end("Not Found"); }
});

server.listen(port, "127.0.0.1", () => console.log(`[test-server] http://127.0.0.1:${port}`));

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
