
class ResourceBehavior extends ActorBehavior {
	
	constructor() {
		super()
		this.r = new ActorShape()
		this.reserve = 0
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
	state() {
		return [Math.round10(this.reserve)]
	}
	
	tick() {
		this.r.setColor('rgba(0,0,255,' + this.reserve  + ')')
	}
}
