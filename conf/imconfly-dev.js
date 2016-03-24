'use strict';

var path = require('path');

module.exports = {
  storage_root: path.normalize(`${__dirname}/../STORAGE`),
  port: 9988,
  containers: {
    nodejs: {
      root: 'https://nodejs.org/static/images/logos',
      transforms: {
        square_200x200: 'convert "{source}" -resize 200x200 -background red -gravity center -extent 200x200 "{destination}"'
      }
    }
  }
};
