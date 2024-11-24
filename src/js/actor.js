export class ActorShape {
	constructor() {
		this.r = 10
		this.x = 10
		this.y = 10
		this.stroke = 'blue'
		this.color = 'blue'
	}

	setPos(x, y) {
		this.x = x
		this.y = y
	}

	hasPoint(x, y) {
		return (Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2) < Math.pow(this.r, 2))
	}

	draw(jCanvas) {
		jCanvas.drawArc({
			strokeStyle: this.stroke,
			fillStyle: this.getColor(),
			strokeWidth: 1,
			x: this.x, y: this.y,
			radius: this.r
		});
	}
	setStrokeColor(c) { this.stroke = c }

	setColor(c) { this.color = c }
	getColor() { return this.color }

	getEdgePointToNormal(x, y) {
		var hyp = Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2))
		var cos = (x - this.x) / hyp
		var sin = (y - this.y) / hyp
		return {
			x: this.x + this.r * cos,
			y: this.y + this.r * sin
		}
	}
}
var nextId = 0
export class ActorBehavior {
	constructor(id) {
		this.id = id || nextId++
	}
	getActorShape() {
		return undefined
	}
	setPos(x, y) {
		this.getActorShape().setPos(x, y)
	}
	meta() {
		return []
	}
	preAction(tickNo) {
	}
	action(tickNo) {
	}
	postAction(tickNo) {
	}
	stateHeaders() {
		return []
	}
	getValueLimits() {
		return []
	}
	state() {
		return []
	}
}

export class AggregatedStateBehavior extends ActorBehavior {
	constructor(agentsToAggregate) {
		super("aggregated")
		this.agentsToAggregate = agentsToAggregate
		this.v = 0
	}
	stateHeaders() {
		return ["Header"]
	}
	getValueLimits() {
		return [100]
	}
	state() {
		return [this.v]
	}
	action(tickNo) {
		this.v = Math.min(100, this.v + 1)
	}
}
