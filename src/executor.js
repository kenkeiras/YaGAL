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

function evaluate(ast, driver, options) {
    const early_stop = options.early_stop || false;

    const startshape = ast.startshape;
    console.log("Starting evaluation on:", startshape);

    let to_eval = [ { shape: startshape, properties: BASE_PROPERTIES } ];
    let evaluated_count = 0;
    const start_time = new Date();

    while (to_eval.length > 0) {
        const order = to_eval.pop();
        evaluated_count++;

        // Show progress
        if (evaluated_count % PROGRESS_UPDATE_INTERVAL === 0) {
            if (early_stop !== false) {
                const time_spent = new Date() - start_time;
                if (time_spent >= early_stop) {
                    console.error(`Triggering early stop after ${time_spent}ms`)
                    return;
                }
            }
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

    console.log(`DONE: ${evaluated_count} rules in ${new Date() - start_time}ms`);
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

try {
    module.exports = { evaluate };
}
catch(err){
    // We're probably in a browser environment
}
