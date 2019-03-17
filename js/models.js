class Model {
	constructor(title) {
		this.title = title
		this.descriptionText = "TODO: Model description"
	}
	
	getTitle() {
		return this.title
	}

	tick() {
		throw "tick not implemented"
	}
	
	draw(c) {
		throw "draw not implemented"
	}
	
	prepare(c) {
		this.getAllAgents().forEach((a, i) => {
			if(a.id == undefined) {
				a.id = i
			} 
		})
		
	}
	getAgentMeta(id) {
		return this.getAgent(id).meta()
	}
	getAgent(agentId) {
		throw "getAgent not implemented"
	}
	getAllAgents() {
		throw "getAllAgents not implemented"
	}
	
	getStateHeaders(agentId) {
		return this.getAgent(agentId).stateHeaders()
	}
	cleanStates() {
		this.getAllAgents().forEach(a=>a.cleanState())
	}
	getStates() {
		var state = {}
		this.getAllAgents().forEach(a => {
			state[a.id] = a.state()
		})
		return state
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
		for(var i = 0; i < allAgents.length; i++) {
			var a = allAgents[i]
		
			if(a.getActorShape().hasPoint(x,y)) {
				return a.id
			}
		}
		return undefined
	}
	
}



