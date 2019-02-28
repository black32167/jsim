class CircularLayout {
	constructor() {
		this.perimeterActors = []
		this.centralActor = null
	}
	addRadialElement(e) {
		this.perimeterActors.push(e)
	}
	setCentralElement(e) {
		this.centralActor = e
	}
	arrange(c) {
		var adelta = 2*Math.PI/this.perimeterActors.length
		
		var cX = c.width()/2
		var cY = c.height()/2
		var agentsR = 100
		
		for(var i = 0; i < this.perimeterActors.length; i++) {
			var a = this.perimeterActors[i]
			var alpha = i*adelta
			a.setPos(Math.cos(alpha)*agentsR + cX,
					Math.sin(alpha)*agentsR + cY)
		}
		this.centralActor.setPos(cX, cY)
	}
	draw(c) {
		this.perimeterActors.forEach(a => {
			a.getActorShape().draw(c);
		})
		this.centralActor.getActorShape().draw(c)
	}
}

