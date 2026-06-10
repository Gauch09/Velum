/**
 * Vercel CLI expects page_client-reference-manifest.js for every entry in
 * app-paths-manifest.json. When two pages conflict at the same URL (e.g.
 * app/page.tsx and app/(operario)/page.tsx both at "/"), Next.js only generates
 * the manifest for the winner. This script creates an empty manifest for the
 * loser so the Vercel trace step doesn't ENOENT.
 */
import { writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const path = join('.next', 'server', 'app', '(operario)', 'page_client-reference-manifest.js')

if (!existsSync(path)) {
  const empty = JSON.stringify({
    moduleLoading: { prefix: '/_next/', crossOrigin: null },
    ssrModuleMapping: {},
    edgeSSRModuleMapping: {},
    clientModules: {},
    entryCSSFiles: {},
  })
  writeFileSync(
    path,
    `globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST["/(operario)/page"]=${empty}`
  )
  console.log('[patch] Created missing manifest for /(operario)/page')
}
