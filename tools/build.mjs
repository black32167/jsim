import * as esbuild from 'esbuild'
import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import sh from 'shelljs'

function copySource(sourcePath, destDir) {
    sh.cp('-R', sourcePath, destDir)
}

var target = process.env.TARGET || 'dev'
var buildDir = 'build'
var sourceRootDir = 'src'
var jsSourceDir = `${sourceRootDir}/js`

if (sh.test('-e', buildDir)) {
    sh.rm('-rf', buildDir)
}
sh.mkdir(buildDir)
sh.mkdir(`${buildDir}/js`)
copySource(`${sourceRootDir}/*.html`, buildDir)
copySource(`${sourceRootDir}/css`, buildDir)
copySource(`${sourceRootDir}/img`, buildDir)

console.log(`target=${target}`)
await esbuild.build({
    entryPoints: [
        `${jsSourceDir}/blackhole.js`,
        `${jsSourceDir}/worker.js`,
        `${jsSourceDir}/person.js`,
        `${jsSourceDir}/ao.js`,
        `${jsSourceDir}/particles/main.js`,
    ],

    bundle: true,
    minify: target === 'publish',
    outdir: `${buildDir}/js`,
    target: "es2022",
    supported: {
        bigint: true
    },
    plugins: [inlineWorkerPlugin({
        target: "es2022",
        minify: false,
    })]
})