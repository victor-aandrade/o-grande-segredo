
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        guardia: resolve(process.cwd(), "guardia.html"),
        jogador: resolve(process.cwd(), "jogador.html"),
        jogo: resolve(process.cwd(), "jogo.html"),
        privacidade: resolve(process.cwd(), "privacidade.html"),
        comoFunciona: resolve(process.cwd(), "como-funciona.html"),
      },
    },
  },
});
