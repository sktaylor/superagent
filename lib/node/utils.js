
/**
 * Module dependencies.
 */

var Stream = require('stream').Stream
 , StringDecoder = require('string_decoder').StringDecoder
 , zlib;

/**
 * Require zlib module for Node 0.6+
 */

try {
  zlib = require('zlib');
} catch (e) { }

/**
 * Generate a UID with the given `len`.
 *
 * @param {Number} len
 * @return {String}
 * @api private
 */

exports.uid = function(len){
  var buf = ''
    , chars = 'abcdefghijklmnopqrstuvwxyz123456789'
    , nchars = chars.length;
  while (len--) buf += chars[Math.random() * nchars | 0];
  return buf;
};

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

exports.type = function(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

exports.params = function(str){
  return str.split(/ *; */).reduce(function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Buffers response data events and re-emits when they're unzipped.
 *
 * @param {http.ServerResponse} response stream
 * @api private
 */

exports.unzip = function(res){
  if (!zlib) return;

  var unzip = zlib.createUnzip()
    , decodedStream = new Stream
    , decoder;

  // pipe to unzip
  res.pipe(unzip);

  // override `setEncoding` to capture encoding
  res.setEncoding = function(type){
    decoder = new StringDecoder(type);
  };

  // decode upon decompressing with captured encoding
  unzip.on('data', function(buf){
    var str = decoder.write(buf);
    if (str.length) decodedStream.emit('data', str);
  });

  unzip.on('end', function(){
    decodedStream.emit('end');
  });

  // override `on` to capture data listeners
  var _on = res.on;
  res.on = function(type, fn){
    if ('data' == type || 'end' == type) {
      decodedStream.on(type, fn);
    } else {
      _on.call(res, type, fn);
    }
  };
};