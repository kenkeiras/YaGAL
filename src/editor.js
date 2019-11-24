const { parse_program } = require('./parser');
const { evaluate } = require('./executor');

class CanvasDriver {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = canvas.clientWidth;
        this.height = canvas.clientHeight;

        canvas.width = this.width;
        canvas.height = this.height;

        this.ctx = this.canvas.getContext('2d');
        this.evaled = 0;
    }

    emit_square(properties) {
        this.evaled++;

        const width = properties.size;
        const height = properties.size;
        const left = (this.width / 2) + properties.x;
        const top = (this.height / 2) - properties.y;

        this.ctx.fillStyle = (`hsla(${properties.hue},`
                              + `${properties.saturation * 100}%, `
                              + `${properties.brightness * 100}%, `
                              + `${properties.alpha})`);
        this.ctx.fillRect(left, top, width, height);
    }
}

function refresh() {
    const canvas = document.getElementById('canvas');
    const driver = new CanvasDriver(canvas);

    let parsed;
    try {
        parsed = parse_program(document.getElementById("program").value);
    } catch (err) {
        if (err.location !== undefined) {
            console.error(`Line ${err.location.start.line}, col ${err.location.start.column}: ${err.message}`);
        }
        else {
            console.error(err);
        }
    }

    evaluate(parsed, driver, { early_stop: 3000 });
    console.log("Evaled:", driver.evaled);
}

document.getElementById('runner').onclick = refresh;
refresh();
