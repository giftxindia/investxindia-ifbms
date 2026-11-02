import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function cleanSupabaseUrl(raw?: string): string {
  if (!raw) return '';
  const u = raw.trim().replace(/^["']+|["']+$/g, '');
  try {
    const p = new URL(u);
    return `${p.protocol}//${p.host}`;
  } catch {
    return u.replace(/\/rest\/v1\/?$/, '').replace(/\/auth\/v1\/?$/, '').replace(/\/+$/, '');
  }
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'SUPABASE_', 'NEXT_PUBLIC_'],
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(
        cleanSupabaseUrl(
          process.env.VITE_SUPABASE_URL ||
          process.env.SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL ||
          ''
        )
      ),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        (
          process.env.VITE_SUPABASE_ANON_KEY ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_ANON_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          ''
        ).trim().replace(/^["']+|["']+$/g, '')
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
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
