import { computeReflectedVelocity } from "./utils.js"
import { create, divideDependencies, normDependencies } from 'mathjs'
const math = create({ divideDependencies, normDependencies })

// var computeReflectedVelocity = require("./utils.js")
// var math = require("./math.js")

function vnorm(v) {
    return math.divide(v, math.norm(v))
}

// Run the test
test('Computes reflected velocity of 45 degrees collision of equal masses', function () {
    let norm = [0, 1]
    let v1 = [1, 1]
    let v2 = [0, 0]

    var bounceVelocity = computeReflectedVelocity(norm, v1, v2, 1, 1)

    expect(bounceVelocity).toStrictEqual([1, 0])
    // Test some stuff...
});

test('Computes reflected velocity of 45 degrees collision of unequal masses', function () {
    let norm = [0, 1]
    let v1 = [1, 1]
    let v2 = [0, 0]

    var bounceVelocity = computeReflectedVelocity(norm, v1, v2, 1, 1000)

    expect(bounceVelocity[0]).toStrictEqual(1)
    expect(bounceVelocity[1]).toBeCloseTo(-1)
});

test('Computes reflected velocity of 63.43 degrees collision of equal masses', function () {
    let norm = vnorm([1, 2])
    let v1 = [1, 0]
    let v2 = [0, 0]

    var bounceVelocity = computeReflectedVelocity(norm, v1, v2, 1, 1)

    expect(bounceVelocity[0]).toBeCloseTo(0.8)
    expect(bounceVelocity[1]).toBeCloseTo(-0.4)
});
