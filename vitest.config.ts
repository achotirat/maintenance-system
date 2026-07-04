import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Test files share a single Postgres database and call resetDb()
    // (which truncates tables) in beforeEach. Running files in parallel
    // causes cross-file races (one file's reset wiping another's fixtures
    // mid-test). Force sequential file execution to keep the shared DB
    // state consistent.
    fileParallelism: false,
  },
})
