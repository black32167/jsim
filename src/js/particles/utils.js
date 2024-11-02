import { create, multiplyDependencies, divideDependencies, addDependencies, normDependencies, dotDependencies } from 'mathjs'

const math = create({ multiplyDependencies, divideDependencies, addDependencies, normDependencies, dotDependencies })

function proj(v1, v2) {
    return math.multiply(v2, math.dot(v1, v2))
}

export function computeReflectedVelocity(norm, v1, v2, m1, m2) {
    let mSum = m1 + m2
    let v1Proj = proj(v1, norm)
    let v2Proj = proj(v2, norm)
    let u1Proj = math.add(math.multiply(v1Proj, (m1 - m2) / mSum), math.multiply(v2Proj, 2 * m2 / mSum))
    let u1 = math.add(math.add(v1, math.multiply(v1Proj, -1)), u1Proj)
    return u1
}

function computeFuturePos(agentDesc) {
    return math.add([agentDesc.x, agentDesc.y], [agentDesc.vx, agentDesc.vy])
}

export function detectCollisions(leftAgentDescriptors, rightAgentDescriptors, logEnabled) {

    const impulseByAgentId = {}

    const agentsToProcess = leftAgentDescriptors.map(d => d)
    const processedAgentIds = []

    while (agentsToProcess.length > 0) {
        let agentA = agentsToProcess.pop()
        let centerA = [agentA.x, agentA.y]

        processedAgentIds.push(agentA.id)
        for (const agentB of rightAgentDescriptors) {
            let centerB = [agentB.x, agentB.y]
            if (processedAgentIds.includes(agentB.id)) {
                continue
            }

            let distNow = computeDist(centerA, centerB)
            let touchDistance = agentA.radius + agentB.radius
            let contactDistance = touchDistance + 3
            let vr = math.dot(
                math.add(centerB, math.multiply(centerA, -1)),
                math.add([agentB.vx, agentB.vy], math.multiply([agentA.vx, agentA.vy], -1)))

            if ((distNow <= contactDistance) && vr < 0) {
                //if (logEnabled) {
                //console.log(`detected collisions between:${agentA.id} and ${agentB.id} at distance ${distNow}->${distFuture}, td=${touchDistance}, vr=${vr}`)
                //}

                if (!(agentA.id in impulseByAgentId)) {
                    impulseByAgentId[agentA.id] = {
                        impulse: [agentA.vx, agentA.vy]
                    }
                }
                if (!(agentB.id in impulseByAgentId)) {
                    impulseByAgentId[agentB.id] = {
                        impulse: [agentB.vx, agentB.vy]
                    }
                }

                let ab = math.add(centerB, math.multiply(centerA, -1))
                let normA = math.divide(ab, distNow)
                let v1 = impulseByAgentId[agentA.id].impulse
                let v2 = impulseByAgentId[agentB.id].impulse
                let m1 = agentA.mass
                let m2 = agentB.mass

                let vReflected1 = computeReflectedVelocity(normA, v1, v2, m1, m2)
                impulseByAgentId[agentA.id].impulse = vReflected1

                let vReflected2 = computeReflectedVelocity(normA, v2, v1, m2, m1)
                impulseByAgentId[agentB.id].impulse = vReflected2
            }
        }
    }

    return impulseByAgentId
}

export function computeDist(vA, vB) {
    let ab = math.add(vB, math.multiply(vA, -1))
    return math.norm(ab)
}
