const path = require('path');

module.exports = {
    entry: './src/cli.js',
    output: {
        filename: 'cli.js',
        path: path.resolve(__dirname, 'dist'),
    },
    node: {
        fs: "empty"
    },
};
