import { ActorBehavior, ActorShape } from './actor.js'
export class ResourceBehavior extends ActorBehavior {

	constructor() {
		super()
		this.r = new ActorShape()
		this.reserve = 0
		this.maxCapacity = 10
		this.acceptResources = false
	}
	getActorShape() {
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

	tick() {
		// console.log(`${this.reserve}/${this.maxCapacity}=${this.reserve / this.maxCapacity} / ${this.acceptResources}`)
		this.r.setColor('rgba(0,0,255,' + this.reserve / this.maxCapacity + ')')
	}
}
