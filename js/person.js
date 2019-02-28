class PersonBehavior extends ActorBehavior {
	constructor(commonResource) {
		super()
		this.consRate = Math.random()
		this.wasteRate = this.consRate*0.9//Math.random()//*this.consRate
		this.prodRate = Math.random()
		this.personalReserveRate=Math.random()
		this.commonResource = commonResource
		this.privateReserve = 0
		this.capacity = 5
		this.maxCapacity = 10
		this.p = new ActorShape()
	}
	getActorShape() {
		return this.p
	}
	meta() {
		return [
			["Consumption", Math.round10(this.consRate)],
			["Irreversibly consumed", Math.round10(this.wasteRate)],
			["Production", Math.round10(this.prodRate)]]
	}
	stateHeaders() {
		return ['Capacity', 'Savings', 'Last Consumed', 'Last Wasted']
	}
	state() {
		return [Math.round10(this.capacity),
		        Math.round10(this.privateReserve),
		        Math.round10(this.lastConsumed),
		        Math.round10(this.wasteRate)]
	}
	
	tick() {
		this.lastConsumed = 0
		if(this.capacity > 0) {
			if(this.capacity < this.maxCapacity) {
				if (this.commonResource.reserve > this.consRate) {
					this.commonResource.reserve -= this.consRate
					this.lastConsumed = this.consRate
				} else if(this.privateReserve > this.consRate) {
					this.lastConsumed = this.consRate
					this.privateReserve -= this.consRate
				}
				
			}
		
			this.commonResource.reserve += (1-this.personalReserveRate)*this.prodRate
			this.privateReserve += this.personalReserveRate*this.prodRate
			this.capacity -= this.wasteRate
			
			this.capacity += this.lastConsumed
			this.p.setColor('rgba(0,0,255,' + (1 - Math.abs(this.capacity - this.maxCapacity)/this.maxCapacity)  + ')')
		}
		
	}
}

class SimpleTaxModel extends Model {
	constructor(title, N) {
		super(title)
		this.actorsNum = N

		var layout = new CircularLayout()

		var commonResourceActor = new ResourceBehavior(commonResourceActor)

		layout.setCentralElement(commonResourceActor)
		
		this.allAgents = []
		for(var i = 0; i < N; i++) {
			var a = new PersonBehavior(commonResourceActor);
			this.allAgents.push(a)
			layout.addRadialElement(a)
		}
		this.allAgents.push(commonResourceActor)

		this.layout = layout
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
