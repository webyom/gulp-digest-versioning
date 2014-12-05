fs = require 'fs'
path = require 'path'
crypto = require 'crypto'
gutil = require 'gulp-util'
through = require 'through2'

module.exports = (opt = {}) ->
	through.obj (file, enc, next) ->
		return @emit 'error', new gutil.PluginError('gulp-digest-versioning', 'File can\'t be null') if file.isNull()
		return @emit 'error', new gutil.PluginError('gulp-digest-versioning', 'Streams not supported') if file.isStream()
		content = file.contents.toString()
		if path.extname(file.path) is '.css'
			content = content.replace /url\(\s*([^)]+)\s*\)/mg, (full, fileName) ->
				fileName = fileName.replace /['"]/g, ''
				fileName = fileName.replace /(#|\?).*$/, ''
				if (/^(https?:|\/\/)/).test fileName
					return full
				else
					if (/^\//).test fileName
						if opt.basePath
							filePath = opt.basePath + fileName
						else
							return full
					else
						filePath = path.resolve path.dirname(file.path), fileName
					try
						if fs.existsSync filePath
							md5 = crypto.createHash('md5')
								.update(fs.readFileSync(filePath))
								.digest('hex')
							if opt.appendToFileName
								tmp = full.split('.')
								tmp.splice(-1, 0, md5)
								return 'url(' + tmp.join('.') + ')'
							else
								return "url(#{fileName}?v=#{md5})"
					catch e
						return full
		else
			extnames = opt.extnames or ['css', 'js']
			content = content.replace new RegExp('(?:href|src)="([^"]+)\\.(' + extnames.join('|') + ')"', 'mg'), (full, fileName, extName) ->
				fileName = fileName + '.' + extName
				if (/^(https?:|\/\/)/).test fileName
					return full
				else
					if opt.getFilePath and (filePath = opt.getFilePath fileName, file.path)
					else
						basePath = opt.basePath or path.dirname(file.path)
						if (/^\//).test fileName
							filePath = basePath + fileName
						else
							filePath = path.resolve basePath, fileName
					try
						if fs.existsSync filePath
							md5 = crypto.createHash('md5')
								.update(fs.readFileSync(filePath))
								.digest('hex')
							if opt.appendToFileName
								tmp = full.split('.')
								tmp.splice(-1, 0, md5)
								return tmp.join('.')
							else
								return full.slice(0, -1) + '?v=' + md5 + '"'
						else
							return full
					catch e
						return full
		file.contents = new Buffer content
		@push file
		next()
