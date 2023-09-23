import esbuild from 'esbuild'
import { copyFileSync } from 'fs'

const dev = process.argv[1]

let minify = true

if (dev && dev === 'dev') {
    minify = false
}

esbuild.buildSync({
    bundle: true,
    entryPoints: ['./backend/index.ts'],
    outdir: './dist',
    minify,
    platform: 'node',
})

copyFileSync('./backend/cfg.json', './dist/cfg.json')
copyFileSync('./backend/cfg_2.json', './dist/cfg_2.json')
