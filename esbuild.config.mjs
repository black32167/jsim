import * as esbuild from 'esbuild'
import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import sh from 'shelljs'

function copySource(sourcePath, destDir) {
    sh.cp('-R', sourcePath, destDir)
}
var buildDir = 'build'
var sourceRootDir = 'src'
var cssDir = `${sourceRootDir}/css`
var jsSourceDir = `${sourceRootDir}/js`

if (sh.test('-e', buildDir)) {
    sh.rm('-rf', buildDir)
}
sh.mkdir(buildDir)
sh.mkdir(`${buildDir}/js`)
copySource(`${sourceRootDir}/*.html`, buildDir)
copySource(`${sourceRootDir}/css`, buildDir)
copySource(`${sourceRootDir}/img`, buildDir)
copySource(`${sourceRootDir}/js/thirdparty`, `${buildDir}/js`)

sh.cp('./css/*.css', cssDir)

await esbuild.build({
    entryPoints: [
        `${jsSourceDir}/blackhole.js`,
        `${jsSourceDir}/worker.js`,
        `${jsSourceDir}/person.js`,
        `${jsSourceDir}/ao.js`,
        // `${jsSourceDir}/engine.js`
    ],
    // splitting: true,
    // format: 'esm',
    bundle: true,
    minify: false,
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