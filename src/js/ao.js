Math.round10 = function (a) {
	return Math.round(a*1000)/1000
}
function color(color, text) {
	return "<b><span style=\"color:"+color+";\">"+text+"</span></b>"
}
class Engine {
	
    constructor(parent, model) {
    	
    	var substructure = $(`
			<div id="simulation-structure" style="display:none;">
				<div class="simulation-process">
					<div class="visualization">
					
						<canvas class="mainCanvas" width="300" height="300"></canvas>
					
						<div class="info"></div>
						
					</div>
				
					<div>
						<div class="graphs" class="scroll history" style="height:600px;width:100%;">
						</div>
					</div>
				</div>
				<div class="right-panel">
					<div class="model-description">
						TODO: description
					</div>
					<div class="controls">
						<div><a href="#" class="startStop">Start</a></div>
					</div>
				</div>
			</div>`)
    	parent.append(substructure)
    	substructure.show()
    	this.modelContainer = substructure
    	
    	// Visualization
		this.c = substructure.find('.mainCanvas')
		this.infoContainer = substructure.find('.info')
		
		// Graphs
		this.historyContainer = substructure.find('.graphs')
		this.descriptionContainer = substructure.find('.model-description')
		this.model = model
		this.tickDelay = 100
		this.MAX_TICK = 1000	

		this.history = {}
		this.startTime = Date.now()
		
		this.progressEnabled = true
		this.tickNo = 0
		this.selectedActor = null
		this.active = false
		
		$(this.c).mousemove(e => {
			this.trackMouse(e.offsetX, e.offsetY)
		})
		$(this.c).click( e => {
			this.togglePause()
		})
		
		this.startStop = substructure.find('.startStop')
		this.startStop.click( e => {
	
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
				for(var midx = 0; midx < actorHistory[0].length; midx++) {// Iterate over metrices
					var chartTitle = this.model.getStateHeaders(i)[midx]
					var chartOptions = {
	             	    type: 'line',
	             	   	
	             	    data: {
	             	        labels: [],
	             	        datasets: [{
	             	            label: chartTitle,
	             	            data: [],
	             	            backgroundColor: [],
	             	            borderColor: [],
	             	            fill: false,
	             	            borderColor:'rgba(255, 0, 0, 1)',
	             	            lineTension:0,
	             	            pointRadius:0,
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
	             	            yAxes: [{
	             	                ticks: {
	             	                    beginAtZero:true
	             	                }
	             	            }]
	             	        }
	             	    }
	             	}
					chartOptionsArray.push(chartOptions)
				}
				
				this.historyContainer.empty()
				chartOptionsArray.forEach((chartOptions) => {
					var id = Math.floor((1 + Math.random()) * 10000)
					var chartDiv = $('<canvas id="chart' + id + '" height="200" class="chart">')
					this.historyContainer.append(chartDiv)
					var chart = new Chart('chart' + id, chartOptions)
					
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
						var chart = this.charts[didx]
						var data = chart.data
						
						var ds = data.datasets[0]
				
						if(midx > data.labels.length-1) {
			             	data.labels.push(data.labels.length)
			    			ds.data.push(e1)
						}

					}
				})
			});
			this.charts.forEach(c => c.update())
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
		if(this.progressEnabled) {
//			if(this.tickNo >= this.MAX_TICK) {
//				this.cleanHistory()
//			}
			this.startStop.text('Stop')
		} else {
			this.startStop.text('Start')
		}

		return this.progressEnabled
	}
	pause() {
		this.progressEnabled = false
		return this
	}
    start() {
    	this.active = true
    	this.modelContainer.show()
    	this.descriptionContainer.html(this.model.getDescription())
    	this.model.prepare(this.c)//TODO: do we need this?
    	
		requestAnimationFrame(() => {this.draw()})
		this.interval = setInterval(() => {this.tick()}, this.tickDelay)
		
		this.tick()
		var agentId = this.model.getAllAgents()[0].id
		this.showActorInfo(agentId)

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
					x: c.width()-70, y: 10, text:'Tick:'+this.tickNo})
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

	cleanHistory() {
		this.history = {}
		this.tickNo = 1
		this.showActorInfo(this.selectedActor)
		this.model.cleanStates()
	}
	tick() {
		
		if(this.progressEnabled) {
			if(this.tickNo >= this.MAX_TICK) {
				
				this.pause()
				
			} else {
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
}
