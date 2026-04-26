import pkg from '../package.json' with { type: 'json' };

export default {
  openapi: '3.0.2',
  info: {
    title: 'Raesum',
    version: pkg.version,
    description: 'Raesum API'
  },
  paths: {}
};