const { createCanvas, loadImage } = require('canvas');

const grammar = require("./cfdg-grammar");
const fs = require("fs");

const content = fs.readFileSync(process.argv[2]).toString();

const PROGRESS_UPDATE_INTERVAL = 10000;
const BASE_SIZE = 5;
const MINIMUM_SIZE = 0.5; // Pixels
const BASE_PROPERTIES = {
    flip: 0,  // Not applied
    rotate: 0,
    hue: 0,
    saturation: 0,
    brightness: 0,
    alpha: 1,
    size: BASE_SIZE,
    x: 0,
    y: 0,
};

const PROPERTY_ALIASES = {
    r: 'rotate',
    sat: 'saturation',
    b: 'brightness',
    a: 'alpha',
    s: 'size',
};

const PROPORTIONAL_PROPERTIES = {
    'size': true
};

function remove_comments(input) {
    const result = (input
                    .split(/\n/).map((v, _i, _a) => {
                        return v.split(/\/\//)[0];
                    })
                    .join('\n'));
    return result;
}

function tokenize(input) {
    return grammar.parse(remove_comments(input));
}

function is_whitespace(input) {
    if (input === undefined || input === null) { return false; }
    if (input.match === undefined) { return false; }
    return input.match(/^\s*$/) !== null;
}

function all(input) {
    for (const entry of input) {
        if (entry !== true) {
            return false;
        }
    }
    return true;
}

// From: https://stackoverflow.com/a/39000004
const flatten = function(arr, result = []) {
    for (let i = 0, length = arr.length; i < length; i++) {
        const value = arr[i];
        if (Array.isArray(value)) {
            flatten(value, result);
        } else {
            result.push(value);
        }
    }
    return result;
};

function gather_string(input) {
    return flatten(input).join("");
}

function parse_float_or_null(input) {
    if ((input[1].length === 0)
        && (input[3].length === 0)) {
        return null;
    }
    return parse_float(input);
}

function parse_float(input) {
    let sign = input[0];
    if (sign === null) { sign = "+"; };

    let before_dot;
    if (input[1] === null) {
        before_dot = '0';
    }
    else {
        before_dot = gather_string(input[1]);
    }

    let after_dot;
    if (input[3] === null) {
        after_dot = '0';
    }
    else {
        after_dot = gather_string(input[3]);
    }

    return parseFloat(`${sign}${before_dot}.${after_dot}`);
}

function parse_parameter(input) {
    return { key: input[0].toLowerCase(), value: parse_float(input[2]) };
}

function parse_parameters(input) {
    const params = {};

    for (const entry of input[0]) {
        const parsed = parse_parameter(entry[0]);
        params[parsed.key] = parsed.value;
    }

    if (input[1] !== null) {
        const parsed = parse_parameter(input[1]);
        params[parsed.key] = parsed.value;
    }

    return params;
}

function parse_step(entry) {
    return {
        name: gather_string(entry[0]),
        parameters: parse_parameters(entry[4]),
    };
}

function parse_steps(body) {
    const steps = [];
    for (const entry of body[0]) {
        steps.push(parse_step(entry[0]));
    }
    if (body[1] !== null) {
        steps.push(parse_step(body[1]));
    }

    return steps;
}

function parse_rule(input) {
    const weight = parse_float_or_null(input[2]);
    return {
        weight: weight === null ? 1 : weight,
        content: parse_steps(input[6]),
    };
}

function parse_rules(input) {
    const rules = [];
    for (const entry of input[0]) {
        rules.push(parse_rule(entry[0]));
    }
    if (input[1] !== null) {
        rules.push(parse_rule(input[1]));
    }

    return rules;
}

function parse_shape(entry) {
    if (entry[4] === "{") {
        // 4 is the "{", 5 is maybe_whitespace
        // latest is "}", the one before: maybe_whitespace
        return {simple: true, content: parse_steps(entry[6]) };
    }
    return {simple: false, content: parse_rules(entry[4]) };
}

function add_shape(memory, name, shape) {
    if (memory[name] === undefined) {
        memory[name] = [];
    }

    if (shape.simple) {
        memory[name].push({weight: 1, content: shape.content});
    }
    else {
        for(const rule of shape.content) {
            memory[name].push({weight: rule.weight, content: rule.content});
        }
    }
}

function parse_to_ast(input) {
    const result = { startshape: undefined, shapes: {} };

    for (const entry of input) {
        if (entry.length === 0) {
            continue;
        }

        const head = entry[0];

        if (is_whitespace(head)) {
            if (!all(flatten(entry).map((v) => is_whitespace(v)))){
                throw Error(`Unexpected head on ${entry}`);
            }
            continue;
        }

        if (head === "startshape") {
            // Handle startshape
            result.startshape = gather_string(entry[2]);
        }
        else if (head === "shape") {
            // Handle shape
            const name = gather_string(entry[2]);
            const shape = parse_shape(entry);
            add_shape(result.shapes, name, shape);
        }
        else {
            throw Error(`Unexpected head: "${head}"`);
        }
    }

    return result;
}

function parse(content) {
    let tokenized;
    try {
        tokenized = tokenize(content);
    } catch (err) {
        console.error(`Line ${err.location.start.line}, col ${err.location.start.column}: ${err.message}`);
        process.exit(1);
    }

    const ast = parse_to_ast(tokenized);
    return ast;
}

function evaluate(ast, driver) {
    const startshape = ast.startshape;
    console.log("Starting evaluation on:", startshape);

    let to_eval = [ { shape: startshape, properties: BASE_PROPERTIES } ];
    let evaluated_count = 0;

    while (to_eval.length > 0) {
        const order = to_eval.pop();
        evaluated_count++;

        // Show progress
        if (evaluated_count % PROGRESS_UPDATE_INTERVAL === 0) {
            console.log(`${evaluated_count} rules evaluted`);
        }

        const shape = order.shape;
        const properties = order.properties;

        if (shape === 'SQUARE') {
            driver.emit_square(properties);
            continue;
        }

        const entries = ast.shapes[shape];
        if (entries === undefined) {
            throw Error(`Unknown shape: ${shape}`);
        }

        const implementation = select_implementation(entries);
        let new_entries = [];
        for (const entry of implementation) {
            const entry_properties = update_properties(properties, entry.parameters);

            if (entry_properties.size < MINIMUM_SIZE) {
                continue;
            }

            new_entries.push({shape: entry.name, properties: entry_properties });
        }

        // The reason to use an intermediary list, which will get reversed is so
        // elements are executed on the correct order. For this the next entry,
        // the first one on `implementation` has to be the last one on the array.
        new_entries.reverse();
        to_eval = to_eval.concat(new_entries);
    }

    console.log(`Completed: ${evaluated_count} rules evaluated`);
}

function update_properties(base, update) {
    const props = {};
    Object.assign(props, base);

    for (let property of Object.keys(update)) {
        const value = update[property];

        if (PROPERTY_ALIASES[property] !== undefined) {
            property = PROPERTY_ALIASES[property];
        }
        if (props[property] === undefined) {
            throw Error(`Unknown property: ${property}`);
        }

        // X & Y have to be evaluated with "rotate" and "flip" in mind
        if (property === 'x') {
            const rad_rotation = props.rotate / 360 * (2 * Math.PI) ;
            props.x += Math.cos(rad_rotation) * value * props.size;
            props.y += Math.sin(rad_rotation) * value * props.size;
        }
        else if (property === 'y') {
            const rad_rotation = (props.rotate / 360 * (2 * Math.PI)) % 360;
            props.x += Math.sin(rad_rotation) * value * props.size;
            props.y += Math.cos(rad_rotation) * value * props.size;
        }

        else if (PROPORTIONAL_PROPERTIES[property]) {
            props[property] *= value;
        }
        else {
            props[property] += value;
        }
    }

    return props;
}

function random_choose_with_weight(entries, weight_prop) {
    let total_weight = 0;
    // Find out total weight
    for (const entry of entries) {
        total_weight += entry[weight_prop];
    }

    // Select a point on the weight line where this choice occurs
    const selected_weight = Math.random() * total_weight;
    let rem_weight = selected_weight;

    // Find that point
    for (const entry of entries) {
        const entry_weight = entry[weight_prop];
        if (entry_weight >= rem_weight) {
            return entry;
        }
        else {
            rem_weight -= entry_weight;
        }
    }

    throw Error(`Error choosing at random. Remaining ${rem_weight} of ${selected_weight}, for a total of ${total_weight}`);
}

function select_implementation(entries) {
    if (entries.length === 1) {
        return entries[0].content;
    }
    else {
        return random_choose_with_weight(entries, 'weight').content;
    }
}

class CairoDriver {
    constructor() {
        this.width = 500;
        this.height = 500;
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
evaluate(parse(content), driver);

driver.save(process.argv[3]).then(() => process.exit());
