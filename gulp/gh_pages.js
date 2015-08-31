var runSequence = require("run-sequence");
var gulp = require('gulp');
var fs = require("fs");
var git = require('gulp-git');
var exec = require('child_process').exec;
var del = require('del');

gulp.task('pull_rebase', function () {
    return  git.pull('origin', 'master', {args: '--rebase'}, function (err) {
        if (err)
            throw err;
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
    gutil.log('I\'ve got error: ' + error.message + ' Now thinking, what to do with it...');
    if (isFatal(level))
        process.exit(1);
}

// Convenience handler for error-level errors.
function onError(error) {
    handleError.call(this, 'error', error);
}

gulp.task('checkout_gh_pages', function () {
    fs.exists('.docs', function (exists) {
        if (!exists) {
            console.log('cloning the repo/gh-pages into .docs');
        } else {
            return console.log('gh-pages repo exists in .docs folder.');
        }
    });
});

gulp.task('pull_gh_pages', function () {
    exec('git -C .docs pull', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
    });
});
gulp.task('copy_docs', function () {
    return gulp.src(['docs/**/*']).pipe(gulp.dest('.docs'));
});
gulp.task('add_all_gh_pages', function (cb) {
    exec('git -C .docs add --all', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

var doCommit = false;
gulp.task('commit_gh_pages', function (callback) {

    exec('git -C .docs status > node_modules/statuscheck.txt', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
    });

    setTimeout(function () {

        fs.readFile("node_modules/statuscheck.txt", "utf-8", function (err, _data) {
            doCommit = _data.indexOf('nothing to commit') < 0;
            del(['node_modules/statuscheck.txt'], function (err, paths) {
            });
            //console.log('Original git message: \n '+_data+ '\n end of original git message');
            if (err)
                console.log('Command exec ERROR: \n ' + err);

            if (doCommit) {
                console.log('Commiting changes');
                exec('git -C .docs commit -m \'automatic-documentation-update\'', function (err, stdout, stderr) {
                    console.log(stdout);
                    console.log(stderr);
                    callback(err);
                });
            } else {
                console.log('Nothing to commit');
                return true;
            }
        });
    }, 10000);
});
gulp.task('push_gh_pages', function (cb) {
    exec('git -C .docs push', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});
gulp.task('git_update_gh_pages', function (cb) {
    runSequence(
        "pull_rebase",
        "build_projects",
        "combine_internal_d_ts",
        "checkout_gh_pages",
        "pull_gh_pages",
        "createdocs",
        "copy_docs",
        "add_all_gh_pages",
        "commit_gh_pages",
        "push_gh_pages",
        cb);
});