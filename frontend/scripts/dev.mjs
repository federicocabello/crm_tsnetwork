import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const firstPort = 5176;
const maxAttempts = 500;

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

let port = firstPort;
while (port < firstPort + maxAttempts && !(await canListen(port))) {
  port += 1;
}

if (port >= firstPort + maxAttempts) {
  console.error(`No se encontró un puerto disponible entre ${firstPort} y ${port - 1}.`);
  process.exit(1);
}

if (port !== firstPort) {
  console.log(`Puerto ${firstPort} no disponible. Usando ${port}.`);
}

const vitePath = fileURLToPath(
  new URL("../node_modules/vite/bin/vite.js", import.meta.url),
);
const vite = spawn(
  process.execPath,
  [vitePath, "--host", host, "--port", String(port), "--strictPort"],
  { stdio: "inherit" },
);

vite.once("exit", (code) => process.exit(code ?? 1));