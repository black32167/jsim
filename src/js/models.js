import { AgentBehavior } from './agent.js'
import { Metric } from './metrics.js'
/**
 * @typedef {import('./agent.js').MetricHeader} MetricHeader
 * @typedef {import('./agent.js').MetricValue} MetricValue
 */

export class Model {
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

	prepare(c) {
	}

	getAgentMeta(id) {
		let agent = this.getAgent(id) || (() => { throw `Agent '${id}' was not found` })()
		console.log(`getting meta infor for agent ${id} (actual ${agent.id})`)

		return agent.describe()
	}

	/**
	 * @param {string} agentId 
	 * @returns {AgentBehavior}
	 */
	getAgent(agentId) {
		throw "getAgent not implemented"
	}

	/**
	 * @param {string} agentId 
	 * @returns {boolean}
	 */
	hasAgent(agentId) {
		return this.getAgent(agentId) !== undefined
	}
	// {id, agent}

	/**
	 * @returns {Array.<AgentBehavior>}
	 */
	getAllAgents() {
		throw "getAllAgents not implemented"
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
