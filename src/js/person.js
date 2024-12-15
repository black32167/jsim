import { AgentBehavior, AgentShape } from './agent.js'
import { ResourceBehavior } from './common-resource.js'
import { CircularLayout } from './model-layout.js'
import { PageLayoutManager } from './page-layout'
import { Model } from './models.js'
import { Engine } from './engine.js'
import $ from 'jquery'
import 'jcanvas'
import { PresetControl } from './input-control/preset-control.js'

class PersonBehavior extends AgentBehavior {
	constructor(id, commonResource) {
		super()
		this.id = id
		this.resetParameters()
		this.commonResource = commonResource
		this.capacity = 5
		this.maxCapacity = 10
		this.resetParametersAfterTick = 100
		this.tickNo = 0
		this.p = new AgentShape()
		this.useCommunityResource = false
	}

	resetParameters() {
		this.wasteRate = Math.random()
		this.consRate = this.wasteRate// * 1.1
		this.prodRate = Math.random()//0.5this.wasteRate + (this.wasteRate * (Math.random() - 0.5) / 2)
	}
	getAgentShape() {
		return this.p
	}
	describe() {
		return [
			["Consumption", Math.round10(this.wasteRate)],
			["Production", Math.round10(this.prodRate)]]
	}
	stateHeaders() {
		return ['Health']
	}
	getValueLimits() {
		return [{ max: 10 }]
	}
	state() {
		return [Math.round10(this.capacity)]
	}

	action() {
		this.lastConsumed = 0

		if (this.capacity > 0) { // If alive
			if (this.tickNo % this.resetParametersAfterTick == 0) {
				this.resetParameters();
			}
			this.tickNo++
			this.capacity -= this.wasteRate

			var producedResidue = this.prodRate

			var requiredAmount = Math.min(this.consRate, this.maxCapacity - this.capacity)
			//var requiredAmount = this.maxCapacity-this.capacity
			var internallyConsumed = Math.min(requiredAmount, producedResidue)
			this.capacity += internallyConsumed
			producedResidue -= internallyConsumed
			requiredAmount -= internallyConsumed

			this.commonResource.addAmount(producedResidue)

			var externallyConsumed = Math.min(requiredAmount, this.commonResource.reserve)

			this.capacity += externallyConsumed

			this.commonResource.reserve -= externallyConsumed

			this.lastConsumed = internallyConsumed + externallyConsumed

			var energyRate = (1 - Math.abs(this.capacity - this.maxCapacity) / this.maxCapacity)
			var productionBalance = this.prodRate - this.wasteRate
			// console.log(`Energy for #${this.id} = ${energyRate}, balance=${productionBalance}`)

			if (productionBalance > 0.1) {
				this.p.setStrokeColor('blue')
				this.p.setColor(`rgba(0,0,255,${energyRate})`)
			} else if (productionBalance < -0.1) {
				this.p.setStrokeColor('red')
				this.p.setColor(`rgba(255,0,0,${energyRate})`)
			} else {
				this.p.setStrokeColor('gray')
				this.p.setColor(`rgba(100,100,100,${energyRate})`)
			}

		}

	}
}

class SimpleTaxModel extends Model {
	constructor(title, N) {
		super(title)
		this.agentsNum = N

		var modelLayout = new CircularLayout()

		this.commonResourceAgent = new ResourceBehavior()

		modelLayout.setCentralElement(this.commonResourceAgent)

		this.allAgents = {}

		for (var i = 0; i < N; i++) {
			var a = new PersonBehavior(i, this.commonResourceAgent);
			this.allAgents[a.id] = a
			modelLayout.addRadialElement(a)
		}
		this.allAgents[this.commonResourceAgent.id] = this.commonResourceAgent

		this.modelLayout = modelLayout
	}
	saveExcess(acceptResources) {
		this.commonResourceAgent.acceptResources = acceptResources
		return this
	}

	draw(c) {
		this.modelLayout.draw(c)
	}

	getAllAgents() {
		return this.allAgents
	}
	prepare(c) {
		this.modelLayout.arrange(c)
	}
}
var parameters = [
	{
		title: "No community savings",
		description: "Model showing dynamics of group where members do not share resources with each other.",
		saveExcess: false,
	},
	{
		title: "Community savings",
		description: "Model showing dynamics of group where members share excessive resources with each other using sort of storage (circle in the center)." +
			"If member starves, however, it can consume resource from the shared storage sustaining itself temporarilly before it wont " +
			"be able to produce more then consume.",
		saveExcess: true,
	}
]
$(function () {
	var container = $('#simulation')
	var pageLayout = new PageLayoutManager(container)
		.onReset(updateModel)
	var engine = new Engine(pageLayout)

	let preset = new PresetControl(
		'#modelSelector',
		parameters
	)
	preset.onSelectionChanged(updateModel)

	function updateModel() {
		let modelParameters = preset.getSelectedParameters()
		let membersCount = $('#input-membersCount').val()
		let model = new SimpleTaxModel(modelParameters.title, membersCount).
			description(modelParameters.description).//
			saveExcess(modelParameters.saveExcess)

		engine.setModel(model)
	}
});
