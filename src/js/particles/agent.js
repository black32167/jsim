
var nextAgentId = 0

class Agent {
    constructor(params) {
        this.id = nextAgentId++
        this.radius = params.radius || 10;
        this.x = params.x || 10
        this.y = params.y || 10
        this.mass = params.mass || 1
        this.vx = params.vx || 0
        this.vy = params.vy || 0
        this.color = params.color || 'gray'
        this.collidedAgentIds = []
        this.tickListener = params.tickListener || (() => { })
    }

    init(p5ctx) { }

    keyPressed(key) { }

    tick(events) {
        this.tickListener.call(this)
    }

    describe() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            radius: this.radius,
            mass: this.mass,
            vx: this.vx,
            vy: this.vy,
            collidedAgentIds: this.collidedAgentIds
        }
    }

    draw(p5ctx) { }
}

class Thing extends Agent {
    constructor(radius) {
        super(radius, 999)
        this.x = 100
        this.y = 100
    }
    tick(p5ctx, events) {
        this.x = p5ctx.mouseX
        this.y = p5ctx.mouseY
    }

    draw(p5ctx) {
        p5ctx.fill(this.color);
        p5ctx.ellipse(this.x, this.y, this.radius * 2, this.radius * 2);
    }
}


class Comet extends Agent {
    /**
     * @param { radius, mass, x, y, vx, vy } params 
     */
    constructor(params) {
        super(params)
    }

    tick(p5ctx, collisions) {
        super.tick(p5ctx, collisions)
        //Update impulse
        if (collisions && collisions.impulse) {
            this.vx = collisions.impulse[0]
            this.vy = collisions.impulse[1]
        }

        let v = [this.vx, this.vy]

        this.x += v[0]
        this.y += v[1]
    }

    draw(p5ctx) {
        p5ctx.fill(this.color);

        p5ctx.ellipse(this.x, this.y, this.radius * 2, this.radius * 2);
    }
}

module.exports = {
    Thing, Comet
}