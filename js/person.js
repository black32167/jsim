class PersonBehavior extends ActorBehavior {
	constructor(commonResource) {
		super()
		this.resetParameters()
		this.commonResource = commonResource
		this.capacity = 5
		this.maxCapacity = 10
		this.resetParametersAfterTick = 100
		this.tickNo = 0
		this.p = new ActorShape()
		this.useCommunityResource = false
	}

	resetParameters() {
		this.wasteRate = Math.random()
		this.consRate = this.wasteRate*1.1
		this.prodRate = this.wasteRate+(this.wasteRate*(Math.random()-0.5)/2)
	}
	getActorShape() {
		return this.p
	}
	meta() {
		return [
			["Consumption", Math.round10(this.wasteRate)],
			["Production", Math.round10(this.prodRate)]]
	}
	stateHeaders() {
		return ['Health']
	}
	state() {
		return [Math.round10(this.capacity)]
	}
	
	tick() {
		this.lastConsumed = 0
		
		if(this.capacity > 0) { // If alive
			if(this.tickNo % this.resetParametersAfterTick == 0) {
				this.resetParameters();
			}
			this.tickNo++
			this.capacity -= this.wasteRate
			
			var producedResidue = this.prodRate
			
			var requiredAmount = Math.min(this.consRate, this.maxCapacity-this.capacity)
			//var requiredAmount = this.maxCapacity-this.capacity
			var internallyConsumed = Math.min(requiredAmount, producedResidue)
			this.capacity += internallyConsumed
			producedResidue -= internallyConsumed
			requiredAmount -= internallyConsumed
			
			this.commonResource.addAmount(producedResidue)
			
			var externallyConsumed = Math.min(requiredAmount, this.commonResource.reserve)
			
			this.capacity += externallyConsumed
			
			this.commonResource.reserve -= externallyConsumed
			
			this.lastConsumed = internallyConsumed+externallyConsumed
			
			var energyRate = (1 - Math.abs(this.capacity - this.maxCapacity)/this.maxCapacity)
			if(this.prodRate > this.wasteRate) {
				this.p.setStrokeColor('blue')
				this.p.setColor('rgba(0,0,255,' + energyRate + ')')
			} else {
				this.p.setStrokeColor('red')
				this.p.setColor('rgba(255,0,0,' + energyRate + ')')
			}
			
		}
		
	}
}

class SimpleTaxModel extends Model {
	constructor(title, N) {
		super(title)
		this.actorsNum = N

		var layout = new CircularLayout()

		this.commonResourceActor = new ResourceBehavior()

		layout.setCentralElement(this.commonResourceActor)
		
		this.allAgents = []
		for(var i = 0; i < N; i++) {
			var a = new PersonBehavior(this.commonResourceActor);
			this.allAgents.push(a)
			layout.addRadialElement(a)
		}
		this.allAgents.push(this.commonResourceActor)

		this.layout = layout
	}
	saveExcess() {
		this.commonResourceActor.acceptResources = true
		return this
	}
	
	draw(c) {
		this.layout.draw(c)
	}
	
	tick(tIdx) {
		this.allAgents.forEach(a => a.tick(tIdx))
	}
	
	getAgent(agentId) {
		return this.allAgents[agentId]
	}
	getAllAgents() {
		return this.allAgents
	}
	prepare(c) {
		super.prepare(c)
		this.layout.arrange(c)//TODO: DO we need this?
	}
}
