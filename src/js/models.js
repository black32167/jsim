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
		let agentMeta = this.getAgent(id) || (() => { throw `Agent '${id}' was not found` })()

		return agentMeta.describe()
	}
	getAgent(agentId) {
		return this.getAllAgents()[agentId]
	}

	hasAgent(id) {
		return this.getAllAgents()[id] !== undefined
	}
	// {id, agent}
	getAllAgents() {
		throw "getAllAgents not implemented"
	}

	getStateHeaders(agentId) {
		return this.getAgent(agentId).stateHeaders()
	}
	getStateValueLimits(agentId) {
		return this.getAgent(agentId).getValueLimits()
	}
	cleanStates() {
		for (const [id, agent] of Object.entries(this.getAllAgents())) {
			agent.cleanState()
		}
	}
	// TODO: collapse with 'getStateHeaders'?
	getAgentStates() {
		var state = {}
		for (const [id, agent] of Object.entries(this.getAllAgents())) {
			state[agent.id] = agent.state()
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
