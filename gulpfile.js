////////////////////////////////////////////////////////////////////////////////
// Copyright (c) 2015-2016 Rick Wargo. All Rights Reserved.
//
// Licensed under the MIT License (the "License"). You may not use this file
// except in compliance with the License. A copy of the License is located at
// http://opensource.org/licenses/MIT or in the "LICENSE" file accompanying
// this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
// OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
////////////////////////////////////////////////////////////////////////////////

/*jslint node: true, es6, this:true */
'use strict';

var gulp = require('gulp-help')(require('gulp')),
    jslint = require('gulp-jslint'),
    install = require('gulp-install'),
    zip = require('gulp-zip'),
    vinylzip = require('gulp-vinyl-zip'),
    runSequence = require('run-sequence'),
    awsLambda = require('node-aws-lambda'),
    env = require('gulp-env'),
    vinylPaths = require('vinyl-paths'),
    del = require('del'),
    run = require('gulp-run'),
    shell = require('gulp-shell'),
    spawn = require('child_process').spawn;

var filePaths = {
    lambdaFiles: ['index.js', 'package.json', 'src/**/*.js'],
    lintFiles: ['index.js', 'gulpfile.js', 'lib/**/*.js', 'config/**/*.js', 'test/**/*.js', 'bin/**/*.js', '!lib/playground.js'],
    coverFiles: ['index.js', 'lib/**/*.js', 'config/**/*.js', '!lib/playground.js'],
    unitTestFiles: ['test/**/test_*.js', 'index.js', 'lib/**/*.js', 'config/**/*.js', '!lib/playground.js'],
    coverTestFiles: ['test/**/test_*.js'],
    cleanFiles: ['./skill/lambda/custom/config', './skill/lambda/custom/src', './skill/lambda/custom/index.js', './skill/lambda/custom/package.json'],
    server: '../../alexa-app-root/server' // Change this to reflect where alexa-app-root is installed
};

gulp.task('default', ['help']);

gulp.task('build-lambda-code', 'Process source and create dist.zip file to upload to AWS Lambda **', function (callback) {
    return runSequence(
        // 'lint',
        // 'test-mock',
        // 'test-local',
        'build-zip',
        callback
    );
}, {
    aliases: ['build']
});

gulp.task('build-lambda-code', 'Process source and create dist.zip file to upload to AWS Lambda **', function (callback) {
    return runSequence(
        'build-zip',
        callback
    );
}, {
    aliases: ['build']
});

gulp.task('deploy-skill', 'Package and Deploy skill using AWS CLI **', function (callback) {
    return runSequence(
        'make-skill',
        'node-mods',
        'deploy-aws',
        callback
    );
}, {
    aliases: ['deploy']
});

gulp.task('deploy-aws', 'Deploy skill code and interaction model using AWS CLI **', function () {
    process.chdir('skill');

    const bat = spawn('cmd.exe', ['/c', 'ask deploy']);

    bat.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    return bat.on('exit', (code) => {
        console.log('Child exited with code ${code}');
    });

});

gulp.task('push-lambda-code', 'Process source then upload to AWS Lambda **', function (callback) {
    return runSequence(
        'build-lambda-code',
        //'upload',
        // 'test-lambda',
        callback
    );
}, {
    aliases: ['push']
});

gulp.task('quick-push-lambda-code', 'Process source then upload to AWS Lambda without updating modules **', function (callback) {
    return runSequence(
        'lint',
        'make-dist',
        'test-local',
        'quick-build-zip',
        'upload',
        'test-lambda',
        callback
    );
}, {
    aliases: ['quick', 'quick-push']
});

gulp.task('super-quick-push-lambda-code', 'Process source then upload to AWS Lambda without updating modules **', function (callback) {
    return runSequence(
        'lint',
        'make-dist',
        'quick-build-zip',
        'upload',
        callback
    );
}, {
    aliases: ['super-quick', 'super-quick-push']
});

gulp.task('clean', 'Clean out the dist (lambda skill) folder', function () {
    return gulp.src(filePaths.cleanFiles)
        .pipe(vinylPaths(del));
});

gulp.task('make-skill', 'Compile/move javascript files to skill lambda folder', function (callback) {
    return gulp.src(filePaths.lambdaFiles, {
            base: '.'
        })
        .pipe(gulp.dest('skill/lambda/custom'));
        callback
});

gulp.task('rm-dist-package', 'Removes unnecessary package.json from dist so it does not go to AWS Lambda', function () {
    return gulp.src(['dist/package.json'])
        .pipe(vinylPaths(del));
});

gulp.task('gather-node-mods', 'Install npm packages to dist, ignoring devDependencies', function () {
    return gulp.src('./package.json')
        .pipe(gulp.dest('./skill/lambda/custom/'))
        .pipe(install({
            production: true
        }));
});

gulp.task('node-mods', 'Install npm packages to dist, ignoring devDependencies', function (callback) {
    return runSequence(
        'gather-node-mods',
        //  'rm-dist-package',
        callback
    );
});

gulp.task('create-zip-file', 'Zip the dist directory', function () {
    return gulp.src('dist/**/*')
        .pipe(vinylzip.zip('dist.zip'))
        .pipe(gulp.dest('./'));
}, {
    aliases: ['zip']
});

gulp.task('build-zip', 'Process source and create zip file', function (callback) {
    return runSequence(
        'clean',
        'make-dist',
        'node-mods',
        // 'build-assets',
        'create-zip-file',
        callback
    );
});

gulp.task('quick-build-zip', 'Process source and create zip file (without rebuilding node modules)', function (callback) {
    return runSequence(
        'make-dist',
        'build-assets',
        'create-zip-file',
        callback
    );
});

gulp.task('upload', 'Upload zip file to lambda', function (callback) {
    var config = require('./config/aws-config'),
        appConfig = require('./config/app-config');

    config.functionName = appConfig.functionName;
    config.description = appConfig.description;

    return awsLambda.deploy('./dist.zip', config, callback);
});