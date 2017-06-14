const cwd = process.cwd();
const forEach = require('lodash/forEach');
const fs = require('fs');
const glob = require('glob');
const intersect = require('semver-intersect').intersect;
const path = require('path');
const reduce = require('lodash/reduce');

function applyCommonRange (dependencies, name, commonRange) {
    const range = dependencies[name];
    const newRange = range
        .split('||')
        .map(range => range.trim())
        .map(range => {
            if (isExactRange(range)) {
                return range;
            }

            const majorVersion = getMajorVersion(range);
            return commonRange[majorVersion];
        })
        .join(' || ');

    if (range !== newRange) {
        dependencies[name] = newRange;
        return true;
    }
}

function applyCommonRanges (packagePaths, commonRanges) {
    return packagePaths.reduce((modifiedPackages, packagePath) => {
        let modified = false;
        let pkg = getPackage(packagePath);
        let dependencies = pkg.dependencies || {};

        Object.keys(dependencies || {}).forEach(name => {
            const commonRange = commonRanges[name];
            const didModify = applyCommonRange(dependencies, name, commonRange);
            modified = didModify || modified;
        });

        if (modified) {
            modifiedPackages.push({ packagePath, pkg });
        }

        return modifiedPackages;
    }, []);
}

function getAllDependencies (packagePaths) {
    return packagePaths.reduce((result, packagePath) => {
        const { dependencies } = getPackage(packagePath);
        forEach(dependencies, (range, name) => {
            upsert(result, name, range);
        });
        return result;
    }, {});
}

function getCommonRange (compoundRanges) {
    const majorVersions = compoundRanges.reduce((result, compoundRange) => {
        compoundRange.split('||').map(range => range.trim()).forEach(range => {
            if (isExactRange(range)) {
                return;
            }

            const majorVersion = getMajorVersion(range);
            upsert(result, majorVersion, range);
        });

        return result;
    }, {});

    forEach(majorVersions, (ranges, majorVersion) => {
        majorVersions[majorVersion] = intersect(...ranges);
    });

    return majorVersions;
}

function getCommonRanges (allDependencies) {
    return reduce(allDependencies, (result, ranges, name) => {
        result[name] = getCommonRange(ranges);
        return result;
    }, {});
}

function getMajorVersion (range) {
    return /(\d+)/.exec(range)[0];
}

function getPackage (packagePath) {
    const packageText = fs.readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageText);
    return packageJson;
}

function isExactRange (range) {
    return /^[\d]+\.[\d]+\.[\d]+/.test(range);
}

function sync(opts = {}) {
    const { pattern = 'packages/*/package.json' } = opts;
    const packagePaths = glob.sync(pattern, { cwd });
    const allDependencies = getAllDependencies(packagePaths);
    const commonRanges = getCommonRanges(allDependencies);
    const modifiedPackages = applyCommonRanges(packagePaths, commonRanges);
    modifiedPackages.forEach(({ packagePath, pkg }) => writePackage(packagePath, pkg));
}

function upsert (obj, key, value) {
    if (!obj[key]) {
        obj[key] = [];
    }

    if (!obj[key].includes(value)) {
        obj[key].push(value);
    }

    return obj;
}

function writePackage (packagePath, pkg) {
    const packageText = fs.readFileSync(packagePath, 'utf-8');
    const eof = /\}(?=[^}]*$)([\s]*)/.exec(packageText)[1];
    const indentation = /{\n(\s+)/.exec(packageText)[1];
    const pkgJson = JSON.stringify(pkg, null, indentation) + eof;
    fs.writeFileSync(packagePath, pkgJson, 'utf-8');
}

module.exports.default = sync;

module.exports.applyCommonRange = applyCommonRange;
module.exports.applyCommonRanges = applyCommonRanges;
module.exports.getAllDependencies = getAllDependencies;
module.exports.getCommonRange = getCommonRange;
module.exports.getCommonRanges = getCommonRanges;
module.exports.getMajorVersion = getMajorVersion;
module.exports.getPackage = getPackage;
module.exports.isExactRange = isExactRange;
module.exports.sync = sync;
module.exports.upsert = upsert;
module.exports.writePackage = writePackage;
