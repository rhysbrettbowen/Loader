goog.provide('Loader');


Loader.Depends = {};


Loader.register = function(name, type) {
  Loader.Depends[name] = type;
};


Loader.get = function(name) {
  return Loader.Depends[name];
};


Loader.makeInstantiatable = function(type) {
  return function() {
    return Loader.instantiate.apply(null, goog.array.concat(
      [type], goog.array.clone(arguments)));
  };
};


/**
 * 
 * @param {Object|Function|string} type
 * @param {...*} var_args other arguments
 * @return {*}
 */
Loader.instantiate = function(type, var_args) {
  if (type.getInstance)
    return type.getInstance();
  if (!goog.isFunction(type))
    if (goog.isString(type))
      return Loader.instantiate(Loader.get(type));
    else
      return type;
  /** @constructor */
  var Temp = function() {};
  goog.object.forEach(type, function(val, key) {
    Temp[key] = val;
  });
  Temp.prototype = type.prototype;
  var ret = new Temp();
  var args = goog.array.slice(arguments, 1);
  var depends = [];
  if(type.prototype.inject_) {
    depends = goog.array.map(
        type.prototype.inject_, function(inject) {
          return Loader.instantiate(Loader.Depends[inject]);
        });
    goog.array.extend(depends, args);
  }
  type.apply(ret, depends);
  return ret;
};
