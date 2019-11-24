const { createCanvas, loadImage } = require('canvas');
const fs = require("fs");

const { parse_program } = require('./parser');
const { evaluate } = require('./executor');

const content = fs.readFileSync(process.argv[2]).toString();

class CairoDriver {
    constructor() {
        this.width = 1024;
        this.height = 1024;
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

    save(output) {
        return new Promise((resolve, reject) => {
            const out = fs.createWriteStream(output);
            const stream = this.canvas.createPNGStream();
            stream.pipe(out);
            out.on('finish', () => { resolve(); });
        });
    }
}

const driver = new CairoDriver();

let parsed;
try {
    parsed = parse_program(content);
} catch (err) {
    if (err.location !== undefined) {
        console.error(`Line ${err.location.start.line}, col ${err.location.start.column}: ${err.message}`);
    }
    else {
        console.error(err);
    }
    process.exit(1);
}

evaluate(parsed, driver);

driver.save(process.argv[3]).then(() => process.exit());
