import { sveltekit } from "@sveltejs/kit/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig({
  plugins: [
    devtoolsJson(),
    tailwindcss(),
    sveltekit(),
    Icons({
      compiler: "svelte"
    })
  ],
  server: {
    // Tauri's devUrl is pinned to http://localhost:5173, so fail loudly if that port is
    // taken instead of silently drifting to 5174+ (which leaves Tauri loading a dead URL).
    port: 5173,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] }
  }
});
