const grammar = require("./cfdg-grammar");
const fs = require("fs");

const content = fs.readFileSync(process.argv[2]).toString();

function remove_comments(input) {
    const result = (input
                    .split(/\n/).map((v, _i, _a) => {
                        return v.split(/\/\//)[0];
                    })
                    .join('\n'));
    return result;
}

let parsed;
try {
    parsed = grammar.parse(remove_comments(content));
} catch (err) {
    console.error(`Line ${err.location.start.line}, col ${err.location.start.column}: ${err.message}`);
    process.exit(1);
}

console.log(JSON.stringify(parsed, null, 4));
