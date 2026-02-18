import { defineConfig } from 'vite';

const basePath = process.env.VITE_BASE_PATH?.trim();
const normalizedBase = basePath
  ? `/${basePath.replace(/^\/+|\/+$/g, '')}/`
  : '/';

export default defineConfig({
  base: normalizedBase,
});
