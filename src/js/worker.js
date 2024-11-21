import { ActorBehavior, ActorShape } from './actor.js'
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
		var topicsY = 50
		var workersY = c.height() - 50

		// Arrange topics
		var topicsNum = this.topics.length
		this.topics.forEach((a, i) => {
			var step = (c.width() - 10) / topicsNum
			a.setPos(step * (i + 0.5) + 5,
				topicsY)
		})

		// Arrange workers
		var workersNum = this.workers.length
		this.workers.forEach((a, i) => {
			var step = (c.width() - 10) / workersNum
			a.setPos(step * (i + 0.5) + 5,
				workersY)
		})
	}
	draw(c) {
		this.topics.forEach(a => {
			a.getActorShape().draw(c);
		})
		this.workers.forEach(w => {
			w.getActorShape().draw(c);
			var intTopics = w.getInterestedTopics()
			intTopics.forEach(t => {

				var linkStart = w.getActorShape().getEdgePointToNormal(t.getActorShape().x, t.getActorShape().y)
				var linkEnd = t.getActorShape().getEdgePointToNormal(w.getActorShape().x, w.getActorShape().y)
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

class WorkerBehavior extends ActorBehavior {
	constructor(idx, totalWorkers, topics) {
		super()
		this.idx = idx
		this.totalWorkers = totalWorkers
		this.maxCompulsoryTopics = 1
		this.maxOptionalTopics = 0
		this.retention = 20
		this.retentionTicks = 0
		this.prificiencyDecayRate = 0.95
		this.proficiencyDevelopingRate = 1.2
		this.synchronosSwitchover = true
		this.fatigueSimulation = false
		this.seekMandatoryExperience = false

		var _this = this
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

				contribute: function () {
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
		this.w = new ActorShape()
		this.w.r = 3
		this.motivation = 0.5
		this.priority = 0
		this.workForce = 1
	}
	updateOpts(opts) {
		$.extend(this, opts)
	}
	updateTopicsOpts(updateFunc) {
		this.topics.forEach(updateFunc)
	}

	meta() {
		var meta = []
		this.topics.forEach((t, i) => {
			meta.push(["Topic #" + i + " interest", Math.round10(t.interest)])
		})
		return meta
	}
	stateHeaders() {
		var headers = ["Overall Motivation"]
		for (var i = 0; i < this.topics.length; i++) {
			headers.push("Skill in topic #" + i)
		}
		return headers
	}
	state() {
		var stateValues = [this.motivation]
		this.topics.forEach(t => stateValues.push(Math.round10(t.proficiency)))
		return stateValues
	}
	cleanState() {
		this.motivation = 0.5
	}
	getActorShape() { return this.w }

	getInterestedTopics() {
		return this.topics.filter(t => t.contributing).map(t => t.topic);
	}

	tick(tIdx) {//Disengage
		//this.priority = 0
		this.currentTick = tIdx

		var contibutingTopics = this.topics.filter(t => t.contributing)
		contibutingTopics.forEach(t => t.abjure())

		//console.log("Stop contributing :" + this.idx)

		if (this.synchronosSwitchover) {

			if (this.retentionTicks == 0) {
				this.priority = tIdx
				//console.log("priority = " + this.priority + ", idx = " + this.idx)
			}
			if (this.retentionTicks > this.retention) {
				this.retentionTicks = 0
			} else {
				this.retentionTicks++
			}

		} else {
			if (tIdx % this.totalWorkers == this.idx) {
				this.priority = tIdx
			}
		}
	}

	tick1(tIdx) {//Engage


		// Contribute to at least one topic which requires workforce
		this.assign(this.maxCompulsoryTopics, (t1, t2) => {
			var deficit1 = t1.topic.requiredWorkers - t1.topic.workers
			var deficit2 = t2.topic.requiredWorkers - t2.topic.workers
			var c = -this.compareNums(deficit1, deficit2)
			if (c == 0) {
				//!!! return -this.compareByInterestAsc(t1, t2)
				return this.compareNums(t1.lastChangedTick, t2.lastChangedTick)
			}
			return c
		})

		// Contribute to all other interesting topics
		this.assign(this.maxOptionalTopics + this.maxCompulsoryTopics, (t1, t2) => -this.compareByInterestAsc(t1, t2))


		// Update proficiency/fatigue in all topics
		var currentContibutingTopics = this.topics.filter(t => t.contributing)
		var maxInterest = currentContibutingTopics.map(t => t.interest).reduce((a, b) => Math.max(a, b))
		this.topics.forEach(t => {
			t.proficiency = this.sigmoid(t.ticks / 3 - 1.5) * t.interest // Proficiency depends on interest

			if (this.fatigueSimulation) {
				t.fatigue = this.sigmoid(t.ticks / 3 - 1.5) * (1 - (t.interest + maxInterest) / 2) // Fatigue depends on interest
			}
		})

		// Update topics being contributed
		this.motivation = 0

		currentContibutingTopics.forEach((t, i) => {
			if (this.priority == this.currentTick) {
				if (t.lastContributedTick < this.currentTick) {
					// console.log("Topic #" + i + " has changed, priority = " + this.priority + ", tick=" + this.currentTick + ", lastCT = " + t.lastContributedTick)
					t.lastChangedTick = this.currentTick
				}
			}

			t.ticks++

			t.lastContributedTick = tIdx;

			this.motivation += t.interest * (1 - t.fatigue)
			t.topic.contribute(t.interest * (1 - t.fatigue) * t.proficiency / currentContibutingTopics.length)
		});
		this.motivation /= currentContibutingTopics.length
		this.w.setColor('rgba(0,0,255,' + this.motivation + ')')

		// Update dormant topics
		var currentNonContibutingTopics = this.topics.filter(t => !t.contributing)
		currentNonContibutingTopics.forEach(t => {
			if (t.ticks > 0) t.ticks--
		})



	}

	sigmoid(x) {
		var ex = Math.pow(2.718, x)
		return ex / (ex + 1)
	}

	assign(maxAssinments, comparator) {
		var unassignedTopics = this.topics.filter(t => !t.contributing)
		unassignedTopics.sort(comparator)

		var count = Math.max(maxAssinments - this.topics.filter(t => t.contributing).length, 0)
		for (var i = 0; i < Math.min(count, unassignedTopics.length); i++) {
			unassignedTopics[i].contribute()
		}

	}

	allTicksFinished() {

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
	getInterestIn(topicIdx) {
		return this.topics[topicIdx].interest
	}
}


class TopicBehavior extends ActorBehavior {
	constructor(idx) {
		super()
		this.idx = idx
		this.t = new ActorShape()
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
	getActorShape() { return this.t }
	meta() {
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
	allTicksFinished() {
		this.devSpeed = this.lastTickContribution
		this.lastTickContribution = 0
		var interests = this.workersArr.map(w => w.getInterestIn(this.idx))
		this.avgInterestRate = interests.reduce((p, c) => p + c, 0) / this.workersArr.length
		this.deviation = Math.sqrt(interests.reduce((p, c) => p + Math.pow(c - this.avgInterestRate, 2), 0) / this.workersArr.length)
		var intens = Math.round(255 * this.avgInterestRate)
		this.t.setColor('rgba(100,' + intens + ',0, 1)')
	}
	updateOpts(opts) {
		$.extend(this, opts)
	}
}

class DynamicCollaborationModel extends Model {
	constructor(title, wN, tN) {
		super(title)

		var layout = new WorkerLayout()

		var topics = []
		for (var i = 0; i < tN; i++) {
			var tb = new TopicBehavior(i)

			topics.push(tb)
			layout.addTopic(tb)
		}

		var workers = []
		for (var i = 0; i < wN; i++) {
			var a = new WorkerBehavior(i, wN, topics);

			workers.push(a)
			layout.addWorker(a)
		}
		topics.forEach(t => t.setWorkers(workers))
		this.topics = topics
		this.workers = workers
		this.layout = layout
		this.allAgents = this.workers.concat(this.topics)
	}

	draw(c) {
		this.layout.arrange(c)
		this.layout.draw(c)
	}

	getAgent(agentId) {
		return this.allAgents[agentId]
	}
	getAllAgents() {
		return this.allAgents
	}

	tick(tIdx) {
		this.workers.forEach((b, i) => {
			b.tick(tIdx)
		})

		var sorted = this.workers.slice()
		/*sorted.sort((w1, w2) => {
			var n1 = w1.priority || 0
			var n2 = w2.priority || 0
			if(n1 < n2){
				return -1
			} else if(n1 > n2) {
				return 1;
			}
			return 0;
		})*/
		sorted.forEach((b, i) => {
			if (b.tick1 != undefined) {
				b.tick1(tIdx)
			}
		})

		this.topics.forEach((b, i) => {
			b.allTicksFinished()
		})
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


	prepare(c) {
		super.prepare(c)
	}
}

var parameters = [
	{
		title: "Humans, 1c, noswitch",
		description: "Number of employees work on some forcibly assigned topics permanently. ",
		workersCount: 30,
		topicsCount: 5,
		workerOptions: { retention: 900, maxCompulsoryTopics: 1, fatigueSimulation: true },
		topicOptions: { requiredWorkers: 6 }
	},
	{
		title: "Humans, 1c, sync. switch",
		description: "Number of employees work on some forcibly assigned topics with <i>synchronously</i> switch between topics periodically. ",
		workersCount: 30,
		topicsCount: 5,
		workerOptions: { retention: 20, maxCompulsoryTopics: 1, fatigueSimulation: true },
		topicOptions: { requiredWorkers: 6 }
	},
	{
		title: "Humans, 1c, 1opt, queued switchover",
		description: "Number of employees work on some forcibly assigned topics with ability to share efforts with optinal interesting topic. " +
			"From time to time employees are forced to switch between compulsory topics. ",
		workersCount: 30,
		topicsCount: 5,
		workerOptions: { retention: 20, maxCompulsoryTopics: 1, fatigueSimulation: true, maxOptionalTopics: 1, synchronosSwitchover: false },
		topicOptions: { requiredWorkers: 6 }
	}
]

$(function () {
	let layout = new PageLayoutManager($('#simulation'))
		.onReset(updateModel)
	let engine = new Engine(layout)

	var preset = new PresetControl(
		'#modelSelector',
		parameters
	)
	preset.onSelectionChanged(updateModel)

	function updateModel() {
		let selectedModelPrameters = preset.getSelectedParameters()
		selectedModelPrameters.workersCount = $('#input-maxWorkers').val()
		let model = new DynamicCollaborationModel(selectedModelPrameters.title, selectedModelPrameters.workersCount, selectedModelPrameters.topicsCount).
			description(selectedModelPrameters.description).//
			updateTopicOpts(selectedModelPrameters.topicOptions).//
			updateWorkersOpts(selectedModelPrameters.workerOptions).//
			updateWorkerTopics((t, i) => t.interest = (5 - i) / 5)

		engine.setModel(model)
	}
});

