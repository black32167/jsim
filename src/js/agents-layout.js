export class CircularLayout {
	constructor() {
		this.perimeterAgents = []
		this.centralAgent = null
	}
	addRadialElement(e) {
		this.perimeterAgents.push(e)
	}
	setCentralElement(e) {
		this.centralAgent = e
	}
	arrange(c) {
		var adelta = 2 * Math.PI / this.perimeterAgents.length

		var cX = c.width() / 2
		var cY = c.height() / 2
		var agentsR = 100

		for (var i = 0; i < this.perimeterAgents.length; i++) {
			var a = this.perimeterAgents[i]
			var alpha = i * adelta
			a.setPos(Math.cos(alpha) * agentsR + cX,
				Math.sin(alpha) * agentsR + cY)
		}
		this.centralAgent.setPos(cX, cY)
	}
	draw(c) {
		this.perimeterAgents.forEach(a => {
			a.getAgentShape().draw(c);
		})
		this.centralAgent.getAgentShape().draw(c)
	}
}

