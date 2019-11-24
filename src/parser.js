let grammar;
try {
    grammar = require("./grammar");
}
catch(err){
    // We're probably in a browser environment
}

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

function parse_program(content) {
    let tokenized;
    tokenized = tokenize(content);

    const ast = parse_to_ast(tokenized);
    return ast;
}

try {
    module.exports = { parse_program };
}
catch(err){
    // We're probably in a browser environment
}

