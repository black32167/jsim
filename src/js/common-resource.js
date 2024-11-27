import { AgentBehavior, AgentShape } from './agent.js'
export class ResourceBehavior extends AgentBehavior {

	constructor() {
		super()
		this.r = new AgentShape()
		this.reserve = 0
		this.maxCapacity = 10
		this.acceptResources = false
	}
	getAgentShape() {
		return this.r
	}
	meta() {
		return []
	}
	stateHeaders() {
		return ['Capacity']
	}
	addAmount(amount) {
		if (this.acceptResources) {
			var acceptedAmount = Math.min(amount, this.maxCapacity - this.reserve)
			this.reserve += acceptedAmount
		}
	}
	state() {
		return [Math.round10(this.reserve)]
	}

	action() {
		// console.log(`${this.reserve}/${this.maxCapacity}=${this.reserve / this.maxCapacity} / ${this.acceptResources}`)
		this.r.setColor('rgba(0,0,255,' + this.reserve / this.maxCapacity + ')')
	}
}
