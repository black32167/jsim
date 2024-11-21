
import $ from 'jquery'

export class PresetControl {
    constructor(selectorId, modelParametersArray) {
        let modelSelector = this.modelSelector = $(selectorId)
        this.modelParametersArray = modelParametersArray

        modelSelector.empty()
        modelParametersArray.forEach((e, i) => {
            // e.stop()
            modelSelector.append($('<option>', {
                value: i,
                text: e.title
            }))
        })
    }

    getSelectedParameters() {
        return this.modelParametersArray[this.modelSelector.val()]
    }

    onSelectionChanged(onSelectionCallback) {
        let _this = this
        this.modelSelector.on('change', function (value) {
            onSelectionCallback.call(_this)
        })
        this.modelSelector.val(0)
        onSelectionCallback.call(_this)

        return this
    }
}