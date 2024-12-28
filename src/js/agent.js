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

export class AggregatedStateBehavior extends AgentBehavior {
	/**
	 * @param {Array.<AgentBehavior>} agentsToAggregate 
	 */
	constructor(agentsToAggregate) {
		super("aggregated")
		this.agentsToAggregate = agentsToAggregate
		this.v = 0

		/** @type {Object.<string, Metric>} */
		const aggregatedMetricsByKey = {}

		/** @type {Object.<string, Array.<Metric>>} */
		const agentMetricsByKey = {}
		this.agentsToAggregate.forEach(agent => {
			agent.getMetrics().forEach((agentMetric, metricIdx) => {
				const key = agentMetric.getKey()

				if (agentMetricsByKey[key] == undefined) {
					agentMetricsByKey[key] = []
				}
				agentMetricsByKey[key].push(agentMetric)

				if (aggregatedMetricsByKey[key] === undefined) {
					/** @type {function ():number} */
					let valueSupplier = undefined
					if (key === 'total_motivation') {
						valueSupplier = () => {
							const agentMetricAccessors = agentMetricsByKey[key]
							return agentMetricAccessors
								.map(m => m.getValue())
								.reduce((mv1, mv2) => mv1 + mv2) / agentMetricAccessors.length
						}
					} else {
						valueSupplier = () => {
							return agentMetricsByKey[key]
								.map(m => m.getValue())
								.reduce((mv1, mv2) => Math.max(mv1, mv2))
						}
					}
					aggregatedMetricsByKey[key] = new Metric(key, agentMetric.getTitle(), valueSupplier)
						.withMax(1.0)
				}
			})
		})


		/** @type {Array.<Metric>} */
		this.aggregatedMetrics = Object.values(aggregatedMetricsByKey)

	}

	getMetrics() {
		return this.aggregatedMetrics
	}

	action(tickNo) {
		this.v = Math.min(100, this.v + 1)
	}
}
