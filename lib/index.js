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
      var content, extnames;
      if (file.isNull()) {
        return this.emit('error', new gutil.PluginError('gulp-digest-versioning', 'File can\'t be null'));
      }
      if (file.isStream()) {
        return this.emit('error', new gutil.PluginError('gulp-digest-versioning', 'Streams not supported'));
      }
      content = file.contents.toString();
      if (path.extname(file.path) === '.css') {
        content = content.replace(/url\(\s*([^)]+)\s*\)/mg, function(full, fileName) {
          var e, filePath, md5, tmp;
          fileName = fileName.replace(/['"]/g, '');
          fileName = fileName.replace(/(#|\?).*$/, '');
          if (/^(https?:|\/\/)/.test(fileName)) {
            return full;
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
            try {
              if (fs.existsSync(filePath)) {
                md5 = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
                if (opt.appendToFileName) {
                  tmp = full.split('.');
                  tmp.splice(-1, 0, md5);
                  return 'url(' + tmp.join('.') + ')';
                } else {
                  return "url(" + fileName + "?v=" + md5 + ")";
                }
              }
            } catch (_error) {
              e = _error;
              return full;
            }
          }
        });
      } else {
        extnames = opt.extnames || ['css', 'js'];
        content = content.replace(new RegExp('(?:href|src)="([^"]+)\\.(' + extnames.join('|') + ')"', 'mg'), function(full, fileName, extName) {
          var basePath, e, filePath, md5, tmp;
          fileName = fileName + '.' + extName;
          if (/^(https?:|\/\/)/.test(fileName)) {
            return full;
          } else {
            if (opt.getFilePath && (filePath = opt.getFilePath(fileName, file.path))) {

            } else {
              basePath = opt.basePath || path.dirname(file.path);
              if (/^\//.test(fileName)) {
                filePath = basePath + fileName;
              } else {
                filePath = path.resolve(basePath, fileName);
              }
            }
            try {
              if (fs.existsSync(filePath)) {
                md5 = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
                if (opt.appendToFileName) {
                  tmp = full.split('.');
                  tmp.splice(-1, 0, md5);
                  return tmp.join('.');
                } else {
                  return full.slice(0, -1) + '?v=' + md5 + '"';
                }
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
