import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import wasm from "vite-plugin-wasm"
import { defineConfig, type Plugin } from "vite"

const host = process.env.TAURI_DEV_HOST
const wasmEntry = path.resolve(__dirname, "src/wasm-pkg/social_wrapped_wasm.js")
const wasmStub = path.resolve(__dirname, "src/platform/wasm-dev-stub.ts")
const mockDirs = [
  path.resolve(__dirname, "crates/core/mock"),
  path.resolve(__dirname, "crates/core/src/mock"),
]

/** Use the real wasm-pkg output when present; otherwise a stub so Tauri dev can start. */
function wasmOptional(): Plugin {
  return {
    name: "wasm-optional",
    resolveId(source) {
      if (!source.includes("social_wrapped_wasm")) {
        return null
      }
      return fs.existsSync(wasmEntry) ? wasmEntry : wasmStub
    },
  }
}

/** Build dev WASM once when missing so browser localhost has greet + mock support. */
function ensureWasmBuilt(): Plugin {
  return {
    name: "ensure-wasm-built",
    buildStart() {
      if (fs.existsSync(wasmEntry)) {
        return
      }

      console.log("[wasm] Dev package missing — building (first run only)...")
      try {
        execSync("bun run build:wasm:dev", { stdio: "inherit" })
      } catch {
        console.warn(
          "[wasm] Dev build failed. Browser greet/mock need: bun run build:wasm:dev",
        )
      }
    },
  }
}

/** Serve Telegram mock fixtures to the browser at /mock/… */
function mockFixtures(): Plugin {
  return {
    name: "mock-fixtures",
    configureServer(server) {
      server.middlewares.use("/mock", (req, res, next) => {
        const relativePath = (req.url ?? "/").replace(/^\//, "")
        if (!relativePath || relativePath.includes("..")) {
          next()
          return
        }

        for (const mockDir of mockDirs) {
          const filePath = path.join(mockDir, relativePath)
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader("Content-Type", "application/json")
            fs.createReadStream(filePath).pipe(res)
            return
          }
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    ensureWasmBuilt(),
    wasmOptional(),
    mockFixtures(),
    react(),
    tailwindcss(),
    wasm(),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    fs: {
      allow: ["..", ...mockDirs],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Native top-level await — no vite-plugin-top-level-await / esbuild needed
    target: "esnext",
  },
}))
