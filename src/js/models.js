import { arg } from 'mathjs'
import { AgentBehavior } from './agent.js'
import { Metric } from './metrics.js'
/**
 * @typedef {import('./agent.js').MetricHeader} MetricHeader
 * @typedef {import('./agent.js').MetricValue} MetricValue
 */

export class Model {
	#allAgentsById = {}

	constructor(title) {
		this.title = title
		this.descriptionText = "TODO: Model description"
	}

	getTitle() {
		return this.title
	}

	tick(tIdx) {
		let agentEntries = Object.entries(this.getAllAgents())
		for (const [id, agent] of agentEntries) {
			agent.preAction(tIdx)
		}
		for (const [id, agent] of agentEntries) {
			agent.action(tIdx)
		}
		for (const [id, agent] of agentEntries) {
			agent.postAction(tIdx)
		}
	}

	draw(c) {
		throw "draw not implemented"
	}

	/** @type {Array.<AgentBehavior>} */
	setAgents(agents) {
		agents.forEach(a => {
			this.#allAgentsById[a.id] = a
		})
	}


	/**
	 * @param {string} agentId 
	 * @returns {AgentBehavior}
	 */
	getAgent(agentId) {
		return this.#allAgentsById[agentId]
	}

	/**
	 * @returns {Array.<AgentBehavior>}
	 */
	getAllAgents() {
		return Object.values(this.#allAgentsById)
	}


	prepare(c) {
	}

	getAgentMeta(id) {
		let agent = this.getAgent(id) || (() => { throw `Agent '${id}' was not found` })()
		console.log(`getting meta infor for agent ${id} (actual ${agent.id})`)

		return agent.describe()
	}

	/**
	 * @param {string} agentId 
	 * @returns {boolean}
	 */
	hasAgent(agentId) {
		return this.getAgent(agentId) !== undefined
	}

	getMetrics(agentId) {
		return this.getAgent(agentId).getMetrics()
	}

	cleanStates() {
		for (const [id, agent] of Object.entries(this.getAllAgents())) {
			agent.cleanState()
		}
	}

	// TODO: collapse with 'getStateHeaders'?
	getMetricsByAgentId() {
		/**@type {Object.<string, Array<Metric>>} */
		var state = {}
		for (const [id, agent] of Object.entries(this.getAllAgents())) {
			state[agent.id] = agent.getMetrics()
		}
		return state
	}

	// header->average(all agents) 
	getAggregatedState() {
		return {}
	}
	description(desc) {
		this.descriptionText = desc
		return this
	}
	getDescription() {
		return this.descriptionText
	}

	getAgentIdAt(x, y) {
		var allAgents = this.getAllAgents()
		for (const [id, agent] of Object.entries(this.getAllAgents())) {
			if (agent.getAgentShape() !== undefined && agent.getAgentShape().hasPoint(x, y)) {
				return agent.id
			}
		}
		return undefined
	}

}
