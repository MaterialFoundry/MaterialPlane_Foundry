
export class Pathfinder {

    maxDeviation = 6;
    origin;
    token;

    constructor() {

    }

    start(token, origin) {
        this.token = token;
        this.origin = origin;
    }

    calculatePath(destination, options) {
        let nodes = [];
        const collision = this.token.checkCollision(destination, {origin:this.origin});
        console.log('pathfinder', this.origin, destination, collision)
    }


}