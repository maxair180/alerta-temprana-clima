Object.defineProperty(process.versions, 'node', { value: '24.15.0', writable: true, configurable: true });
process.argv = [process.argv[0], process.argv[1], 'build'];
require('@angular/cli/bin/ng.js');
