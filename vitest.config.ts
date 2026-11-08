import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(dirname, 'src') },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Os testes de integração usam o mesmo banco descartável: um arquivo por vez
    fileParallelism: false,
  },
})
