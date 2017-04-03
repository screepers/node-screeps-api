const gulp = require('gulp');
const browserify = require('browserify');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');
const rename = require('gulp-rename');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');

gulp.task('default', ['babel','browser','uglify']);

gulp.task('babel', ()=>{
	return gulp.src('src/**/*.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('build'));
});

gulp.task('browser',['babel'], ()=>{
	return browserify('./build/index.js',{
			standalone: 'ScreepsAPI',
		})
		.ignore('bufferutil')
		.ignore('utf-8-validate')
		.bundle()
		.pipe(source('screepsapi.js'))
		.pipe(buffer())
		.pipe(gulp.dest('./dist/'))
})

gulp.task('uglify',['browser'], ()=>{
	return gulp.src(['dist/*.js','!dist/*.min.js'])
		.pipe(uglify())
		.pipe(rename({ suffix: '.min' }))
		.pipe(gulp.dest('./dist/'))
	})