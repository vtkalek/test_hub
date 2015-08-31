var gulp = require('gulp');
var runSequence = require("run-sequence");
var minimist = require("minimist");

var isDebug = false;
var cliOptions = {
    string: [
        "files",
        "openInBrowser"
    ],
    boolean: "debug",
    alias: {
        files: "f",
        debug: "d",
        openInBrowser: ["o", "oib"]
    }
};

var cliArguments = minimist(process.argv.slice(2), cliOptions);

isDebug = Boolean(cliArguments.debug);

gulp.task("build_visuals", function (callback) {
    runSequence("build_visuals_project", "build_visuals_sprite", "build_visuals_less", callback);
});

gulp.task("build_projects", function (callback) {
    runSequence(
        "build_visuals_common",
        "build_visuals_data",
        "build_visuals",
        "combine_internal_js",
        "combine_external_js",
        //"combine_all",
        "build_visuals_playground",
        callback);
});

//TODO: delete if it is not used.
gulp.task("build_combine", function (callback) {
    runSequence(
        "tslint",
//         "combine_internal_js",
//         "combine_external_js",
        // "combine_all",
        "build_visuals_playground_project",
        callback);
});

gulp.task("build_visuals_playground", function (callback) {
    runSequence(
        "build_visuals_playground_project",
        "copy_internal_dependencies_visuals_playground",
        callback);
});

gulp.task('build', function (callback) {
    if(isDebug)
    runSequence(
        "build_projects",
        callback);
else
    runSequence(
        "tslint",
        "build_projects",
        callback);
});

gulp.task('build_debug', function (callback) {
    isDebug = true;
    runSequence(
        "build_projects",
        callback);
});

gulp.task('default', ['build_debug']);