import $ from 'jquery'
import Chart from 'chart.js/auto'

export class PageLayoutManager {
    constructor(parent) {
        this.started = false
        var substructure = $(`
			<div id="simulation-structure" style="display:none;">
				<div class="simulation-process">
					<div class="visualization">
					
						<canvas id="mainCanvas" class="mainCanvas" width="300" height="300"></canvas>
					
						<div class="info"></div>
						
					</div>
				
					<div>
						<div class="graphs" class="scroll history" style="height:600px;width:100%;">
						</div>
					</div>
				</div>
				<div class="right-panel">
					<div class="model-subpage-description">
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
        this.mainCanvas = substructure.find('.mainCanvas')
        this.infoContainer = substructure.find('.info')
        this.historyContainer = substructure.find('.graphs')
        this.descriptionContainer = substructure.find('.model-subpage-description')
        this.startStop = substructure.find('.startStop')

        this.startStop.on('click', e => {
            this.togglePause()
        })
        $(this.mainCanvas).on('click', e => {
            this.togglePause()
        })
    }

    setLeftPanelWidth(width) {
        this.modelContainer.find('.simulation-process').css({ width: width })
    }

    setStartStopListener(startStopListener) {
        this.startStopListener = startStopListener
    }

    togglePause() {
        this.started = !this.started
        if (this.started) {
            this.startStop.text('Stop')
        } else {
            this.startStop.text('Start')
        }

        if (this.startStopListener !== undefined) {
            this.startStopListener(this.started)
        }
    }

    setStarted(started) {
        this.started = started
    }

    show() {
        this.modelContainer.show()
    }

    hide() {
        this.modelContainer.hide()
    }

    getMainCanvas() {
        return this.mainCanvas
    }

    // {name, value}[]
    setModelStateInfo(properties) {
        var wrapper = '<table>'
        properties.forEach(function (property) {
            wrapper += '<tr><td style="text-align:right">' + property.name + ':</td><td>' + property.value + '</td></tr>'
        });
        wrapper += '</table>'
        this.infoContainer.html(wrapper)
        $(this.infoContainer).show()
    }

    setCharts(chartOptionsArray) {
        this.historyContainer.empty()
        this.charts = []
        chartOptionsArray.forEach((chartOptions) => {
            var id = Math.floor((1 + Math.random()) * 10000)
            var chartDiv = $('<canvas id="chart' + id + '" height="200" class="chart">')
            this.historyContainer.append(chartDiv)
            var chart = new Chart('chart' + id, chartOptions)

            this.charts.push(chart)
            chart.render();
        })
    }

    updateCharts(chartData) {
        chartData.forEach((e, midx) => {
            e.forEach((e1, didx) => {
                if (this.charts[didx] != undefined) {
                    var chart = this.charts[didx]
                    var data = chart.data

                    var ds = data.datasets[0]

                    if (midx > data.labels.length - 1) {
                        data.labels.push(data.labels.length)
                        ds.data.push(e1)
                    }

                }
            })
        });
        this.charts.forEach(c => c.update())
    }

    setModelDescription(description) {
        this.descriptionContainer.html(description)
    }
}