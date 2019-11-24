const path = require('path');

module.exports = {
    entry: './src/editor.js',
    output: {
        filename: 'editor.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
