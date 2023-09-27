import esbuild from 'esbuild'
import { copyFileSync, readFileSync, writeFileSync } from 'fs'

const dev = process.argv[2]

let minify = true

let src = readFileSync('./backend/index.ts', 'utf8')

console.log(dev)

if (dev && dev === 'dev') {
    minify = false
    const s = src.split('\n')
    s[0] = 'const debug = false'
    src = s.join('\n')
} else {
    const s = src.split('\n')
    s[0] = 'const debug = false'
    src = s.join('\n')
}

writeFileSync('./backend/index.ts', src)

esbuild.buildSync({
    bundle: true,
    entryPoints: ['./backend/index.ts'],
    outfile: './dist/index.js',
    minify,
    platform: 'node',
})

copyFileSync('./backend/cfg.json', './dist/cfg.json')
copyFileSync('./backend/cfg_2.json', './dist/cfg_2.json')
copyFileSync('./backend/tokens.json', './dist/tokens.json')
