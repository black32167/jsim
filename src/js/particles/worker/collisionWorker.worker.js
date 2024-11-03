import { im } from 'mathjs';
import { detectCollisions } from '../utils.js';


onmessage = (e) => {
    var data = e.data

    let mainAgents = []
    let allImpulses = {}
    for (let agentClique of data.agentCliques) {
        mainAgents.push(agentClique.mainAgent)

        let impulsesAfterCollisionOutsideRegion = detectCollisions(
            [agentClique.mainAgent], agentClique.satelliteAgents, false)

        let cliqueAgents = [agentClique.mainAgent, ...agentClique.satelliteAgents]

        let impulsesAfterCollision = {}
        for (const desc of cliqueAgents) {
            let outerRegionImpulse = impulsesAfterCollisionOutsideRegion[desc.id]

            if (outerRegionImpulse !== undefined) {
                impulsesAfterCollision[desc.id] = outerRegionImpulse
            }
        }

        detectWallsCollisions(
            [agentClique.mainAgent],
            impulsesAfterCollision,
            data.canvasWidth,
            data.canvasHeight
        )

        for (const desc of cliqueAgents) {
            if (impulsesAfterCollision[desc.id] !== undefined) {
                allImpulses[desc.id] = impulsesAfterCollision[desc.id]
            }
        }
    }

    postMessage(allImpulses)
};


function detectWallsCollisions(agentDescriptors, descCollisionImpulses, canvasWidth, canvasHeight) {
    for (const desc of agentDescriptors) {
        let impulse = undefined
        if (desc.x + desc.radius >= canvasWidth && desc.vx > 0) {
            impulse = [-desc.vx, desc.vy]
        }
        if (desc.y + desc.radius >= canvasHeight && desc.vy > 0) {
            impulse = [desc.vx, -desc.vy]
        }
        if (desc.x - desc.radius <= 0 && desc.vx < 0) {
            impulse = [-desc.vx, desc.vy]
        }
        if (desc.y - desc.radius <= 0 && desc.vy < 0) {
            impulse = [desc.vx, -desc.vy]
        }
        if (impulse !== undefined) {
            if (descCollisionImpulses[desc.id] === undefined) {
                descCollisionImpulses[desc.id] = {
                    impulse: [0, 0]
                }
            }
            descCollisionImpulses[desc.id].impulse[0] += impulse[0]
            descCollisionImpulses[desc.id].impulse[1] += impulse[1]
        }
    }
}
