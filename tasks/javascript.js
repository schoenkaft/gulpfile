import config from '../lib/config';

import log from 'fancy-log';
import fs from 'fs';
import merge from 'merge-stream';
import pump from 'pump';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import browserSync from 'browser-sync';
import sourcemaps from 'gulp-sourcemaps';
import browserify from 'browserify';
import babelify from 'babelify';
import watchify from 'watchify';
import esmify from 'esmify';
import { dest, task } from 'gulp';
import { eslint } from './eslint';

/**
 * Bundle JavaScript with Browserify and transpile with Babel.
 */
const bundle = (args, done) => {
  return args.instance.bundle()
    .on('error', err => {
      log.error(err);
      done();
    })
    .pipe(source(args.bundle))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write('./'))
    .pipe(dest(config.get('tasks.javascript.dist')));
};

const getBrowserifyInstance = ({ babelConfig, babelifyConfig, watch }) => {
  const options = {
    entries: config.get('tasks.javascript.main'),
    plugin: [
      [ esmify ],
    ],
    ignoreMissing: true,
  };
  const instance = watch ? watchify(browserify(options)) : browserify(options);
  return instance.transform(babelify, { ...babelConfig, ...babelifyConfig });
};

export const jsbuild = done => {
  if (!config.get('tasks.javascript')) {
    log(`Skipping 'javascript:build' task`);
    return done();
  }
  const task = this;
  const entries = config.get('tasks.javascript.bundles');
  return merge(entries.map(entry => {
    return bundle({
      task: task,
      instance: getBrowserifyInstance({
        babelConfig: entry.babel,
        babelifyConfig: entry.babelify,
      }),
      bundle: entry.bundle,
    }, error => process.exit(1));
  }));
};

export const jswatch = done => {
  if (!config.get('tasks.javascript')) {
    log(`Skipping 'javascript:watch' task`);
    return done();
  }
  const task = this;
  const entries = config.get('tasks.javascript.bundles').filter(entry => entry.watch);
  return merge(entries.map(entry => {
    return bundle({
      task: task,
      instance: getBrowserifyInstance({
        babelConfig: entry.babel,
        babelifyConfig: entry.babelify,
        watch: true,
      }),
      bundle: entry.bundle,
    }, error => done());
  })).on('end', () => {
    browserSync.reload();
    eslint();
  });
};

task('javascript:build', jsbuild);
task('javascript:watch', jswatch);
