import { isDevelopment } from '../lib/env';
import { log } from '../lib/log';
import config from '../lib/config';
import gulp from 'gulp';
import pump from 'pump';
import runSequence from 'run-sequence';

import filter from 'gulp-filter';
import rev from 'gulp-rev';
import revDeleteOriginal from 'gulp-rev-delete-original';
import revReplace from 'gulp-rev-replace';

const manifestDir = config.has('tasks.revision.manifest.directory') ?
  config.get('tasks.revision.manifest.directory') : config.get('paths.dist');
const manifestFile = config.has('tasks.revision.manifest.file') ?
    config.get('tasks.revision.manifest.file') : 'assets.json';
const manifestFullPath = `${manifestDir}/${manifestFile}`;

/**
 * Add revision hash behind filename so we can cache assets forever
 */
gulp.task('revision:hash', (done) => {
  const cssFilter = filter('**/*.css', { restore: true });
  const jsFilter = filter('**/*.js', { restore: true });
  const imgFilter = filter('**/*.{png,gif,jpg,jpeg,svg}', { restore: true });

  pump([
    gulp.src([
      `${config.get('tasks.sass.dist')}/*.css`,
      `${config.get('tasks.javascript.dist')}/*.js`,
      `${config.get('tasks.images.dist')}/**/*.{gif,jpg,jpeg,svg}`,
    ]),
    rev(),
    revDeleteOriginal(),
    cssFilter,
    gulp.dest(config.get('tasks.sass.dist')),
    cssFilter.restore,
    jsFilter,
    gulp.dest(config.get('tasks.javascript.dist')),
    jsFilter.restore,
    imgFilter,
    gulp.dest(config.get('tasks.images.dist')),
    imgFilter.restore,
    rev.manifest(manifestFile),
    gulp.dest(manifestDir),
  ], done);
});

/*
 * Replace image and font urls in css files
 */
gulp.task('revision:replace:css', (done) => {
  pump([
    gulp.src(`${config.get('tasks.sass.dist')}/*.css`),
    revReplace({ manifest: gulp.src(manifestFullPath) }),
    gulp.dest(config.get('tasks.sass.dist')),
  ], done);
});

/**
 * Replace image and font urls in js files
 */
gulp.task('revision:replace:js', (done) => {
  pump([
    gulp.src(`${config.get('tasks.javascript.dist')}/*.js`),
    revReplace({ manifest: gulp.src(manifestFullPath) }),
    gulp.dest(config.get('tasks.javascript.dist')),
  ], done);
}) ;

/**
 * Revision tasks wrapper
 */
gulp.task('revision', (done) => {
  if (isDevelopment) {
    log('revision: skipping for development');
    return done();
  }
  runSequence(
    'revision:hash',
    'revision:replace:css',
    'revision:replace:js',
    done
  );
});
