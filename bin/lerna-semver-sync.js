#!/usr/bin/env node

const lib = require('../lerna-semver-sync');
const duplicates = lib.sync();
const keys = Object.keys(duplicates);

if (keys.length !== 0) {
    console.log('The following packages have duplicate versions that I can\'t de-duplicate');
    keys.forEach(key => console.log(`${key}: ${duplicates[key].join(', ')}`));
}
