goog.provide('Loader');


Loader.Depends = {};


Loader.register = function(name, type) {
  Loader.Depends[name] = type;
};


/**
 * 
 * @param {Object|Function} type
 * @param {...*} var_args other arguments
 * @return {*}
 */
Loader.instantiate = function(type, var_args) {
  if (type.getInstance)
    return type.getInstance();
  if (!goog.isFunction(type))
    return type;
  /** @constructor */
  var Temp = function() {};
  goog.object.forEach(type, function(val, key) {
    Temp[key] = val;
  });
  Temp.prototype = type.prototype;
  var ret = new Temp();
  var args = goog.array.slice(arguments, 1);
  if(type.prototype.inject_)
    goog.array.extend(args, goog.array.map(
        type.prototype.inject_, function(inject) {
          return Loader.instantiate(Loader.Depends[inject]);
        }
    )
  );
  type.apply(ret, args);
  return ret;
};