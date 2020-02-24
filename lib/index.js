(function() {
  var PluginError, cp, crypto, fs, path, renamedFileMap, through;

  fs = require('fs');

  path = require('path');

  crypto = require('crypto');

  PluginError = require('plugin-error');

  through = require('through2');

  cp = require('cp');

  renamedFileMap = {};

  module.exports = function(opt) {
    if (opt == null) {
      opt = {};
    }
    return through.obj(function(file, enc, next) {
      var baseDir, content, destPath, digestLength, extnames;
      if (file.isNull()) {
        return this.emit('error', new PluginError('gulp-digest-versioning', 'File can\'t be null'));
      }
      if (file.isStream()) {
        return this.emit('error', new PluginError('gulp-digest-versioning', 'Streams not supported'));
      }
      if (opt.baseDir) {
        baseDir = path.resolve(process.cwd(), opt.baseDir);
      }
      if (opt.destPath) {
        destPath = path.resolve(process.cwd(), opt.destPath);
      }
      digestLength = Math.max(parseInt(opt.digestLength) || 4, 4);
      content = file.contents.toString();
      content = content.replace(/url\(\s*([^)]+)\s*\)/mg, function(full, fileName) {
        var cpPath, e, filePath, md5, rep, tmp;
        fileName = fileName.replace(/['"]/g, '');
        if (/^(https?:|\/\/)/.test(fileName)) {
          return full;
        } else if (opt.skipFileName && opt.skipFileName(fileName)) {
          if (opt.fixUrl) {
            fileName = opt.fixUrl(fileName, file.path, baseDir);
          }
          return "url(" + fileName + ")";
        } else {
          if (opt.getFilePath) {
            filePath = opt.getFilePath(fileName, file.path, baseDir);
          } else {
            if (/^\//.test(fileName)) {
              if (baseDir) {
                filePath = baseDir + fileName;
              } else {
                return full;
              }
            } else {
              filePath = path.resolve(path.dirname(file.path), fileName);
            }
          }
          filePath = filePath.split('?')[0];
          try {
            if (fs.existsSync(filePath)) {
              md5 = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
              md5 = md5.substr(0, digestLength);
              fileName = fileName.split('?');
              if (opt.appendToFileName) {
                if (fileName[0].indexOf(md5 === -1)) {
                  tmp = fileName[0].split('.');
                  rep = tmp[tmp.length - 2] + (typeof opt.appendToFileName === 'string' ? opt.appendToFileName : '.') + md5;
                  tmp.splice(-2, 1, rep);
                  fileName[0] = tmp.join('.');
                  if (baseDir && destPath) {
                    cpPath = path.resolve(destPath, path.relative(baseDir, filePath));
                    cpPath = path.resolve(path.dirname(cpPath), path.basename(fileName[0]));
                    cp.sync(filePath, cpPath);
                    renamedFileMap[filePath] = 1;
                  }
                }
              } else {
                if (fileName[1]) {
                  fileName[1] = fileName[1] + '&v=' + md5;
                } else {
                  fileName[1] = 'v=' + md5;
                }
              }
              fileName = fileName.join('?');
              if (opt.fixUrl) {
                fileName = opt.fixUrl(fileName, file.path, baseDir);
              }
              return "url(" + fileName + ")";
            } else {
              return full;
            }
          } catch (error) {
            e = error;
            return full;
          }
        }
      });
      if (path.extname(file.path) !== '.css') {
        extnames = opt.extnames || ['css', 'js', 'jpg', 'jpeg', 'png', 'gif', 'ico'];
        content = content.replace(new RegExp('(\'|")([^\'"]+?\\.(?:' + extnames.join('|') + ')(?:\\?[^\'"]*?)?)\\1', 'mg'), function(full, quote, fileName) {
          var cpPath, e, filePath, md5, rep, sourceMap, tmp;
          if (/^(https?:|\/\/)/.test(fileName)) {
            return full;
          } else if (opt.skipFileName && opt.skipFileName(fileName)) {
            if (opt.fixUrl) {
              fileName = opt.fixUrl(fileName, file.path, baseDir);
            }
            return "" + quote + fileName + quote;
          } else {
            if (opt.getFilePath) {
              filePath = opt.getFilePath(fileName, file.path, baseDir);
            } else {
              if (/^\//.test(fileName)) {
                if (baseDir) {
                  filePath = baseDir + fileName;
                } else {
                  return full;
                }
              } else {
                filePath = path.resolve(path.dirname(file.path), fileName);
              }
            }
            filePath = filePath.split('?')[0];
            try {
              if (fs.existsSync(filePath)) {
                md5 = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
                md5 = md5.substr(0, digestLength);
                fileName = fileName.split('?');
                if (opt.appendToFileName) {
                  if (fileName[0].indexOf(md5 === -1)) {
                    tmp = fileName[0].split('.');
                    rep = tmp[tmp.length - 2] + (typeof opt.appendToFileName === 'string' ? opt.appendToFileName : '.') + md5;
                    tmp.splice(-2, 1, rep);
                    fileName[0] = tmp.join('.');
                    if (baseDir && destPath) {
                      cpPath = path.resolve(destPath, path.relative(baseDir, filePath));
                      cpPath = path.resolve(path.dirname(cpPath), path.basename(fileName[0]));
                      cp.sync(filePath, cpPath);
                      renamedFileMap[filePath] = 1;
                      if (path.extname(filePath) === '.js' && fs.existsSync(filePath + '.map')) {
                        try {
                          sourceMap = JSON.parse(fs.readFileSync(filePath + '.map').toString());
                        } catch (error) {
                          e = error;
                        }
                        if (sourceMap) {
                          if (sourceMap.file) {
                            sourceMap.file = path.basename(filePath);
                          }
                          fs.writeFileSync(cpPath + '.map', JSON.stringify(sourceMap));
                        }
                      }
                    }
                  }
                } else {
                  if (fileName[1]) {
                    fileName[1] = fileName[1] + '&v=' + md5;
                  } else {
                    fileName[1] = 'v=' + md5;
                  }
                }
                fileName = fileName.join('?');
                if (opt.fixUrl) {
                  fileName = opt.fixUrl(fileName, file.path, baseDir);
                }
                return "" + quote + fileName + quote;
              } else {
                return full;
              }
            } catch (error) {
              e = error;
              return full;
            }
          }
        });
      }
      file.contents = Buffer.from(content);
      this.push(file);
      return next();
    });
  };

  module.exports.getRenamedFiles = function() {
    return Object.keys(renamedFileMap);
  };

}).call(this);
