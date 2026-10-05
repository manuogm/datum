import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Served from https://manuogm.github.io/datum/ on GitHub Pages.
export default defineConfig({
  base: '/datum/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
