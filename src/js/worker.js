import { AgentBehavior, AgentShape, AggregatedStateBehavior } from './agent.js'
import { Model } from './models.js'
import { Engine } from './engine.js'
import { PageLayoutManager } from './page-layout'
import $ from 'jquery'
import 'jcanvas'
import { PresetControl } from './input-control/preset-control.js'
import { Metric } from './metrics.js'

/**
 * @typedef {import('./agent.js').MetricHeader} MetricHeader
 * @typedef {import('./agent.js').MetricsValue} MetricsValue
 */

class WorkerLayout {
	/** @type {Array.<WorkerBehavior> } */
	#workers = []

	/** @type {Array.<TopicBehavior> } */
	#topics = []

	constructor() {

	}
	addWorker(e) {
		this.#workers.push(e)
	}
	addTopic(e) {
		this.#topics.push(e)
	}
	arrange(c) {
		let topicsY = 50
		let workersY = c.height() - 50

		// Arrange topics
		let topicsNum = this.#topics.length
		this.#topics.forEach((a, i) => {
			let step = (c.width() - 10) / topicsNum
			a.setPos(step * (i + 0.5) + 5,
				topicsY)
		})

		// Arrange workers
		let workersNum = this.#workers.length
		this.#workers.forEach((a, i) => {
			let step = (c.width() - 10) / workersNum
			a.setPos(step * (i + 0.5) + 5,
				workersY)
		})
	}
	draw(c) {
		this.#topics.forEach(a => {
			a.getAgentShape().draw(c);
		})
		this.#workers.forEach(w => {
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

class ManagerBehavior extends AgentBehavior {
	#currentRetentionTicks = 0

	/** @type {Array<WorkerBehavior>} */
	#workersQueue = []

	/** @type {Array<TopicBehavior>} */
	#projects = []

	/**
	 * 
	 * @param {Array.<WorkerBehavior>} workers 
	 */
	constructor(workers, projects) {
		super()
		this.#workersQueue = [...workers]
		this.#projects = [...projects]

		// Settings
		this.retentionTicks = 5
		this.switchingWorkersNumber = 2
	}

	updateOpts(opts) {
		$.extend(this, opts)
	}

	//TODO: just swap two?
	action(tick) {
		if (tick == 0) {
			this.#workersQueue.forEach((w, i) => {
				this.#projects[i % this.#projects.length].assignWorker(w.id)
			})
		} else {
			this.#currentRetentionTicks++
			if (this.#currentRetentionTicks > this.retentionTicks) {
				this.#currentRetentionTicks = 0
				for (let i = 0; i < this.switchingWorkersNumber; i++) {
					const workerToReassign = this.#workersQueue.shift()
					console.log(`Choosing new projects for worker ${workerToReassign.id}`)

					workerToReassign.reassignProjects()

					this.#workersQueue.push(workerToReassign)
				}
			}
		}
	}
}

class WorkerBehavior extends AgentBehavior {
	/**
	 * @typedef {Object} TopicParameters
	 * @property {number} fatigue 
	 * @property {number} contributionTime
	 * @property {number} interest 
	 * @property {number} proficiency
	 */

	/** @type {Object.<string, TopicParameters} */
	#topicParametersByTopicId = {}

	/**
	 * @param {number} idx 
	 * @param {Array.<TopicBehavior>} topics 
	 */
	constructor(idx, topics) {
		super()
		this.idx = idx
		this.maxCompulsoryTopics = 1
		this.maxOptionalTopics = 0
		this.retentionTicks = 20 // How many ticks worker is assigned to the particular project
		this.prificiencyDecayRate = 0.95
		this.proficiencyDevelopingRate = 1.2
		this.synchronousSwitchover = true
		this.fatigueSimulation = true
		this.seekMandatoryExperience = false
		this.switchingWorkersNumber = 2

		this.topics = [...topics]
		this.topics.forEach(t => {
			this.#topicParametersByTopicId[t.id] = {
				fatigue: 0,
				contributionTime: 0,
				interest: 0.5,
				proficiency: 0
			}
		})

		// Build metric accessors
		/** @type {Array.<Metric>} */
		this.metrics = [
			new Metric("total_motivation", "Total motivation", () => this.motivation)
				.withMax(1.0)
		]
		Object.entries(this.#topicParametersByTopicId).forEach(([topicId, t]) => {
			this.metrics.push(
				new Metric(`topic_skill_${topicId}`, `Skill in topic #${topicId}`, () => Math.round10(t.proficiency))
					.withMax(1.0)
			)
			this.metrics.push(
				new Metric(`topic_fatigue_${topicId}`, `Fatigue in topic #${topicId}`, () => Math.round10(t.fatigue))
					.withMax(1.0)
			)
		})

		this.w = new AgentShape()
		this.w.r = 8
		this.motivation = 0.5
		this.shouldChangePriority = true
		this.workForce = 1
	}

	reassignProjects() {
		// Reassign compulsory projects
		let selectedCompulsory = this.#selectTopic(this.maxCompulsoryTopics, (t1, t2) => this.#compareByRequiredWorkersFirstDesc(t1, t2))
		this.topics.forEach(t => t.abjureWorker(this.id))
		selectedCompulsory.forEach(t => t.assignWorker(this.id))

		// Reassign optional projects
		let selectedOptional = this.#selectTopic(this.maxOptionalTopics, (t1, t2) => this.#compareByFatigueAsc(t1, t2))
		selectedOptional.forEach(t => t.assignWorker(this.id))
	}

	updateOpts(opts) {
		$.extend(this, opts)
	}
	updateTopicsOpts(updateFunc) {
		Object.values(this.#topicParametersByTopicId).forEach(updateFunc)
	}

	describe() {
		let meta = []
		Object.entries(this.#topicParametersByTopicId).forEach(([topicId, topicParameters]) => {
			meta.push(["Topic #" + topicId + " interest", Math.round10(topicParameters.interest)])
		})
		return meta
	}

	getMetrics() {
		return this.metrics
	}

	cleanState() {
		this.motivation = 0.5
	}

	getAgentShape() { return this.w }

	getContributedTopics() {
		return this.topics.filter(t => t.isContributing(this.id));
	}

	preAction(tIdx) {//Disengage
		//this.priority = 0
		this.currentTick = tIdx

		// // Abjure all the topics
		// this.topics.forEach(t => t.abjure())
	}

	action(tIdx) {//Engage
		// Update proficiency/fatigue in all contributing topics
		let currentContibutingTopicDescriptors = this.topics.filter(t => t.isContributing(this.id))
		// let maxInterest = currentContibutingTopicDescriptors.map(t => t.interest).reduce((a, b) => Math.max(a, b), 0.0)

		// Update topics being contributed
		this.motivation = 0

		currentContibutingTopicDescriptors.forEach((t, i) => {
			const topicDescriptor = this.#topicParametersByTopicId[t.id]
			const fatigue = topicDescriptor.fatigue
			const proficiency = topicDescriptor.proficiency
			const interest = topicDescriptor.interest

			// Limiting how far the 'time' parameter can get
			const epsilon = 0.0001
			if (Math.abs(fatigue - 1) > epsilon || Math.abs(proficiency - 1) > epsilon) {
				topicDescriptor.contributionTime++
			}

			this.motivation = (1 - fatigue) / currentContibutingTopicDescriptors.length

			/** @type {TopicBehavior} */
			const contribution = interest * (1 - fatigue) * proficiency / currentContibutingTopicDescriptors.length
			t.contribute(contribution, fatigue)
		});

		this.w.setColor('rgba(0,0,255,' + this.motivation + ')')

		// Update dormant topics
		let currentNonContibutingTopics = this.topics.filter(t => !t.isContributing(this.id))
		currentNonContibutingTopics.forEach(t => {
			const topicDescriptor = this.#topicParametersByTopicId[t.id]
			if (topicDescriptor.contributionTime > 0) topicDescriptor.contributionTime--
		})

		// Update time-dependent project parameters
		Object.values(this.#topicParametersByTopicId).forEach(t => {
			// Fatigue growth with time, but interest in this particular topic and also having a side interest
			// help to slow down that growth.
			t.fatigue = (this.sigmoid(t.contributionTime / (t.interest * 100)) - 0.5) * 2

			t.proficiency = (this.sigmoid(t.interest * t.contributionTime / 3) - 0.5) * 2
		})

		this.shouldChangePriority = false
	}

	sigmoid(x) {
		let ex = Math.pow(2.718, x)
		return ex / (ex + 1)
	}

	assign(maxAssinments, comparator) {
		let unassignedTopics = this.topics.filter(t => !t.isContributing(this.id))
		unassignedTopics.sort(comparator)

		let count = Math.max(maxAssinments, 0)
		for (let i = 0; i < Math.min(count, unassignedTopics.length); i++) {
			unassignedTopics[i].assign()
		}
	}

	#selectTopic(maxAssinments, comparator) {
		let unassignedTopics = this.topics.filter(t => !t.isContributing(this.id))
		unassignedTopics.sort(comparator)
		return unassignedTopics.slice(0, Math.min(maxAssinments, unassignedTopics.length))
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

	#compareByFatigueAsc(t1, t2) {
		//return this.compareNums(t1.interest, t2.interest)
		return this.compareNums(this.#topicParametersByTopicId[t1.id].fatigue, this.#topicParametersByTopicId[t2.id].fatigue)
	}

	/**
	 * The ordering topics by workers demand will result in switching of the current worker with the other one.
	 * 
	 * @param {TopicBehavior} t1
	 * @param {TopicBehavior} t2
	 */
	#compareByRequiredWorkersFirstDesc(t1, t2) {
		let deficit1 = t1.requiredWorkers - t1.contributorsCount()
		let deficit2 = t2.requiredWorkers - t2.contributorsCount()
		let c = -this.compareNums(deficit1, deficit2)
		if (c == 0) {
			//!!! return -this.compareByInterestAsc(t1, t2)
			return this.#compareByFatigueAsc(t1, t2) // this.compareNums(t1.fatigue, t2.fatigue)
		}
		return c
	}

	getInterestIn(topicId) {
		return this.#topicParametersByTopicId[topicId].interest
	}
}


class TopicBehavior extends AgentBehavior {
	/** @type {Array.<string>}*/
	#contributingWorkerIds = []

	/** @type {Array.<WorkerBehavior>}*/
	#workersArr = []

	constructor(idx) {
		super()
		this.idx = idx
		this.t = new AgentShape()
		this.lastTickContribution = 0
		this.devSpeed = 0
		this.requiredWorkers = 2
		this.t.setColor('green')
		this.avgInterestRate = 1
		this.interestsDeviation = 0
		this.averageFatigue = 0.0
		this.metrics = [
			new Metric("dev_speed", "Development Speed", () => this.devSpeed),
			new Metric("workers_current", "Current contributors", () => this.contributorsCount()),
			new Metric("average_fatigue", "Average fatigue", () => this.averageFatigue)
		]
	}
	setWorkers(workersArr) {
		this.#workersArr = [...workersArr]
		return this
	}

	contributorsCount() {
		return this.#contributingWorkerIds.length
	}

	isContributing(workerId) {
		return this.#contributingWorkerIds.includes(workerId)
	}

	assignWorker(workerId) {
		if (this.isContributing(workerId)) {
			throw "Already contributing!"
		}
		this.#contributingWorkerIds.push(workerId)
	}

	abjureWorker(workerId) {
		var index = this.#contributingWorkerIds.indexOf(workerId);
		if (index !== -1) {
			this.#contributingWorkerIds.splice(index, 1);
		}
	}
	/**
	 * @param {number} contributionRate 
	 * @param {number} fatigue
	 */
	contribute(contributionRate, fatigue) {
		this.lastTickContribution += contributionRate
		this.averageFatigue += fatigue / this.contributorsCount()
	}
	getAgentShape() { return this.t }
	describe() {
		return [
			["Required workers", this.requiredWorkers],
			["Current workers", this.contributorsCount()],
			["Avg. interest", Math.round10(this.avgInterestRate)],
			["Interest deviation", Math.round10(this.interestsDeviation)]]
	}

	getMetrics() {
		return this.metrics
	}

	cleanState() {
		this.devSpeed = 0
		this.#contributingWorkerIds = []
		this.lastTickContribution = 0
		this.averageFatigue = 0
	}

	preAction(tIdx) {
		this.averageFatigue = 0
	}
	postAction(tIdx) {
		// Complexity of coordination grows non-linearly with number of participants
		let coordinationComplexityPenalty = Math.pow(this.contributorsCount(), 1.5)

		// Progress is proportional to net efforts, however negatively impacted by coordination complexity 
		this.devSpeed = this.lastTickContribution / coordinationComplexityPenalty

		// Aggregates of contributor interests in the current toppic
		let interests = this.#workersArr.map(w => w.getInterestIn(this.id))
		this.avgInterestRate = interests.reduce((p, c) => p + c, 0) / this.#workersArr.length
		this.interestsDeviation = Math.sqrt(interests.reduce((p, c) => p + Math.pow(c - this.avgInterestRate, 2), 0) / this.#workersArr.length)

		// Set color for topic depending on how engaing it is for contrbutors
		let intens = Math.round(255 * this.avgInterestRate)
		this.t.setColor('rgba(100,' + intens + ',0, 1)')

		this.lastTickContribution = 0
	}
	updateOpts(opts) {
		$.extend(this, opts)
	}
}

class DynamicCollaborationModel extends Model {
	/** @type {Array.<TopicBehavior>} */
	#topics = []

	/** @type {Array.<WorkerBehavior>} */
	#workers = []

	/** @type {ManagerBehavior} */
	#manager = []

	constructor(title, wN, tN) {
		super(title)

		let layout = new WorkerLayout()

		for (let i = 0; i < tN; i++) {
			let tb = new TopicBehavior(i)

			this.#topics.push(tb)
			layout.addTopic(tb)
		}

		for (let i = 0; i < wN; i++) {
			let a = new WorkerBehavior(i, this.#topics);

			this.#workers.push(a)
			layout.addWorker(a)
		}
		this.#topics.forEach(t => t.setWorkers(this.#workers))
		this.#manager = new ManagerBehavior(this.#workers, this.#topics)
		this.aggregatedState = new AggregatedStateBehavior(this.#workers)
		this.layout = layout
		this.allAgentsById = {}
		this.#workers
			.concat(this.#topics)
			.concat([this.aggregatedState])
			.concat([this.#manager])
			.forEach(a => {
				this.allAgentsById[a.id] = a
			})
	}

	draw(c) {
		this.layout.arrange(c)
		this.layout.draw(c)
	}

	/**
	 * @param {string} agentId 
	 * @returns {AgentBehavior}
	 */
	getAgent(agentId) {
		return this.allAgentsById[agentId]
	}

	/**
	 * @returns {Array.<AgentBehavior>}
	 */
	getAllAgents() {
		return Object.values(this.allAgentsById)
	}

	updateTopicOpts(opts) {
		this.#topics.forEach(t => t.updateOpts(opts))
		return this
	}
	updateWorkersOpts(opts) {
		this.#workers.forEach(w => w.updateOpts(opts))
		return this
	}
	updateWorkerTopics(updateFunc) {
		this.#workers.forEach(w => w.updateTopicsOpts(updateFunc))
		return this
	}
	updateManagerOpts(opts) {
		this.#manager.updateOpts(opts)
		return this
	}

	// [{title:"Consumption", value:0}]
	getAggregatedState() {
		let aggregatedState = []

		let w0 = this.#workers[0]
		w0.stateHeaders().forEach(wh => aggregatedState.push({
			title: wh,
			value: 0
		}))
		this.#workers.forEach(w => {
			for (let i = 0; i < aggregatedState.length; i++) {
				aggregatedState[i].value += w.state()[i]
			}
		})
		let wokersCount = this.#workers.length
		aggregatedState.forEach(parameter => parameter.value /= wokersCount)
		return aggregatedState
	}
}

let parameters = [
	// {
	// 	title: "Humans, 1c, noswitch",
	// 	description: "Number of employees work on some forcibly assigned topics permanently. ",
	// 	workersCount: 30,
	// 	topicsCount: 5,
	// 	workerOptions: { retentionTicks: 900, maxCompulsoryTopics: 1 },
	// 	topicOptions: { requiredWorkers: 6 }
	// },
	// {
	// 	title: "Humans, 1c, sync. switch",
	// 	description: "Number of employees work on some forcibly assigned topics with <i>synchronously</i> switch between topics periodically. ",
	// 	workersCount: 30,
	// 	topicsCount: 5,
	// 	workerOptions: { retentionTicks: 20, maxCompulsoryTopics: 1, maxOptionalTopics: 1 },
	// 	topicOptions: { requiredWorkers: 3 }
	// },
	{
		title: "Humans, 1c, 1opt, queued switchover",
		description: "Number of employees work on some forcibly assigned topics with ability to share efforts with optinal interesting topic. " +
			"From time to time employees are forced to switch between compulsory topics. ",
		workersCount: 30,
		topicsCount: 5,
		workerOptions: { retentionTicks: 10, maxCompulsoryTopics: 1, maxOptionalTopics: 1 },
		topicOptions: { requiredWorkers: 3 },
		managerOptions: { retentionTicks: 5, switchingWorkersNumber: 2 }
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
		$('#input-retention').val(preset.getSelectedParameters().managerOptions.retentionTicks)
		updateModel()
	})

	function updateModel() {
		let selectedModelPrameters = preset.getSelectedParameters()
		selectedModelPrameters.workersCount = parseInt($('#input-maxWorkers').val())
		selectedModelPrameters.managerOptions.retentionTicks = parseInt($('#input-retention').val())

		let model = new DynamicCollaborationModel(selectedModelPrameters.title, selectedModelPrameters.workersCount, selectedModelPrameters.topicsCount).
			description(selectedModelPrameters.description).//
			updateTopicOpts(selectedModelPrameters.topicOptions).//
			updateWorkersOpts(selectedModelPrameters.workerOptions).//
			updateWorkerTopics((t, i) => t.interest = (5 - i) / 5).
			updateManagerOpts(selectedModelPrameters.managerOptions)

		engine.setModel(model)
	}
});

