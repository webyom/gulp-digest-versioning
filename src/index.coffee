fs = require 'fs'
path = require 'path'
crypto = require 'crypto'
PluginError = require 'plugin-error'
through = require 'through2'
cp = require 'cp'

renamedFileMap = {}

md5List = []

module.exports = (opt = {}) ->
	through.obj (file, enc, next) ->
		return @emit 'error', new PluginError('gulp-digest-versioning', 'File can\'t be null') if file.isNull()
		return @emit 'error', new PluginError('gulp-digest-versioning', 'Streams not supported') if file.isStream()
		baseDir = path.resolve process.cwd(), opt.baseDir if opt.baseDir
		destDir = path.resolve process.cwd(), opt.destDir if opt.destDir
		digestLength = Math.max(parseInt(opt.digestLength) || 4, 4)
		content = file.contents.toString()
		content = content.replace /url\(\s*([^)]+)\s*\)/mg, (full, fileName) ->
			fileName = fileName.replace /['"]/g, ''
			if (/^(https?:|\/\/)/).test fileName
				return full
			else if opt.skipFileName and opt.skipFileName fileName, md5List
				if opt.fixSkipUrl
					fileName = opt.fixSkipUrl fileName, file.path, baseDir
				return "url(#{fileName})"
			else
				if opt.getFilePath
					filePath = opt.getFilePath fileName, file.path, baseDir
				else
					if (/^\//).test fileName
						if baseDir
							filePath = baseDir + fileName
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
						md5List.push md5
						fileName = fileName.split '?'
						if opt.appendToFileName
							if fileName[0].indexOf md5 is -1
								tmp = fileName[0].split('.')
								rep = tmp[tmp.length - 2] + (if typeof opt.appendToFileName is 'string' then opt.appendToFileName else '.') + md5
								tmp.splice(-2, 1, rep)
								fileName[0] = tmp.join('.')
								if baseDir and destDir
									cpPath = path.resolve destDir, path.relative(baseDir, filePath)
									cpPath = path.resolve path.dirname(cpPath), path.basename(fileName[0])
									cp.sync filePath, cpPath
									renamedFileMap[filePath] = 1
						else
							if fileName[1]
								fileName[1] = fileName[1] + '&v=' + md5
							else
								fileName[1] = 'v=' + md5
						fileName = fileName.join '?'
						if opt.fixUrl
							fileName = opt.fixUrl fileName, file.path, baseDir
						return "url(#{fileName})"
					else
						return full
				catch e
					return full
		if path.extname(file.path) isnt '.css'
			extnames = opt.extnames or ['css', 'js', 'jpg', 'jpeg', 'png', 'gif', 'ico']
			content = content.replace new RegExp('(\'|")([^\'"]+?\\.(?:' + extnames.join('|') + ')(?:\\?[^\'"]*?)?)\\1', 'mg'), (full, quote, fileName) ->
				if (/^(https?:|\/\/)/).test fileName
					return full
				else if opt.skipFileName and opt.skipFileName fileName, md5List
					if opt.fixSkipUrl
						fileName = opt.fixSkipUrl fileName, file.path, baseDir
					return "#{quote}#{fileName}#{quote}"
				else
					if opt.getFilePath
						filePath = opt.getFilePath fileName, file.path, baseDir
					else
						if (/^\//).test fileName
							if baseDir
								filePath = baseDir + fileName
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
							md5List.push md5
							fileName = fileName.split '?'
							if opt.appendToFileName
								if fileName[0].indexOf md5 is -1
									tmp = fileName[0].split('.')
									rep = tmp[tmp.length - 2] + (if typeof opt.appendToFileName is 'string' then opt.appendToFileName else '.') + md5
									tmp.splice(-2, 1, rep)
									fileName[0] = tmp.join('.')
									if baseDir and destDir
										cpPath = path.resolve destDir, path.relative(baseDir, filePath)
										cpPath = path.resolve path.dirname(cpPath), path.basename(fileName[0])
										renamedFileMap[filePath] = 1
										if path.extname(filePath) is '.js' and fs.existsSync(filePath + '.map')
											fs.writeFileSync cpPath, fs.readFileSync(filePath).toString().replace(/\/\/# sourceMappingURL=.+\.map/, '//# sourceMappingURL=' + path.basename(cpPath) + '.map')
											try
												sourceMap = JSON.parse fs.readFileSync(filePath + '.map').toString()
											catch e
											if sourceMap
												if sourceMap.file
													sourceMap.file = path.basename cpPath
												fs.writeFileSync cpPath + '.map', JSON.stringify sourceMap
										else
											cp.sync filePath, cpPath
							else
								if fileName[1]
									fileName[1] = fileName[1] + '&v=' + md5
								else
									fileName[1] = 'v=' + md5
							fileName = fileName.join '?'
							if opt.fixUrl
								fileName = opt.fixUrl fileName, file.path, baseDir
							return "#{quote}#{fileName}#{quote}"
						else
							return full
					catch e
						return full
		file.contents = Buffer.from content
		@push file
		next()

module.exports.getRenamedFiles = () ->
	Object.keys renamedFileMap
