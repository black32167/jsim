import $ from 'jquery'

Math.round10 = function (a) {
	return Math.round(a * 1000) / 1000
}
export function color(color, text) {
	return "<b><span style=\"color:" + color + ";\">" + text + "</span></b>"
}
export class Engine {

	constructor(layout, model) {
		this.layout = layout

		// Visualization
		this.c = this.layout.getMainCanvas()

		// "Graphs"
		this.model = model
		this.tickDelay = 100
		this.MAX_TICK = 1000

		this.history = {}
		this.startTime = Date.now()

		this.tickNo = 0
		this.selectedActor = null

		$(this.c).mousemove(e => {
			this.trackMouse(e.offsetX, e.offsetY)
		})
		this.progressEnabled = true
		this.interval = setInterval(() => { this.tick() }, this.tickDelay)
		// this.layout.setStartStopListener((started) =>
		// 	this.progressEnabled = started)
	}
	getModel() {
		return this.model
	}

	trackMouse(x, y) {
		var hit = false
		var agentId = this.model.getAgentIdAt(x, y)
		if (agentId != undefined) {
			this.showActorInfo(agentId)
		}
	}

	showActorInfo(i) {
		console.log(`Showing history for #${i}`)
		if (i == null) {
			return
		}
		var actorHistory = this.history[i]
		if (this.selectedActor != i) {
			// Display actor parameters
			var properties = this.model.getAgentMeta(i)
				.map(e => {
					return {
						name: e[0], value: e[1]
					}
				})
			properties.unshift({ name: 'Agent', value: i })

			this.layout.setModelStateInfo(properties)

			var chartOptionsArray = []

			if (actorHistory != undefined && actorHistory.length > 0) {
				for (var midx = 0; midx < actorHistory[0].length; midx++) {// Iterate over metrices
					var maxValue = this.model.getStateValueLimits(i)[midx]?.max
					var chartTitle = this.model.getStateHeaders(i)[midx]
					var chartOptions = {
						type: 'line',

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
				}
				this.layout.setCharts(chartOptionsArray)

				this.selectedActor = i
			}

		}

		if (actorHistory != undefined) {
			this.layout.updateCharts(actorHistory)
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
		this.layout.setModelDescription(this.model.getDescription())
		this.model.prepare(this.c)//TODO: do we need this?

		requestAnimationFrame(() => { this.draw() })
		//this.interval = setInterval(() => { this.tick() }, this.tickDelay)

		this.tick()
		var agentId = this.model.getAllAgents()[0].id
		this.showActorInfo(agentId)

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
		this.history = {}
		this.tickNo = 1
		this.showActorInfo(this.selectedActor)
		this.model.cleanStates()
	}
	tick() {

		if (this.progressEnabled) {
			if (this.tickNo >= this.MAX_TICK) {
				this.stop()
			} else {
				this.model.tick(this.tickNo)

				var statesMap = this.model.getStates()

				for (var id in statesMap) {
					if (this.history[id] == undefined) {
						this.history[id] = []
					}
					this.history[id].push(statesMap[id])
				}
				this.tickNo++
				this.showActorInfo(this.selectedActor)
			}
		}
	}
}
