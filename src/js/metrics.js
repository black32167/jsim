
export class Metric {
    /**
     * 
     * @param {string} key 
     * @param {string} title 
     * @param {function():number} metricSupplier 
     */
    constructor(key, title, metricSupplier) {
        this.key = key
        this.title = title
        this.metricSupplier = metricSupplier
        this.max = undefined
    }

    /**
    * @return {string}
    */
    getKey() {
        return this.key
    }

    /**
     * @return {string}
     */
    getTitle() {
        return this.title
    }

    /**
     * @return {number}
     */
    getValue() {
        return this.metricSupplier()
    }

    withMax(max) {
        this.max = max
        return this
    }

    getMaxValue() {
        return this.max
    }
} 