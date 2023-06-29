import { defineConfig } from 'tsup'

export default defineConfig({
  clean: true,
  entry: ['src/**/*.ts', 'src/**/*.js', '!src/**/*.d.ts'],
  format: ['cjs'],
  tsconfig: 'tsconfig.json',
  target: 'es2020'
})
