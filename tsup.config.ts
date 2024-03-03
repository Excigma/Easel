import { defineConfig } from 'tsup'

export default defineConfig({
  clean: true,
  entry: ['src/**/*.ts', 'src/**/*.js', '!src/**/*.d.ts'],
  format: ['esm'],
  tsconfig: 'tsconfig.json',
  target: 'es2020',
  esbuildOptions(options, context) {
 options.banner = {
    //https://github.com/evanw/esbuild/issues/1921
    js: `
    const require = (await import("node:module")).createRequire(import.meta.url);
    const __filename = (await import("node:url")).fileURLToPath(import.meta.url);
    const __dirname = (await import("node:path")).dirname(__filename);
    `
  }
}
})
