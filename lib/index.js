(function() {
  var crypto, fs, gutil, path, through;

  fs = require('fs');

  path = require('path');

  crypto = require('crypto');

  gutil = require('gulp-util');

  through = require('through2');

  module.exports = function(opt) {
    if (opt == null) {
      opt = {};
    }
    return through.obj(function(file, enc, next) {
      var content, digestLength, extnames;
      if (file.isNull()) {
        return this.emit('error', new gutil.PluginError('gulp-digest-versioning', 'File can\'t be null'));
      }
      if (file.isStream()) {
        return this.emit('error', new gutil.PluginError('gulp-digest-versioning', 'Streams not supported'));
      }
      digestLength = Math.max(parseInt(opt.digestLength) || 8, 8);
      content = file.contents.toString();
      content = content.replace(/url\(\s*([^)]+)\s*\)/mg, function(full, fileName) {
        var e, filePath, md5, rep, tmp;
        fileName = fileName.replace(/['"]/g, '');
        if (/^(https?:|\/\/)/.test(fileName)) {
          return full;
        } else {
          if (opt.getFilePath) {
            filePath = opt.getFilePath(fileName, file.path);
          } else {
            if (/^\//.test(fileName)) {
              if (opt.basePath) {
                filePath = opt.basePath + fileName;
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
                tmp = fileName[0].split('.');
                rep = tmp[tmp.length - 2] + (typeof opt.appendToFileName === 'string' ? opt.appendToFileName : '.') + md5;
                tmp.splice(-2, 1, rep);
                fileName[0] = tmp.join('.');
              } else {
                if (fileName[1]) {
                  fileName[1] = fileName[1] + '&v=' + md5;
                } else {
                  fileName[1] = 'v=' + md5;
                }
              }
              fileName = fileName.join('?');
              return "url(" + fileName + ")";
            } else {
              return full;
            }
          } catch (_error) {
            e = _error;
            return full;
          }
        }
      });
      if (path.extname(file.path) !== '.css') {
        extnames = opt.extnames || ['css', 'js', 'jpg', 'png', 'gif'];
        content = content.replace(new RegExp('(\\s|-)(href|src)="([^"]+\\.(?:' + extnames.join('|') + ')(?:\\?[^"]*)?[^"]*)"', 'mg'), function(full, prefix, attrName, fileName) {
          var basePath, e, filePath, md5, rep, tmp;
          if (/^(https?:|\/\/)/.test(fileName)) {
            return full;
          } else {
            if (opt.getFilePath) {
              filePath = opt.getFilePath(fileName, file.path);
            } else {
              basePath = opt.basePath || path.dirname(file.path);
              if (/^\//.test(fileName)) {
                filePath = basePath + fileName;
              } else {
                filePath = path.resolve(basePath, fileName);
              }
            }
            filePath = filePath.split('?')[0];
            try {
              if (fs.existsSync(filePath)) {
                md5 = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
                md5 = md5.substr(0, digestLength);
                fileName = fileName.split('?');
                if (opt.appendToFileName) {
                  tmp = fileName[0].split('.');
                  rep = tmp[tmp.length - 2] + (typeof opt.appendToFileName === 'string' ? opt.appendToFileName : '.') + md5;
                  tmp.splice(-2, 1, rep);
                  fileName[0] = tmp.join('.');
                } else {
                  if (fileName[1]) {
                    fileName[1] = fileName[1] + '&v=' + md5;
                  } else {
                    fileName[1] = 'v=' + md5;
                  }
                }
                fileName = fileName.join('?');
                return "" + prefix + attrName + "=\"" + fileName + "\"";
              } else {
                return full;
              }
            } catch (_error) {
              e = _error;
              return full;
            }
          }
        });
      }
      file.contents = new Buffer(content);
      this.push(file);
      return next();
    });
  };

}).call(this);
