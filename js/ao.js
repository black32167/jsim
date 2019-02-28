Math.round10 = function (a) {
	return Math.round(a*1000)/1000
}
class Engine {
    constructor(parent, model) {

		this.c = $('<canvas class="mainCanvas" width="300" height="300">')
		this.model = model
		this.tickDelay = 100
	
		this.history = {}
		this.startTime = Date.now()
		this.infoContainer = $('<div class="info">')
		
		this.historyContainer = $('<div class="scroll history" style="height:600px;width:600px;"></div>')
		this.progressEnabled = true
		this.tickNo = 0
		this.selectedActor = null
		this.active = false
		
		this.modelContainer = $('<div class="model">')
		parent.append(this.modelContainer)
		
		var leftPanel = $('<div style="float:left">')
		leftPanel.append(this.c)
		leftPanel.append(this.infoContainer)
		
		this.modelContainer.append(leftPanel)
		var historyCC = $('<div>')
		historyCC.append(this.historyContainer)
		this.modelContainer.append(historyCC)

		
		$(this.c).mousemove(e => {
			this.trackMouse(e.offsetX, e.offsetY)
		})
		$(this.c).click( e => {
			this.togglePause()
		})
	}
	getModel() {
		return this.model
	}
	
	trackMouse(x,y) {
		var hit = false
		var agentId = this.model.getAgentIdAt(x,y)
		if(agentId != undefined) {
			this.showActorInfo(agentId)
		}
	}
	
	showActorInfo(i) {
		if (i == null) {
			return
		}
		var actorHistory = this.history[i]
		if(this.selectedActor != i) {
			
			
			// Display actor parameters
			var wrapper = '<table>'
			wrapper += '<tr><td style="text-align:right">Agent #</td><td>' + i + '</td></tr>'
			this.model.getAgentMeta(i).forEach(function(e) {
				wrapper += '<tr><td style="text-align:right">' + e[0] + ':</td><td>' + e[1] + '</td></tr>'
			});
			wrapper += '</table>'
			this.infoContainer.html(wrapper)
			$(this.infoContainer).show()
			
			var chartOptionsArray = []
			this.charts = []
			if(actorHistory != undefined && actorHistory.length > 0) {
				for(var midx = 0; midx < actorHistory[0].length; midx++) {
					var chartTitle = this.model.getStateHeaders(i)[midx]
					var chartOptions = {
						animationEnabled: false,
						title:{
							text: chartTitle
						},
						legend:{
							cursor: "pointer",
							fontSize: 8,
							
						},
						toolTip:{
							shared: true
						},
						data:[{
							name: chartTitle,
							type: "line",
							dataPoints: []
						}]
					}
					chartOptionsArray.push(chartOptions)
				}
				
				this.historyContainer.empty()
				chartOptionsArray.forEach((chartOptions) => {
					var id = Math.floor((1 + Math.random()) * 10000)
					var chartDiv = $('<div id="chart' + id + '" class="chart" style="height:200px">')
					this.historyContainer.append(chartDiv)
					var chart = new CanvasJS.Chart('chart' + id, chartOptions)
					
					this.charts.push(chart)
					chart.render();
				})
				
				this.selectedActor = i
			}	
			
		}
		
		if(actorHistory != undefined) {
			actorHistory.forEach((e, midx) => {
				e.forEach((e1,didx) => {
					if(this.charts[didx] != undefined) {
						var dpoints = this.charts[didx].options.data[0].dataPoints
						if(midx > dpoints.length-1) {
							dpoints.push({y:e1})
						}
					}
				})
			});
			this.charts.forEach(c => c.render())
		}
		
	}

	stop() {
		this.modelContainer.hide()
		clearInterval(this.interval)
		this.active = false
		return this
	}
	togglePause() {
		this.progressEnabled = !this.progressEnabled
		return this
	}
	pause() {
		this.progressEnabled = false
		return this
	}
    start() {
    	this.active = true
    	this.modelContainer.show()
    	this.model.prepare(this.c)//TODO: do we need this?
    	
		requestAnimationFrame(() => {this.draw()})
		this.interval = setInterval(() => {this.tick()}, this.tickDelay)
		return this
    }
    
	draw() {
		if (!this.startTime) this.startTime = Date.now()
		var duration = Date.now() - this.startTime
		
		if(duration > 100) {
			this.startTime = Date.now() 

			var c = this.c
			
			c.clearCanvas()
			
			c.drawText({
					fillStyle: 'black',
					fromCenter: false,
					x: c.width()-60, y: 10, text:'Tick:'+this.tickNo})
			if(!this.progressEnabled) {
				c.drawText({
					fillStyle: 'black',
					fromCenter: false,
					x: 10, y: 10, text:'Paused'})
			
			}
			this.model.draw(c)
		}
		if(this.active) {
			requestAnimationFrame(() => {this.draw()})
		}
	}

	tick() {
		if(this.progressEnabled) {
			this.model.tick(this.tickNo)
		
			var statesMap = this.model.getStates()
			
			for(var id in statesMap) {
				if(this.history[id] == undefined) {
					this.history[id] = []
				}
				this.history[id].push(statesMap[id])
			}
			this.tickNo++
			this.showActorInfo(this.selectedActor)
		}
	}
}
