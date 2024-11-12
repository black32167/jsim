import { Thing, Comet } from "./agent.js"
import CollisionWorker from './worker/collisionWorker.worker.js';
import { PageLayoutManager } from '../page-layout.js'
import p5 from 'p5'
import RBush from 'rbush';
import $ from 'jquery'

const canvasWidth = 500
const canvasHeight = 600
const maxHorizontalRegions = 4
const maxVerticalRegions = 4
const maxRadius = 10.0
const regionWidth = Math.floor(canvasWidth / maxHorizontalRegions)
const regionHeight = Math.floor(canvasHeight / maxVerticalRegions)
const showRegions = false
const progressWorkersCount = 8
var isSuspended = true
var inProgress = false

$(function () {
    var parent = $('#simulation')
    var pageLayout = new PageLayoutManager(parent)
    window.mainHtmlCanvas = pageLayout.getMainCanvas()[0]
    pageLayout.setLeftPanelWidth(`${canvasWidth + 10}px`)
    pageLayout.setStartStopListener((started) => {
        console.log(`started=${started}`)
        isSuspended = !started
    })
    //pageLayout.setModelDescription(``)

    var p5engine = new p5(p5setup)
})

let p5setup = (_p5ctx) => {
    window.p5ctx = _p5ctx

    let agents = [
        //new Thing(25), 
        /**
        new Comet({
            radius: 20.0,
            mass: 100,
            x: 380,
            y: 30,
            vx: 1.0,
            vy: 0
        }),

        new Comet({
            radius: 10.0,
            mass: 1,
            x: 430,
            y: 30,
            vx: 0.0,
            vy: 0.0
        }),
        /**
        new Comet({
            radius: 10.0,
            mass: 100,
            x: 310,
            y: 318,
            vx: 20.0,
            vy: 0.0
        }),

        /**/
        /**/
        new Comet({
            radius: maxRadius,
            mass: 100,
            x: 300,
            y: 300,
            vx: 0.0,
            vy: 0.0,
            color: 'red',
            //tickListener: function () { console.log(`Coords of agent ${this.id}:[${this.x},${this.y}]`); }
        })
        /**/
    ]

    /**/
    let col = 0
    let row = 0
    const maxCols = 30
    const maxRows = 15
    for (var i = 0; i < maxCols * maxRows; i++) {
        agents.push(new Comet({
            radius: 3, //1 + Math.random() * 5.0,
            mass: 5,//Math.random() * 3.0,
            x: i % maxCols * 15 + 50, //Math.random() * 300.0,
            y: i / maxCols * 15 + 10, //Math.random() * 300.0,
            vx: 2,// + Math.random() * 3.0,
            vy: 2,// + Math.random() * 3.0
        }))
    }
    /**/

    p5ctx.setup = () => {
        var canvas = p5ctx.createCanvas(canvasWidth, canvasHeight, mainHtmlCanvas);

        p5ctx.frameRate(10)
        if (window.Worker) {
            console.log("Worker supported!")
            window.progressWorkers = []
            for (let i = 0; i < progressWorkersCount; i++) {
                let worker = new CollisionWorker();
                worker.onerror = (error) => {
                    console.log(`Region worker error: ${error.message}`);
                    throw error;
                };
                worker.onmessageerror = (e) => {
                    console.log(`Region worker error1: ${e}`);
                }
                window.progressWorkers.push(worker);
            }
        }
    }

    p5ctx.keyPressed = () => {
        console.log("pressed " + p5ctx.key)
        switch (p5ctx.key) {
            case 'n':
            case 'N':
                if (isSuspended) {
                    progressAgents()
                }
                break
        }
    }


    p5ctx.draw = () => {
        p5ctx.background(255);
        if (showRegions) {
            for (let x = regionWidth; x < canvasWidth; x += regionWidth) {
                p5ctx.line(x, 0, x, canvasHeight)
            }
            for (let y = regionHeight; y < canvasHeight; y += regionHeight) {
                p5ctx.line(0, y, canvasWidth, y)
            }
        }

        for (const agent of agents) {
            agent.draw(p5ctx)
        }

        progressAgentsAndNext()
    }

    const Vec = p5.Vector
    var tick = 0
    function progressAgentsAndNext() {
        // console.log(`InProgress=${inProgress}`)

        if (!isSuspended) {
            if (!inProgress) {
                inProgress = true
                progressAgents()
            } else {
                console.log(`Tick #${tick} is in progress, skipping`)
            }
        }

    }

    async function progressAgents() {
        let start = Date.now()
        // console.log(`Tick ${tick} started`)

        let agentDescriptors = agents //
            .map(agent => agent.describe())

        // Create spatial buckets
        let regionBuckets = createSpatialBuckets(agentDescriptors)

        // Form worker tasks
        let workerTasks = distibuteWork(regionBuckets)

        // Schedule parallel execution
        let impulseChunks = await runInParallel(workerTasks)

        let collisionEventsByAgent = {}

        impulseChunks
            .forEach(impulsesById => {
                for (let id in impulsesById) {
                    let impulses = impulsesById[id]
                    collisionEventsByAgent[id] = impulses
                }
            })


        for (const agent of agents) {
            let impulses = collisionEventsByAgent[agent.id]
            agent.tick(p5ctx, impulses)
        }

        tick++
        // let elapsedTime = Date.now() - start

        // if (elapsedTime > 10) {
        //     console.log(`Tick ${tick} finished in ${elapsedTime} ms.`)
        // }

        inProgress = false;
    }

    async function runInParallel(workerTasks) {
        let impulseChunks = []
        let promises = []

        if (progressWorkers.length < workerTasks.length) {
            throw `Insufficient region workers (${workerTasks.length} required)`
        }

        for (let i = 0; i < workerTasks.length; i++) {
            let workerTask = workerTasks[i]
            let progressWorker = progressWorkers[i]

            // console.log(`scheduling pair chunk ${startPairIdxIncl}..${endPairIdxExcl} for worker #${i}`)
            progressWorker.postMessage(workerTask)

            promises.push(new Promise(function (resolve, reject) {
                progressWorker.onmessage = (e) => {
                    resolve(e.data)
                }
            }))
        }

        // console.log(`Waiting for ${promises.length} promises`)
        impulseChunks.push(...(await Promise.all(promises)))


        return impulseChunks
    }

    function distibuteWork(regionBuckets) {
        let sameRegionWorkerTasks = []
        for (let i = 0; i < regionBuckets.length; i++) {
            let regionBucket = regionBuckets[i]

            sameRegionWorkerTasks.push({
                workerId: i,
                agentCliques: regionBucket.agentCliques,
                canvasWidth: canvasWidth,
                canvasHeight: canvasHeight
            })
        }
        return sameRegionWorkerTasks
    }

    function createSpatialBuckets(agentDescriptors) {

        // Create tasks per worker
        let regionBuckets = []
        for (let i = 0; i < progressWorkersCount; i++) {
            regionBuckets[i] = {
                agentCliques: []
            }
        }

        // Build R-tree
        let rTree = new RBush();
        for (let desc of agentDescriptors) {
            rTree.insert({
                minX: desc.x - desc.radius,
                minY: desc.y - desc.radius,
                maxX: desc.x + desc.radius,
                maxY: desc.y + desc.radius,
                agentDesc: desc
            })
        }

        // Distribute agents over worker tasks
        let taskIdx = 0
        let processedAgents = {}
        let searchRadius = maxRadius + 5
        for (let desc of agentDescriptors) {
            processedAgents[desc.id] = true

            var closeAgents = rTree.search({
                minX: desc.x - searchRadius,
                minY: desc.y - searchRadius,
                maxX: desc.x + searchRadius,
                maxY: desc.y + searchRadius
            })
                .map(e => e.agentDesc)
                .filter(agentDesc => processedAgents[agentDesc.id] !== true)

            //if (closeAgents.length > 0) {
            let bucktIdx = taskIdx++ % progressWorkersCount
            // console.log(`bucket: ${bucktIdx}, agent:${desc.id}, closeAgents:${closeAgents.map(a => a.id)}`)
            let bucket = regionBuckets[bucktIdx]
            let agentClique = {
                mainAgent: desc,
                satelliteAgents: []
            }
            for (let closeAgent of closeAgents) {
                try {
                    agentClique.satelliteAgents.push(closeAgent)
                } catch (e) {
                    console.log(`Bucket is kicked:${taskIdx}, coords = (${desc.x}, ${desc.y})`)
                    throw e
                }
            }
            bucket.agentCliques.push(agentClique)
            //}
        }
        return regionBuckets
    }
}



