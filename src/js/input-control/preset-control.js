
import $ from 'jquery'

export class PresetControl {
    constructor(selectorId, modelParametersArray, engine, createModel) {
        this.modelSelector = $(selectorId)
        this.modelParametersArray = modelParametersArray
        this.engine = engine
        this.createModel = createModel

        this.modelSelector.empty()
        this.modelParametersArray.forEach((e, i) => {
            // e.stop()
            this.modelSelector.append($('<option>', {
                value: i,
                text: e.title
            }))
        })
        let _this = this
        this.modelSelector.on('change', function (value) {
            _this.updateModel()
        })
        this.modelSelector.val(0)

        this.updateModel()
    }

    updateModel() {
        let selectedIndex = this.modelSelector.val()
        console.log(`selected idx = ${selectedIndex}`)
        let modelParameters = this.modelParametersArray[selectedIndex]

        let model = this.createModel(modelParameters)

        this.engine.setModel(model)
    }
}