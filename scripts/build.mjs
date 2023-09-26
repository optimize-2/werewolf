import esbuild from 'esbuild'
import { copyFileSync, readFileSync, writeFileSync } from 'fs'

const dev = process.argv[2]

let minify = true

let src = readFileSync('./backend/index.ts', 'utf8')

console.log(dev)

if (dev && dev === 'dev') {
    minify = false
    const s = src.split('\n')
    s[0] = 'const debug = true'
    src = s.join('\n')
}

writeFileSync('./backend/tmp_index.ts', src)

esbuild.buildSync({
    bundle: true,
    entryPoints: ['./backend/tmp_index.ts'],
    outdir: './dist',
    minify,
    platform: 'node',
})

copyFileSync('./backend/cfg.json', './dist/cfg.json')
copyFileSync('./backend/cfg_2.json', './dist/cfg_2.json')
copyFileSync('./backend/tokens.json', './dist/tokens.json')
