const expect = require('chai').expect;
const fs = require('fs');
const glob = require('glob');
const sinon = require('sinon');
const {
    applyCommonRange,
    applyCommonRanges,
    getAllDependencies,
    getCommonRange,
    getCommonRanges,
    getMajorVersion,
    getPackage,
    isExactRange,
    sync,
    upsert,
    writePackage
} = require('../../lerna-semver-sync');

describe('applyCommonRange', () => {
    it('should overwrite the dependency semver with the common range', () => {
        const dependencies = {
            lodash: '^4.0.0'
        };
        applyCommonRange(dependencies, 'lodash', { '4': '^4.2.33' });
        expect(dependencies.lodash).to.equal('^4.2.33');
    });
    it('should overwrite each major version if there are "||" separated major versions', () => {
        const dependencies = {
            react: '0.14.x || ^15.0.0'
        };
        applyCommonRange(dependencies, 'react', { '0': '~0.14.3', '15': '^15.5.0' });
        expect(dependencies.react).to.equal('~0.14.3 || ^15.5.0');
    });
    it('should overwrite each major version if there are "||" separated major versions', () => {
        const dependencies = {
            react: '0.14.x || ^15.0.0'
        };
        applyCommonRange(dependencies, 'react', { '0': '~0.14.3', '15': '^15.5.0' });
        expect(dependencies.react).to.equal('~0.14.3 || ^15.5.0');
    });
    it('should preserve any exact ranges', () => {
        const dependencies = {
            react: '^15.0.0 || 16.0.0-alpha.13'
        };
        applyCommonRange(dependencies, 'react', { '0': '~0.14.3', '15': '^15.5.0' });
        expect(dependencies.react).to.equal('^15.5.0 || 16.0.0-alpha.13');
    });
});

describe('applyCommonRanges', () => {
    before(() => {
        sinon.stub(fs, 'readFileSync');
    });

    after(() => {
        fs.readFileSync.restore();
    });

    it('return a list of modified packages and paths', () => {
        fs.readFileSync.onCall(0).returns(JSON.stringify({
            dependencies: {
                lodash: '^4.1.234',
                react: '0.14.x || ^15.5.0'
            }
        }));
        fs.readFileSync.onCall(1).returns(JSON.stringify({
            dependencies: {
                lodash: '^4.2.33'
            }
        }));
        fs.readFileSync.onCall(2).returns(JSON.stringify({
            dependencies: {
                lodash: '^4.0.0',
                react: '~0.14.3 || ^15.0.0'
            }
        }));

        const packagePaths = ['packages/foo/package.json', 'packages/bar/package.json', 'packages/baz/package.json'];
        const commonRanges = {
            lodash: {
                '4': '^4.2.33'
            },
            react: {
                '0': '~0.14.3',
                '15': '~15.7.0'
            }
        };
        const modifiedPackages = applyCommonRanges(packagePaths, commonRanges);
        expect(modifiedPackages).to.deep.equal([
            {
                packagePath: 'packages/foo/package.json',
                pkg: {
                    dependencies: {
                        lodash: '^4.2.33',
                        react: '~0.14.3 || ~15.7.0'
                    }
                }
            },
            {
                packagePath: 'packages/baz/package.json',
                pkg: {
                    dependencies: {
                        lodash: '^4.2.33',
                        react: '~0.14.3 || ~15.7.0'
                    }
                }
            }
        ]);
    });
});

describe('getAllDependencies', () => {
    before(() => {
        sinon.stub(fs, 'readFileSync');
    });

    after(() => {
        fs.readFileSync.restore();
    });

    it('should get all dependencies from multiple packages', () => {
        fs.readFileSync.onCall(0).returns(JSON.stringify({
            dependencies: {
                lodash: '^4.1.234',
                react: '0.14.x || ^15.5.0'
            }
        }));
        fs.readFileSync.onCall(1).returns(JSON.stringify({
            dependencies: {
                lodash: '^4.0.0',
                react: '~0.14.3 || ^15.0.0'
            }
        }));
        const packagePaths = ['packages/foo/package.json', 'packages/bar/package.json'];
        const result = getAllDependencies(packagePaths);
        expect(result).to.deep.equal({
            lodash: [
                '^4.1.234',
                '^4.0.0'
            ],
            react: [
                '0.14.x || ^15.5.0',
                '~0.14.3 || ^15.0.0'
            ]
        });
    });
});

describe('getCommonRange', () => {
    it('should return the common semver for each major version', () => {
        const result = getCommonRange(['0.14.x || ^15.5.0', '~0.14.3 || ^15.0.0']);
        expect(result).to.deep.equal({
            '0': '^0.14.3',
            '15': '^15.5.0'
        });
    });
    it('should still return the major version keyed format for one version', () => {
        const result = getCommonRange(['^15.5.0', '~15.7.0', '^15.0.0']);
        expect(result).to.deep.equal({
            '15': '~15.7.0'
        });
    });
    it('should not return exact ranges', () => {
        const result = getCommonRange(['^15.5.0', '~15.7.0', '16.0.0-alpha.13']);
        expect(result).to.deep.equal({
            '15': '~15.7.0'
        });
    });
});

describe('getCommonRanges', () => {
    it('should return the common version for each package', () => {
        const result = getCommonRanges({
            lodash: ['^4.0.0', '^4.1.234', '^4.2.33', '^4.1.0'],
            react: ['^15.5.0', '~15.7.0', '^15.0.0']
        });
        expect(result).to.deep.equal({
            lodash: {
                '4': '^4.2.33'
            },
            react: {
                '15': '~15.7.0'
            }
        });
    });
});

describe('getMajorVersion', () => {
    it('should return the major version from a semver', () => {
        expect(getMajorVersion('^1.0.0')).to.equal('1');
        expect(getMajorVersion('~2.0.0')).to.equal('2');
        expect(getMajorVersion('3')).to.equal('3');
        expect(getMajorVersion('40.0.0')).to.equal('40');
    });
});

describe('getPackage', () => {
    before(() => {
        sinon.stub(fs, 'readFileSync');
    });

    after(() => {
        fs.readFileSync.restore();
    });

    it('should return the package json as an object', () => {
        fs.readFileSync.returns(JSON.stringify({foo: 'bar'}));
        const pkg = getPackage('packages/foo/package.json');
        expect(typeof pkg).to.equal('object');
    });
});

describe('isExactRange', () => {
    it('should return true for an exact range', () => {
        expect(isExactRange('4.0.0')).to.equal(true);
    });
    it('should return false for an inexact range', () => {
        expect(isExactRange('^4.0.0')).to.equal(false);
        expect(isExactRange('~4.0.0')).to.equal(false);
        expect(isExactRange('4')).to.equal(false);
    });
});

describe('sync', () => {
    before(() => {
        sinon.stub(glob, 'sync');
        sinon.stub(fs, 'readFileSync');
        sinon.stub(fs, 'writeFileSync');
    });

    after(() => {
        glob.sync.restore();
        fs.readFileSync.restore();
        fs.writeFileSync.restore();
    });

    it('writes updated packages to disk', () => {
        const packagePaths = ['packages/foo/package.json', 'packages/bar/package.json', 'packages/baz/package.json'];
        glob.sync.returns(packagePaths);
        fs.readFileSync.withArgs('package.json').returns(JSON.stringify({
            devDependencies: {
                lodash: '^4.1.665'
            }
        }, null, 2));
        fs.readFileSync.withArgs('packages/foo/package.json').returns(JSON.stringify({
            dependencies: {
                lodash: '^4.1.234',
                react: '0.14.x || ^15.5.0'
            }
        }, null, 2));
        fs.readFileSync.withArgs('packages/bar/package.json').returns(JSON.stringify({
            dependencies: {
                lodash: '^4.2.33'
            }
        }, null, 2));
        fs.readFileSync.withArgs('packages/baz/package.json').returns(JSON.stringify({
            dependencies: {
                lodash: '^4.0.0',
                react: '^0.14.3 || ^15.0.0'
            }
        }, null, 2));

        sync();

        expect(fs.writeFileSync.firstCall.args).to.deep.equal([
            'packages/foo/package.json',
            JSON.stringify({
                dependencies: {
                    lodash: '^4.2.33',
                    react: '^0.14.3 || ^15.5.0'
                }
            }, null, 2),
            'utf-8'
        ]);
    });
});

describe('upsert', () => {
    it('should create an array for the key if it does not exist', () => {
        const obj = {};
        upsert(obj, 'foo', 'bar');
        expect(obj).to.deep.equal({
            foo: ['bar']
        });
    });
    it('should append unique values to the existing array if present', () => {
        const obj = {};
        upsert(obj, 'foo', 'bar');
        upsert(obj, 'foo', 'baz');
        upsert(obj, 'foo', 'bar');
        expect(obj).to.deep.equal({
            foo: ['bar', 'baz']
        });
    });
});

describe('writePackage', () => {
    before(() => {
        sinon.stub(fs, 'readFileSync');
        sinon.stub(fs, 'writeFileSync');
    });

    after(() => {
        fs.readFileSync.restore();
        fs.writeFileSync.restore();
    });

    it('should write the package with the correct indentation', () => {
        const pkg = {version:'1.0.0'};
        fs.readFileSync.returns(JSON.stringify(pkg, null, 6));
        writePackage(null, pkg);
        const text = fs.writeFileSync.lastCall.args[1];
        const spaces = /{\n([\s]+)/.exec(text)[1].length;
        expect(spaces).to.equal(6);
    });
    it('should write the package with a newline at the end if it had one', () => {
        const pkg = {version:'1.0.0'};
        fs.readFileSync.returns(JSON.stringify(pkg, null, 6) + '\n');
        writePackage(null, pkg);
        const text = fs.writeFileSync.lastCall.args[1];
        const eof = text.slice(-1);
        expect(eof).to.equal('\n');
    });
});
