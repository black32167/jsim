import { AgentBehavior, AgentShape, AggregatedStateBehavior } from './agent.js'
import { Model } from './models.js'
import { Engine } from './engine.js'
import { PageLayoutManager } from './page-layout'
import $ from 'jquery'
import 'jcanvas'
import { PresetControl } from './input-control/preset-control.js'

class WorkerLayout {
	constructor() {
		this.workers = []
		this.topics = []
	}
	addWorker(e) {
		this.workers.push(e)
	}
	addTopic(e) {
		this.topics.push(e)
	}
	arrange(c) {
		let topicsY = 50
		let workersY = c.height() - 50

		// Arrange topics
		let topicsNum = this.topics.length
		this.topics.forEach((a, i) => {
			let step = (c.width() - 10) / topicsNum
			a.setPos(step * (i + 0.5) + 5,
				topicsY)
		})

		// Arrange workers
		let workersNum = this.workers.length
		this.workers.forEach((a, i) => {
			let step = (c.width() - 10) / workersNum
			a.setPos(step * (i + 0.5) + 5,
				workersY)
		})
	}
	draw(c) {
		this.topics.forEach(a => {
			a.getAgentShape().draw(c);
		})
		this.workers.forEach(w => {
			w.getAgentShape().draw(c);
			let contributedTopics = w.getContributedTopics()
			contributedTopics.forEach(t => {
				let topicShape = t.getAgentShape()
				let workerShape = w.getAgentShape()
				let linkStart = workerShape.getEdgePointToNormal(topicShape.x, topicShape.y)
				let linkEnd = topicShape.getEdgePointToNormal(workerShape.x, workerShape.y)
				c.drawLine({
					strokeStyle: '#000',
					strokeWidth: 1,
					x1: linkStart.x, y1: linkStart.y,
					x2: linkEnd.x, y2: linkEnd.y
				})
			})
		})
	}
}

class WorkerBehavior extends AgentBehavior {
	constructor(idx, totalWorkers, topics) {
		super()
		this.idx = idx
		this.totalWorkers = totalWorkers
		this.maxCompulsoryTopics = 1
		this.maxOptionalTopics = 0
		this.retentionTicks = 20 // How many ticks worker is assigned to the particular project
		this.currentRetentionTicks = 0
		this.prificiencyDecayRate = 0.95
		this.proficiencyDevelopingRate = 1.2
		this.synchronousSwitchover = true
		this.fatigueSimulation = false
		this.seekMandatoryExperience = false

		this.topics = topics.map(t => {
			return {
				topic: t,
				interest: 0.5,
				proficiency: 0.1,
				contributing: false,
				fatigue: 0,
				ticks: 0,
				lastContributedTick: 0,
				lastChangedTick: 0,

				assign: function () {
					if (this.contributing) {
						throw "Already contributing!"
					}
					this.contributing = true
					this.topic.workers++
				},
				abjure: function () {
					if (this.contributing) {
						this.contributing = false
						this.topic.workers--
					}
				}
			}
		})
		this.w = new AgentShape()
		this.w.r = 8
		this.motivation = 0.5
		this.shouldChangePriority = false
		this.workForce = 1
	}
	updateOpts(opts) {
		$.extend(this, opts)
	}
	updateTopicsOpts(updateFunc) {
		this.topics.forEach(updateFunc)
	}

	describe() {
		let meta = []
		this.topics.forEach((t, i) => {
			meta.push(["Topic #" + i + " interest", Math.round10(t.interest)])
		})
		return meta
	}
	stateHeaders() {
		let headers = ["Overall Motivation"]
		for (let i = 0; i < this.topics.length; i++) {
			headers.push("Skill in topic #" + i)
		}
		return headers
	}
	getValueLimits() {
		return Array(this.stateHeaders().length).fill({ max: 1.0 })
	}
	state() {
		let stateValues = [this.motivation]
		this.topics.forEach(t => stateValues.push(Math.round10(t.proficiency)))
		return stateValues
	}
	cleanState() {
		this.motivation = 0.5
	}
	getAgentShape() { return this.w }

	getContributedTopics() {
		return this.topics.filter(t => t.contributing).map(t => t.topic);
	}

	preAction(tIdx) {//Disengage
		//this.priority = 0
		this.currentTick = tIdx

		// Abjure all the topics
		let contibutingTopics = this.topics.forEach(t => t.abjure())

		//console.log("Stop contributing :" + this.idx)
		this.currentRetentionTicks++
		if (this.currentRetentionTicks > this.retentionTicks) {
			this.currentRetentionTicks = 0
			if (this.synchronousSwitchover) {
				this.shouldChangePriority = true
			} else {
				// One-by-one switchover
				if (Math.floor(tIdx / this.retentionTicks) % this.totalWorkers == this.idx) {
					this.shouldChangePriority = true
					console.log("shouldChangePriority = " + this.shouldChangePriority + ", idx = " + this.idx)
				}
			}
		}
	}

	action(tIdx) {//Engage


		// Contribute to at least one topic which requires workforce
		this.assign(this.maxCompulsoryTopics, (t1, t2) => this.compareByRequiredWorkers(t1, t2))

		// Contribute to all other interesting topics
		this.assign(this.maxOptionalTopics, (t1, t2) => -this.compareByInterestAsc(t1, t2))


		// Update proficiency/fatigue in all contributing topics
		let currentContibutingTopicDescriptors = this.topics.filter(t => t.contributing)
		let maxInterest = currentContibutingTopicDescriptors.map(t => t.interest).reduce((a, b) => Math.max(a, b))
		this.topics.forEach(t => {
			t.proficiency = this.sigmoid(t.interest * t.ticks / 3 - 3.5)  // Proficiency depends on interest
			// if (this.id === 27 && t.topic.id === 21) {
			// 	console.log(`t=${t.topic.id},p=${t.proficiency},i=${t.interest}, tc=${t.ticks}, tick ${tIdx}`)
			// }

			if (this.fatigueSimulation) {
				t.fatigue = this.sigmoid(t.ticks / 3 - 1.5) * (1 - (t.interest + maxInterest) / 2) // Fatigue depends on interest
			}
		})

		// Update topics being contributed
		this.motivation = 0

		currentContibutingTopicDescriptors.forEach((t, i) => {
			if (this.shouldChangePriority) {
				// console.log("Topic #" + i + " has changed, priority = " + this.priority + ", tick=" + this.currentTick + ", lastCT = " + t.lastContributedTick)
				t.lastChangedTick = this.currentTick
			}

			t.ticks++

			t.lastContributedTick = tIdx;

			this.motivation += t.interest * (1 - t.fatigue)
			t.topic.contribute(t.interest * (1 - t.fatigue) * t.proficiency / currentContibutingTopicDescriptors.length)
		});
		this.motivation /= currentContibutingTopicDescriptors.length
		this.w.setColor('rgba(0,0,255,' + this.motivation + ')')

		// Update dormant topics
		let currentNonContibutingTopics = this.topics.filter(t => !t.contributing)
		currentNonContibutingTopics.forEach(t => {
			if (t.ticks > 0) t.ticks--
		})
		this.shouldChangePriority = false

	}

	sigmoid(x) {
		let ex = Math.pow(2.718, x)
		return ex / (ex + 1)
	}

	assign(maxAssinments, comparator) {
		let unassignedTopics = this.topics.filter(t => !t.contributing)
		unassignedTopics.sort(comparator)

		let count = Math.max(maxAssinments, 0)
		for (let i = 0; i < Math.min(count, unassignedTopics.length); i++) {
			unassignedTopics[i].assign()
		}

	}

	postAction() {

	}
	compareNums(n1, n2) {
		if (n1 < n2) {
			return -1
		} else if (n1 > n2) {
			return 1;
		}
		return 0;
	}

	compareByInterestAsc(t1, t2) {
		return this.compareNums(t1.interest, t2.interest)
	}

	/**
	 * The ordering topics by workers demand will result in switching of the current worker with the other one.
	 */
	compareByRequiredWorkers(t1, t2) {
		let deficit1 = t1.topic.requiredWorkers - t1.topic.workers
		let deficit2 = t2.topic.requiredWorkers - t2.topic.workers
		let c = -this.compareNums(deficit1, deficit2)
		if (c == 0) {
			//!!! return -this.compareByInterestAsc(t1, t2)
			return this.compareNums(t1.lastChangedTick, t2.lastChangedTick)
		}
		return c
	}

	getInterestIn(topicIdx) {
		return this.topics[topicIdx].interest
	}
}


class TopicBehavior extends AgentBehavior {
	constructor(idx) {
		super()
		this.idx = idx
		this.t = new AgentShape()
		this.lastTickContribution = 0
		this.devSpeed = 0
		this.requiredWorkers = 2
		this.workers = 0
		this.t.setColor('green')
		this.avgInterestRate = 1
		this.deviation = 0
		this.debt = 0
		this.workersArr = []
	}
	setWorkers(workersArr) {
		this.workersArr = workersArr
		return this
	}

	contribute(contributionRate) {
		this.lastTickContribution += contributionRate
	}
	getAgentShape() { return this.t }
	describe() {
		return [
			["Required workers", this.requiredWorkers],
			["Avg. interest", Math.round10(this.avgInterestRate)],
			["Interest deviation", Math.round10(this.deviation)]]
	}
	stateHeaders() {
		return ["Development Speed", "Current workers"]
	}
	state() {
		return [this.devSpeed, this.workers]
	}
	cleanState() {
		this.devSpeed = 0
		this.workers = 0
	}
	postAction() {
		this.devSpeed = this.lastTickContribution
		this.lastTickContribution = 0
		let interests = this.workersArr.map(w => w.getInterestIn(this.idx))
		this.avgInterestRate = interests.reduce((p, c) => p + c, 0) / this.workersArr.length
		this.deviation = Math.sqrt(interests.reduce((p, c) => p + Math.pow(c - this.avgInterestRate, 2), 0) / this.workersArr.length)
		let intens = Math.round(255 * this.avgInterestRate)
		this.t.setColor('rgba(100,' + intens + ',0, 1)')
	}
	updateOpts(opts) {
		$.extend(this, opts)
	}
}

class DynamicCollaborationModel extends Model {
	constructor(title, wN, tN) {
		super(title)

		let layout = new WorkerLayout()

		let topics = []
		for (let i = 0; i < tN; i++) {
			let tb = new TopicBehavior(i)

			topics.push(tb)
			layout.addTopic(tb)
		}

		let workers = []
		for (let i = 0; i < wN; i++) {
			let a = new WorkerBehavior(i, wN, topics);

			workers.push(a)
			layout.addWorker(a)
		}
		topics.forEach(t => t.setWorkers(workers))
		this.topics = topics
		this.workers = workers
		this.aggregatedState = new AggregatedStateBehavior(workers)
		this.layout = layout
		this.allAgents = {}
		this.workers
			.concat(this.topics)
			.concat([this.aggregatedState])
			.forEach(a => {
				this.allAgents[a.id] = a
			})
	}

	draw(c) {
		this.layout.arrange(c)
		this.layout.draw(c)
	}

	getAllAgents() {
		return this.allAgents
	}

	updateTopicOpts(opts) {
		this.topics.forEach(t => t.updateOpts(opts))
		return this
	}
	updateWorkersOpts(opts) {
		this.workers.forEach(w => w.updateOpts(opts))
		return this
	}
	updateWorkerTopics(updateFunc) {
		this.workers.forEach(w => w.updateTopicsOpts(updateFunc))
		return this
	}


	// [{title:"Consumption", value:0}]
	getAggregatedState() {
		let aggregatedState = []

		let w0 = this.workers[0]
		w0.stateHeaders().forEach(wh => aggregatedState.push({
			title: wh,
			value: 0
		}))
		this.workers.forEach(w => {
			for (let i = 0; i < aggregatedState.length; i++) {
				aggregatedState[i].value += w.state()[i]
			}
		})
		let wokersCount = this.workers.length
		aggregatedState.forEach(parameter => parameter.value /= wokersCount)
		return aggregatedState
	}
}

let parameters = [
	{
		title: "Humans, 1c, noswitch",
		description: "Number of employees work on some forcibly assigned topics permanently. ",
		workersCount: 30,
		topicsCount: 5,
		workerOptions: { retentionTicks: 900, maxCompulsoryTopics: 1, fatigueSimulation: true },
		topicOptions: { requiredWorkers: 6 }
	},
	{
		title: "Humans, 1c, sync. switch",
		description: "Number of employees work on some forcibly assigned topics with <i>synchronously</i> switch between topics periodically. ",
		workersCount: 30,
		topicsCount: 5,
		workerOptions: { retentionTicks: 20, maxCompulsoryTopics: 1, fatigueSimulation: true },
		topicOptions: { requiredWorkers: 6 }
	},
	{
		title: "Humans, 1c, 1opt, queued switchover",
		description: "Number of employees work on some forcibly assigned topics with ability to share efforts with optinal interesting topic. " +
			"From time to time employees are forced to switch between compulsory topics. ",
		workersCount: 30,
		topicsCount: 5,
		workerOptions: { retentionTicks: 10, maxCompulsoryTopics: 1, fatigueSimulation: true, maxOptionalTopics: 1, synchronousSwitchover: false },
		topicOptions: { requiredWorkers: 6 }
	}
]

$(function () {
	let layout = new PageLayoutManager($('#simulation'))
		.onReset(updateModel)
	let engine = new Engine(layout)

	let preset = new PresetControl(
		'#modelSelector',
		parameters
	)
	preset.onSelectionChanged(() => {
		$('#input-retention').val(preset.getSelectedParameters().workerOptions.retentionTicks)
		updateModel()
	})

	function updateModel() {
		let selectedModelPrameters = preset.getSelectedParameters()
		selectedModelPrameters.workersCount = parseInt($('#input-maxWorkers').val())
		selectedModelPrameters.workerOptions.retentionTicks = parseInt($('#input-retention').val())

		let model = new DynamicCollaborationModel(selectedModelPrameters.title, selectedModelPrameters.workersCount, selectedModelPrameters.topicsCount).
			description(selectedModelPrameters.description).//
			updateTopicOpts(selectedModelPrameters.topicOptions).//
			updateWorkersOpts(selectedModelPrameters.workerOptions).//
			updateWorkerTopics((t, i) => t.interest = (5 - i) / 5)

		engine.setModel(model)
	}
});

