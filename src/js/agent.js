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
		this.id = id || nextId++
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
	 * [
	 *   {
	 *     "title": "Metric title",
	 *     "key": "metric_key",
	 *     "value":0.98
	 *   },
	 * ...
	 * ]
	 */
	getMetrics() {

	}

	/**
	 * @deprecated
	 */
	stateHeaders() {
		return []
	}

	/**
	 * @deprecated
	 */
	getValueLimits() {
		return []
	}

	/**
	 * @deprecated
	 */
	state() {
		return []
	}
}

export class AggregatedStateBehavior extends AgentBehavior {
	constructor(agentsToAggregate) {
		super("aggregated")
		this.agentsToAggregate = agentsToAggregate
		this.v = 0
	}
	stateHeaders() {
		let agents = Object.values(this.agentsToAggregate)
		if (agents.length == 0) {
			return []
		}

		return [...agents[0].stateHeaders()]
	}
	getValueLimits() {
		let agents = Object.values(this.agentsToAggregate)
		if (agents.length == 0) {
			return []
		}
		return [...agents[0].getValueLimits()]
	}
	state() {
		const agents = Object.values(this.agentsToAggregate)
		const headers = this.stateHeaders()
		const aggregatedMetrics = Array(headers.length).fill(0)
		const aggregatedMetricsCount = [...aggregatedMetrics]
		for (const agent of agents) {
			agent.state().forEach((metricValue, metricIdx) => {
				if (headers[metricIdx] === "Overall Motivation") { //FIXME: ad-hoc hack
					aggregatedMetrics[metricIdx] += metricValue
					aggregatedMetricsCount[metricIdx]++
				} else {
					aggregatedMetrics[metricIdx] = Math.max(aggregatedMetrics[metricIdx], metricValue)
					aggregatedMetricsCount[metricIdx]++
				}
			})
		}

		for (const idx in aggregatedMetrics) {
			if (headers[idx] === "Overall Motivation") {
				aggregatedMetrics[idx] /= aggregatedMetricsCount[idx]
			}
		}
		return aggregatedMetrics
	}
	action(tickNo) {
		this.v = Math.min(100, this.v + 1)
	}
}
