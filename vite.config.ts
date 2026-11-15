import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@config': path.resolve(__dirname, 'src/config'),
        '@contrats': path.resolve(__dirname, 'src/contrats'),
        '@domaine': path.resolve(__dirname, 'src/domaine'),
        '@ports': path.resolve(__dirname, 'src/ports'),
        '@application': path.resolve(__dirname, 'src/application'),
        '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
        '@interface': path.resolve(__dirname, 'src/interface'),
        '@web': path.resolve(__dirname, 'src/web'),
      },
    },
    build: {
      // Deux entrees : le prototype (index.html) et le nouveau parcours (signaler.html).
      // La bascule finale consistera a supprimer l'ancienne, pas a reecrire celle-ci.
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          signaler: path.resolve(__dirname, 'signaler.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
