import $ from 'jquery'
import { Model } from './models'
import { Metric } from './metrics'
import { PageLayoutManager } from './page-layout'

Math.round10 = function (a) {
	return Math.round(a * 1000) / 1000
}
export function color(color, text) {
	return "<b><span style=\"color:" + color + ";\">" + text + "</span></b>"
}
export class Engine {

	/**
	 * 
	 * @param {PageLayoutManager} layout 
	 */
	constructor(layout) {
		this.layout = layout

		this.layout.setStartStopListener((started) => {
			//console.log(`Listener called:${started}`)
			//var model = models[currentModel]
			if (started) {
				this.start()
			} else {
				this.stop()
			}
		})

		// Visualization
		this.c = this.layout.getMainCanvas()

		// "Graphs"
		this.setModel(undefined)
		this.tickDelay = 100
		this.MAX_TICK = 1000

		$(this.c).on('mousemove', e => {
			this.trackMouse(e.offsetX, e.offsetY)
		})

		this.interval = setInterval(() => { this.tick() }, this.tickDelay)
	}
	getModel() {
		return this.model
	}

	/**
	 * 
	 * @param {Model} model 
	 */
	setModel(model) {
		this.model = model

		// Reset state
		/** @type {Object.<string, Object.<string, Array.<number>>>} */
		this.agentIdToMetricsHistory = {}
		this.aggregatedHistory = {}
		this.startTime = Date.now()

		this.tickNo = 0
		this.selectedAgent = null
		this.progressEnabled = false
		this.layout.resetLayout()
		if (model != undefined) {
			this.layout.setModelDescription(model.getDescription())
			requestAnimationFrame(() => { this.draw() })
			model.prepare(this.c)
		}
	}


	trackMouse(x, y) {
		const agentId = this.model.getAgentIdAt(x, y)
		if (agentId != undefined) {
			this.showAgentInfo(agentId)
		}
		//  else {
		// 	this.showAgentInfo("aggregated")
		// }
	}

	showAgentInfo(agentId) {
		if (!this.model.hasAgent(agentId)) {
			return
		}

		if (this.selectedAgent != agentId) {
			// Display agent parameters

			const agentMetrics = this.model.getMetrics(agentId)

			/** @type {Object.<string, Metric>} */
			const agentMetricsByKey = agentMetrics.reduce((acc, metric) => {
				acc[metric.getKey()] = metric
				return acc
			}, {})
			const properties = this.model.getAgentMeta(agentId)
				.map(e => {
					return {
						name: e[0], value: e[1]
					}
				})
			properties.unshift({ name: 'Agent', value: agentId })

			this.layout.setModelStateInfo(properties)

			var chartOptionsArray = []

			agentMetrics.forEach(metric => {// Iterate over metrics
				var maxValue = metric.getMaxValue()
				var chartTitle = metric.getTitle()
				var chartOptions = {
					type: 'line',
					metricKey: metric.getKey(),

					data: {
						labels: [],
						datasets: [{
							label: chartTitle,
							data: [],
							backgroundColor: [],
							fill: false,
							borderColor: 'rgba(255, 0, 0, 1)',
							lineTension: 0,
							pointRadius: 0,
							borderWidth: 3
						}]
					},
					options: {
						animation: {
							duration: 0, // general animation time
						},
						hover: {
							animationDuration: 0, // duration of animations when hovering an item
						},
						responsiveAnimationDuration: 0,
						scales: {
							y: {
								beginAtZero: true,
								max: maxValue
							}
						}
					}
				}
				chartOptionsArray.push(chartOptions)

				this.layout.setCharts(chartOptionsArray)

				this.selectedAgent = agentId
			})
		}

		var agentMetricsHistoryByMetricKey = this.agentIdToMetricsHistory[agentId]
		if (agentMetricsHistoryByMetricKey != undefined) {
			this.layout.updateCharts(agentMetricsHistoryByMetricKey)
		}
	}

	stop() {
		console.log('Stopped')
		//this.layout.hide()
		this.progressEnabled = false
		//clearInterval(this.interval)
		return this
	}

	start() {
		console.log('Started')
		this.progressEnabled = true
		//this.layout.show()

		// this.model.prepare(this.c)//TODO: do we need this?

		requestAnimationFrame(() => { this.draw() })
		//this.interval = setInterval(() => { this.tick() }, this.tickDelay)

		this.tick()
		let allAgents = this.model.getAllAgents()
		if (allAgents.length > 0) {
			let agentId = allAgents[0].id
			this.showAgentInfo(agentId)
		}

		return this
	}

	draw() {
		if (!this.startTime) this.startTime = Date.now()
		var duration = Date.now() - this.startTime

		if (duration > 100) {
			this.startTime = Date.now()

			var c = this.c

			c.clearCanvas()

			c.drawText({
				fillStyle: 'black',
				fromCenter: false,
				x: c.width() - 70, y: 10, text: 'Tick:' + this.tickNo
			})
			if (!this.progressEnabled) {
				c.drawText({
					fillStyle: 'black',
					fromCenter: false,
					x: 10, y: 10, text: 'Paused'
				})
			}
			this.model.draw(c)
		}

		requestAnimationFrame(() => { this.draw() })
	}

	cleanHistory() {
		this.agentIdToMetricsHistory = {}
		this.aggregatedHistory = {}
		this.tickNo = 1
		this.showAgentInfo(this.selectedAgent)
		this.model.cleanStates()
	}
	tick() {

		if (this.progressEnabled) {
			if (this.tickNo >= this.MAX_TICK) {
				this.stop()
			} else {
				this.model.tick(this.tickNo)

				// Save agents history
				this.model.getAllAgents().forEach(agent => {
					const agentId = agent.id
					const agentMetrics = agent.getMetrics()
					if (this.agentIdToMetricsHistory[agentId] == undefined) {
						this.agentIdToMetricsHistory[agentId] = {}
					}

					agentMetrics.forEach(metric => {
						if (this.agentIdToMetricsHistory[agentId][metric.getKey()] == undefined) {
							this.agentIdToMetricsHistory[agentId][metric.getKey()] = []
						}
						this.agentIdToMetricsHistory[agentId][metric.getKey()].push(metric.getValue())
					})
				})

				// Save aggregated history
				// [{header:"Consumption", value:0}]
				// let aggregatedState = this.model.getAggregatedState()
				// for (var parameter of aggregatedState) {
				// 	if (this.aggregatedHistory[parameter.title] == undefined) {
				// 		this.aggregatedHistory[parameter.title] = {
				// 			title:parameter.title,
				// 			values:
				// 		}
				// 	} 
				// }

				this.tickNo++
				this.showAgentInfo(this.selectedAgent)
			}
		}
	}
}
