gulp = require 'gulp'
coffee = require 'gulp-coffee'

gulp.task 'compile', ->
	gulp.src('src/**/*.coffee')
		.pipe coffee()
		.pipe gulp.dest('lib')

gulp.task 'example-html', ->
	digestVersioning = require './lib/index'
	gulp.src(['example/dest/*.html'])
		.pipe digestVersioning
			digestLength: 8,
			appendToFileName: true
			basePath: 'example/src'
			destPath: 'example/dest'
			fixUrl: (fileName, relPath, basePath) ->
				if !(/^\//).test fileName
					filePath = path.resolve path.dirname(relPath), fileName
					fileName = '/' + path.relative(basePath, filePath)
				'http://webyom.org' + fileName
		.pipe gulp.dest('example/dest')

gulp.task 'example', ['example-html'], ->
	digestVersioning = require './lib/index'
	gulp.src(['example/dest/*.css'])
		.pipe digestVersioning
			digestLength: 8,
			appendToFileName: true
			basePath: 'example/src'
			destPath: 'example/dest'
			fixUrl: (fileName, relPath, basePath) ->
				if !(/^\//).test fileName
					filePath = path.resolve path.dirname(relPath), fileName
					fileName = '/' + path.relative(basePath, filePath)
				'http://webyom.org' + fileName
		.pipe gulp.dest('example/dest')

gulp.task 'default', ['compile']