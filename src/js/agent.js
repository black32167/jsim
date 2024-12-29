import { Metric } from "./metrics"

export class AgentShape {
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


export class AgentBehavior {
	constructor(id) {
		/** @type {string} */
		this.id = id || `${nextId++}`
	}
	getAgentShape() {
		return undefined
	}
	setPos(x, y) {
		this.getAgentShape().setPos(x, y)
	}
	describe() {
		return []
	}
	preAction(tickNo) {
	}
	action(tickNo) {
	}
	postAction(tickNo) {
	}

	/** 
	 * @return {Array.<Metric>} 
	 */
	getMetrics() {
		return []
	}
}

