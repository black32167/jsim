
import { AgentBehavior, AgentShape } from './agent.js'
import { Model } from './models.js'
import { Engine } from './engine.js'
import { PageLayoutManager } from './page-layout'
import $ from 'jquery'
import 'jcanvas'

class BlackholeModel extends Model {
	constructor(title) {
		super(title)
		this.agentsCounter = 1
		this.bh = new BlackholeAgent(0)
		this.particles = []

		this.allAgents = [this.bh]
	}

	tick(tIdx) {
		var releasedIdxs = []
		this.bh.detained = 0
		this.particles.forEach((p, i) => {
			var px = p.getAgentShape().x
			var py = p.getAgentShape().y
			if (px > this.width || py > this.height || px < 0 || py < 0) {
				releasedIdxs.push(i)
				this.bh.released++
			} else {
				p.action()
				this.bh.mass += 0.05
				this.bh.detained++
			}
		})

		var shift = 0
		// Packing particles array
		releasedIdxs.forEach(idx => {
			var st = idx - (shift++)
			for (var i = st + 1; i < this.particles.length; i++) {
				this.particles[i - 1] = this.particles[i]
			}
			this.particles.pop()
		})


		if (this.bh.detained < 10) {
			// Detain till produce new particles till amount of detained is below threshold
			if (tIdx % 10 == 0) {
				var p = new ParticleAgent(this.agentsCounter++, this.bh)
				p.setPos(this.width / 2, this.height / 2 - 15)
				this.particles.push(p)
				this.bh.newParticle()
			}
		} else {
			// Put work into technical debt reduction
			this.bh.mass -= 0.06 * this.bh.detained
		}
	}

	getAllAgents() {
		return [this.bh]
	}

	getAgent(id) {
		return this.bh
	}

	prepare(c) {
		this.width = c.width()
		this.height = c.height()
		this.bh.setPos(this.width / 2, this.height / 2)
	}
	getDescription() {
		return ""
	}
	draw(c) {
		this.particles.forEach(p => p.getAgentShape().draw(c))
		this.bh.getAgentShape().draw(c)
	}
}

class BlackholeAgent extends AgentBehavior {
	constructor(id) {
		super()
		this.id = id
		this.shape = new AgentShape()
		this.shape.color = 'black'
		this.particlesNo++
		this.released = 0
		this.detained = 0
		this.mass = 15
	}
	getMass() {
		return this.mass
	}

	getAgentShape() {
		return this.shape
	}

	newParticle() {
		this.particlesNo++
	}
	meta() {
		return []
	}
	stateHeaders() {
		return ['Mass', 'Particles released', 'Particles unreleased']
	}
	state() {
		return [this.mass,
		this.released,
		this.detained]
	}
}

class ParticleAgent extends AgentBehavior {
	constructor(id, mass) {
		super()
		this.id = id
		this.shape = new AgentShape()
		this.shape.r = 1
		this.sin = 0
		this.cos = 1
		this.impulse = 5
		this.mass = mass
	}

	action() {
		var mX = this.mass.getAgentShape().x
		var mY = this.mass.getAgentShape().y
		var pX = this.getAgentShape().x
		var pY = this.getAgentShape().y
		var h = Math.sqrt(Math.pow(mX - pX, 2) + Math.pow(mY - pY, 2))
		var cosG = (mX - pX) / h
		var sinG = (mY - pY) / h
		var gH = this.mass.getMass() * 9.8 / (h * h)
		var gX = gH * cosG
		var gY = gH * sinG

		var impX = this.cos * this.impulse
		var impY = this.sin * this.impulse

		var rX = gX + impX
		var rY = gY + impY
		var rH = Math.sqrt(Math.pow(rX, 2) + Math.pow(rY, 2))

		this.sin = rY / rH
		this.cos = rX / rH

		this.impulse = rH

		this.getAgentShape().setPos(
			pX + this.impulse * this.cos,
			pY + this.impulse * this.sin)

	}
	getAgentShape() {
		return this.shape
	}
}


$(function () {
	var container = $('#simulation')
	var layout = new PageLayoutManager(container)
		.onReset(updateModel)
	var engine = new Engine(layout)

	function updateModel() {
		let model = new BlackholeModel("Black hole")
		engine.setModel(model)
	}

	updateModel()
})
