/// <binding BeforeBuild='build' />
/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */
/// <binding BeforeBuild='build' />
var gulp = require('gulp');
var merge = require('merge2');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglifyjs');
var rename = require("gulp-rename");
var runSequence = require("run-sequence");
var ts = require("gulp-typescript");
var less = require("gulp-less");
var minifyCSS = require("gulp-minify-css");
var typedoc = require("gulp-typedoc");
var jasmineBrowser = require('gulp-jasmine-browser');
var spritesmith = require('gulp.spritesmith');
var deploy      = require('gulp-gh-pages');
var git = require('gulp-git');
var exec = require('child_process').exec;
var tslint = require('gulp-tslint');
var download = require("gulp-download");
var fs = require("fs");
var gutil = require('gulp-util');
// Command line option:
//  --fatal=[warning|error|off]
var fatalLevel = require('yargs').argv.fatal;

var jsUglifyOptions = {
    compress: {
        drop_console: true,
        pure_funcs: [
            "debug.assertValue",
            "debug.assertFail",
            "debug.assert",
            "debug.assertAnyValue"
        ],
        warnings: false,
        dead_code: true,
        sequences: true,
        properties: true,
        conditionals: true,
        comparisons: true,
        booleans: true,
        cascade: true,
        unused: true,
        loops: true,
        if_return: true,
        join_vars: true,
        global_defs: {
            "DEBUG": false
        }
    }
};

gulp.task("tslint", function(){
    return gulp.src([
        "src/Clients/VisualsCommon/**/*.ts",
        "!src/Clients/VisualsCommon*/obj/*.*",
        "!src/Clients/VisualsCommon/**/*.d.ts",

        "src/Clients/VisualsData/**/*.ts",
        "!src/Clients/VisualsData*/obj/*.*",
        "!src/Clients/VisualsData/**/*.d.ts",

        "src/Clients/Visuals/**/*.ts",
        "!src/Clients/Visuals*/obj/*.*",
        "!src/Clients/Visuals/**/*.d.ts",

        "src/Clients/PowerBIVisualsTests/**/*.ts",
        "!src/Clients/PowerBIVisualsTests*/obj/*.*",
        "!src/Clients/PowerBIVisualsTests/**/*.d.ts",

        "src/Clients/PowerBIVisualsPlayground/**/*.ts",
        "!src/Clients/PowerBIVisualsPlayground*/obj/*.*",
        "!src/Clients/PowerBIVisualsPlayground/**/*.d.ts",
    ])
        .pipe(tslint())
        .pipe(tslint.report("verbose"));
});

function buildProject(projectPath, outFileName) {
    var paths = [
        projectPath + "/**/*.ts",
        "!" + projectPath + "/obj/**",
        "!" + projectPath + "/**/*.d.ts"
    ];

    var tscReluts = gulp.src(paths)
        .pipe(ts({
            sortOutput: true,
            target: "ES5",
            declarationFiles: true,
            out: projectPath + "/obj/" + outFileName + ".js"
        }));

    return merge([
        tscReluts.js.pipe(gulp.dest("./")),
        tscReluts.dts.pipe(gulp.dest("./")),
        tscReluts.js
            .pipe(uglify(outFileName + ".min.js", jsUglifyOptions))
            .pipe(gulp.dest(projectPath + "/obj"))
    ]);
}

gulp.task("build_visuals_common", function () {
    return buildProject("src/Clients/VisualsCommon", "VisualsCommon");
});

gulp.task("build_visuals_data", function () {
    return buildProject("src/Clients/VisualsData", "VisualsData");
});

gulp.task("build_visuals_sprite", function () {
    var spriteData = gulp.src("src/Clients/Visuals/images/sprite-src/*.png").pipe(spritesmith({
        imgName: "images/visuals.sprites.png",
        cssName: "styles/sprites.less"
    }));

    return spriteData.pipe(gulp.dest("src/Clients/Visuals/"));
});

gulp.task("build_visuals_less", function () {
    return gulp.src("src/Clients/Visuals/styles/visuals.less")
        .pipe(less())
        .pipe(minifyCSS())
        .pipe(rename("visuals.min.css"))
        .pipe(gulp.dest("build/styles"));
});

gulp.task("build_visuals_project", function () {
    return buildProject("src/Clients/Visuals", "Visuals");
});

gulp.task("build_visuals", function (callback) {
    runSequence("build_visuals_project", "build_visuals_sprite", "build_visuals_less", callback);
});

gulp.task("build_visuals_tests", function () {
    return buildProject("src/Clients/PowerBIVisualsTests", "PowerBIVisualsTests");
});

gulp.task("copy_dependencies_visuals_playground", function () {
    return gulp.src([
        "build/scripts/powerbi-visuals.all.min.js",
        "build/styles/visuals.min.css",
        "src/Clients/PowerBIVisualsPlayground/obj/PowerBIVisualsPlayground.js"
    ])
        .pipe(gulp.dest("src/Clients/PowerBIVisualsPlayground"));
});

gulp.task("build_visuals_playground_project", function () {
    return buildProject("src/Clients/PowerBIVisualsPlayground", "PowerBIVisualsPlayground");
});

gulp.task("build_visuals_playground", function (callback) {
    runSequence(
        "build_visuals_playground_project",
        "copy_dependencies_visuals_playground",
        callback);
});

gulp.task("combine_internal_js", function () {
    return gulp.src([
        "src/Clients/VisualsCommon/obj/VisualsCommon.js",
        "src/Clients/VisualsData/obj/VisualsData.js",
        "src/Clients/Visuals/obj/Visuals.js"
    ])
        .pipe(concat("powerbi-visuals.js"))
        .pipe(uglify("powerbi-visuals.min.js", jsUglifyOptions))
        .pipe(gulp.dest("build/scripts"));
});

gulp.task("combine_internal_d_ts", function () {
    return gulp.src([
        "src/Clients/VisualsCommon/obj/VisualsCommon.d.ts",
        "src/Clients/VisualsData/obj/VisualsData.d.ts"
    ])
        .pipe(concat("powerbi-visuals.d.ts"))
        .pipe(gulp.dest("build"));
});

gulp.task("combine_external_js", function () {
    return gulp.src([
        "src/Clients/Externals/ThirdPartyIP/D3/*.min.js",
        "src/Clients/Externals/ThirdPartyIP/GlobalizeJS/globalize.min.js",
        "src/Clients/Externals/ThirdPartyIP/GlobalizeJS/globalize.culture.en-US.js",
        "src/Clients/Externals/ThirdPartyIP/JQuery/**/*.min.js",
        "src/Clients/Externals/ThirdPartyIP/LoDash/*.min.js"
    ])
        .pipe(concat("externals.min.js"))
        .pipe(gulp.dest("build/scripts"));
});

gulp.task("combine_all", function () {
    return gulp.src([
        "build/scripts/externals.min.js",
        "build/scripts/powerbi-visuals.min.js",
    ])
        .pipe(concat("powerbi-visuals.all.min.js"))
        .pipe(gulp.dest("build/scripts"));
});

gulp.task("build_projects", function (callback) {
    runSequence(
        "build_visuals_common",
        "build_visuals_data",
        "build_visuals",
        "combine_internal_js",
        "combine_external_js",
        "combine_all",
        "build_visuals_playground",
        "build_visuals_tests",
        callback);
});

/** Download dependencies */
gulp.task('dependencies', function (callback) {
    fs.exists('src/Clients/Externals/ThirdPartyIP/JasmineJQuery/jasmine-jquery.js', function (exists) {
        if (!exists) {
            console.log('Jasmine test dependency missing. Downloading dependency.');
            download('https://raw.github.com/velesin/jasmine-jquery/master/lib/jasmine-jquery.js')
                .pipe(gulp.dest("src/Clients/Externals/ThirdPartyIP/JasmineJQuery"))
                .on("end", callback);
        }
        else {
            console.log('Jasmine test dependency exists.');
            callback();
        }
    });
});

gulp.task("build", function (callback) {
    runSequence(
        "tslint",
        "build_projects",
        callback);
});

/**
 * Tests.
 */

gulp.task("copy_dependencies_visuals_tests", function () {
    return gulp.src([
        "build/scripts/powerbi-visuals.all.min.js",
        "src/Clients/PowerBIVisualsTests/obj/PowerBIVisualsTests.js"
    ])
        .pipe(gulp.dest("VisualsTests"));
});

gulp.task("run_tests", function () {
    return gulp.src([
        "src/Clients/externals/ThirdPartyIP/JQuery/2.1.3/jquery.min.js",
        "src/Clients/externals/ThirdPartyIP/D3/d3.min.js",
        "src/Clients/externals/ThirdPartyIP/JasmineJQuery/jasmine-jquery.js",
        "src/Clients/externals/ThirdPartyIP/LoDash/lodash.min.js",
        "src/Clients/externals/ThirdPartyIP/GlobalizeJS/globalize.min.js",
        "src/Clients/externals/ThirdPartyIP/MomentJS/moment.min.js",
        "src/Clients/externals/ThirdPartyIP/Velocity/velocity.min.js",
        "src/Clients/externals/ThirdPartyIP/Velocity/velocity.ui.min.js",
        "src/Clients/externals/ThirdPartyIP/QuillJS/quill.min.js",

        "VisualsTests/powerbi-visuals.all.min.js",
        "VisualsTests/PowerBIVisualsTests.js"
    ])
        .pipe(jasmineBrowser.specRunner({console: true}))
        .pipe(jasmineBrowser.headless());
});

gulp.task("test", function (callback) {
    runSequence(
        "build_projects",
        "dependencies",
        "copy_dependencies_visuals_tests",
        "run_tests",
        callback);
});

/**
 * Type DOC.
 */

gulp.task("createdocs", function () {
    return gulp
        .src([
            "src/Clients/Visuals/**/*.ts",
            "!src/Clients/Visuals*/obj/*.*"
        ])
            .pipe(typedoc({
            // Output options (see typedoc docs)
                target: "ES5",
                //includeDeclarations: true,
                mode: "file",
            // TypeDoc options (see typedoc docs)
                out: "docs",
                json: "docs/to/file.json",

                // TypeDoc options (see typedoc docs)
                name: "PowerBI-Visuals",
                ignoreCompilerErrors: true,
                version: true,
            }));
});

gulp.task("gendocs", function (callback) {
    runSequence(
        "build",
        "combine_internal_d_ts",
        "createdocs",
        callback);
});

/**
 * Push deploy to gh-pages
 */

gulp.task('deploy', function () {
    return gulp.src("./docs/**/*")
        .pipe(deploy())
});

/**
 * Git tasks.
 */
// Run git pull
// remote is the remote repo
// branch is the remote branch to pull from
gulp.task('pull_rebase', function () {
    return  git.pull('origin', 'master', {args: '--rebase'}, function (err) {
        if (err) throw err;
    });
});

var ERROR_LEVELS = ['error', 'warning'];

// Return true if the given level is equal to or more severe than
// the configured fatality error level.
// If the fatalLevel is 'off', then this will always return false.
// Defaults the fatalLevel to 'error'.
function isFatal(level) {
   return ERROR_LEVELS.indexOf(level) <= ERROR_LEVELS.indexOf(fatalLevel || 'error');
}

// Handle an error based on its severity level.
// Log all levels, and exit the process for fatal levels.
function handleError(level, error) {
   gutil.log('I\'ve got error: ' + error.message+' Now thinking, what to do with it...');
   if (isFatal(level)) {
      process.exit(1);
   }
}

// Convenience handler for error-level errors.
function onError(error) { handleError.call(this, 'error', error);}

gulp.task('checkout_gh_pages', function () {
    fs.exists('.docs', function (exists) {
        if (!exists) {
            console.log('cloning the repo/gh-pages into .docs');
              //return run("git clone https://github.com/.../test_hub --branch gh-pages --single-branch .docs").exec() 
    		 //.pipe(gulp.dest('output')); 
        }
        else {
           return console.log('gh-pages repo exists in .docs folder.');
        }
    });
});

gulp.task('pull_gh_pages', function () {
	exec('git -C .docs pull', function (err, stdout, stderr) {console.log(stdout);console.log(stderr);});
    //return  run("git -C .docs pull").exec().pipe(gulp.dest('../output'));
});

 gulp.task('copy_docs', function () {
        return gulp.src(['docs/**/*'])
          .pipe(gulp.dest('.docs'));
    });



gulp.task('add_all_gh_pages', function (cb) {
  exec('git -C .docs add --all', function (err, stdout, stderr) {console.log(stdout);console.log(stderr);cb(err);});
});

var del = require('del');
   var doCommit = false;
//logCapture = require('gulp-log-capture');
gulp.task('commit_gh_pages', function (callback) {


	exec('git -C .docs status > node_modules/statuscheck.txt', function (err, stdout, stderr) {console.log(stdout);console.log(stderr);});

setTimeout(function() {

  fs.readFile("node_modules/statuscheck.txt", "utf-8", function(err, _data) {
      	doCommit = _data.indexOf('nothing to commit')<0;
	
	del(['node_modules/statuscheck.txt'], function (err, paths) {
	    //console.log('Deleted files/folders:\n', paths.join('\n'));
		});
		//console.log('Original git message: \n '+_data+ '\n end of original git message');
		if(err)
			console.log('Command exec ERROR: \n '+err);

console.log(doCommit);
	if(doCommit){
		 console.log('Commiting changes');
		exec('git -C .docs commit -m \'automatic-documentation-update\'', function (err, stdout, stderr) {console.log(stdout);console.log(stderr);callback(err);});
  	callback();
  }
	else
	{
	 console.log('Nothing to commit');
	 return true;
	}

    });
	
}, 10000);
 // return false;			 
});

gulp.task('push_gh_pages', function (cb) {
	exec('git -C .docs push', function (err, stdout, stderr) {console.log(stdout);console.log(stderr);cb(err);});
});

gulp.task('git_update_gh_pages', function(cb) {
    runSequence('pull_rebase',"build_projects","combine_internal_d_ts",'checkout_gh_pages', 'pull_gh_pages'
    	, "createdocs", 'copy_docs','add_all_gh_pages','commit_gh_pages', 'push_gh_pages',cb);
});

/**
 * Default task
 */
gulp.task('default', ['build']);
