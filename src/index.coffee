fs = require 'fs'
path = require 'path'
crypto = require 'crypto'
PluginError = require 'plugin-error'
through = require 'through2'
cp = require 'cp'

module.exports = (opt = {}) ->
	through.obj (file, enc, next) ->
		return @emit 'error', new PluginError('gulp-digest-versioning', 'File can\'t be null') if file.isNull()
		return @emit 'error', new PluginError('gulp-digest-versioning', 'Streams not supported') if file.isStream()
		basePath = path.resolve process.cwd(), opt.basePath if opt.basePath
		destPath = path.resolve process.cwd(), opt.destPath if opt.destPath
		digestLength = Math.max(parseInt(opt.digestLength) || 4, 4)
		content = file.contents.toString()
		content = content.replace /url\(\s*([^)]+)\s*\)/mg, (full, fileName) ->
			fileName = fileName.replace /['"]/g, ''
			if (/^(https?:|\/\/)/).test fileName
				return full
			else
				if opt.getFilePath
					filePath = opt.getFilePath fileName, file.path, basePath
				else
					if (/^\//).test fileName
						if basePath
							filePath = basePath + fileName
						else
							return full
					else
						filePath = path.resolve path.dirname(file.path), fileName
				filePath = filePath.split('?')[0]
				try
					if fs.existsSync filePath
						md5 = crypto.createHash('md5')
							.update(fs.readFileSync(filePath))
							.digest('hex')
						md5 = md5.substr 0, digestLength
						fileName = fileName.split '?'
						if opt.appendToFileName
							if fileName[0].indexOf md5 is -1
								tmp = fileName[0].split('.')
								rep = tmp[tmp.length - 2] + (if typeof opt.appendToFileName is 'string' then opt.appendToFileName else '.') + md5
								tmp.splice(-2, 1, rep)
								fileName[0] = tmp.join('.')
								if basePath and destPath
									cpPath = path.resolve destPath, path.relative(basePath, filePath)
									cpPath = path.resolve path.dirname(cpPath), path.basename(fileName[0])
									if basePath is destPath
										fs.renameSync filePath, cpPath
									else
										cp.sync filePath, cpPath
						else
							if fileName[1]
								fileName[1] = fileName[1] + '&v=' + md5
							else
								fileName[1] = 'v=' + md5
						fileName = fileName.join '?'
						if opt.fixUrl
							fileName = opt.fixUrl fileName, file.path, basePath
						return "url(#{fileName})"
					else
						return full
				catch e
					return full
		if path.extname(file.path) isnt '.css'
			extnames = opt.extnames or ['css', 'js', 'jpg', 'jpeg', 'png', 'gif', 'ico']
			content = content.replace new RegExp('(\\s|-)(href|src)="([^"]+\\.(?:' + extnames.join('|') + ')(?:\\?[^"]*)?[^"]*)"', 'mg'), (full, prefix, attrName, fileName) ->
				if (/^(https?:|\/\/)/).test fileName
					return full
				else
					if opt.getFilePath
						filePath = opt.getFilePath fileName, file.path, basePath
					else
						if (/^\//).test fileName
							if basePath
								filePath = basePath + fileName
							else
								return full
						else
							filePath = path.resolve path.dirname(file.path), fileName
					filePath = filePath.split('?')[0]
					try
						if fs.existsSync filePath
							md5 = crypto.createHash('md5')
								.update(fs.readFileSync(filePath))
								.digest('hex')
							md5 = md5.substr 0, digestLength
							fileName = fileName.split '?'
							if opt.appendToFileName
								if fileName[0].indexOf md5 is -1
									tmp = fileName[0].split('.')
									rep = tmp[tmp.length - 2] + (if typeof opt.appendToFileName is 'string' then opt.appendToFileName else '.') + md5
									tmp.splice(-2, 1, rep)
									fileName[0] = tmp.join('.')
									if basePath and destPath
										cpPath = path.resolve destPath, path.relative(basePath, filePath)
										cpPath = path.resolve path.dirname(cpPath), path.basename(fileName[0])
										if basePath is destPath
											fs.renameSync filePath, cpPath
										else
											cp.sync filePath, cpPath
							else
								if fileName[1]
									fileName[1] = fileName[1] + '&v=' + md5
								else
									fileName[1] = 'v=' + md5
							fileName = fileName.join '?'
							if opt.fixUrl
								fileName = opt.fixUrl fileName, file.path, basePath
							return "#{prefix}#{attrName}=\"#{fileName}\""
						else
							return full
					catch e
						return full
		file.contents = new Buffer content
		@push file
		next()
