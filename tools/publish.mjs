import sh from 'shelljs'

var buildDir = 'build'
var publishDir = 'dist'

if (sh.test('-e', publishDir)) {
    sh.rm('-rf', publishDir)
}

sh.cp('-R', buildDir, publishDir)