const { parse_program } = require('./parser');
const { evaluate } = require('./executor');

class CanvasDriver {
    constructor(canvas) {
        this.canvas = createCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext('2d');
    }

    emit_square(properties) {
        const width = properties.size;
        const height = properties.size;
        const left = (this.width / 2) + properties.x;
        const top = (this.height / 2) - properties.y;

        this.ctx.beginPath();
        this.ctx.fillStyle = (`hsla(${properties.hue},`
                              + `${properties.saturation * 100}%, `
                              + `${properties.brightness * 100}%, `
                              + `${properties.alpha})`);
        this.ctx.fillRect(left, top, width, height);
        this.ctx.stroke();
    }
}

module.exports = { parse_program, evaluate, CanvasDriver };
