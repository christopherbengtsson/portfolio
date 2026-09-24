import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://christopherbengtsson.dev',
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
});
