goog.provide('Loader');

goog.require('goog.array');

Loader.Depends = {};


Loader.reg = function(name, type) {
  Loader.Depends[name] = {
    type: type
  };
  goog.array.forEach(goog.array.clone(Loader.Waiting), function(waiter) {
    if (Loader.test(waiter.type))
      waiter.run();
  });
};


/**
 * register a singleton
 * 
 * @param {string} name of component
 * @param {Object|Function} type to register
 * @param {...*} var_args to pass to object
 */
Loader.regSingle = function(name, type, var_args) {
  var args = goog.array.slice(arguments, 1);
  Loader.Depends[name] = {
    type: type,
    inst: null
  };
  var ret = Loader.instSoon.apply(null, args).next(function(inst) {
    Loader.Depends[name].inst = inst;
  });
  goog.array.forEach(goog.array.clone(Loader.Waiting), function(waiter) {
    if (Loader.test(waiter.type))
      waiter.run();
  });
  return ret;
};


Loader.Waiting = [];


Loader.get = function(name) {
  return Loader.Depends[name] &&
      (Loader.Depends[name].inst || Loader.Depends[name].type);
};


/**
 * return a constructor that will instantiate the object.
 *
 * @param {Function} type the constructor function
 */
Loader.instify = function(type) {
  return function() {
    return Loader.inst.apply(null, goog.array.concat(
      [type], goog.array.clone(arguments)));
  };
};


/**
 * 
 * @param {Object|Function|string} type
 * @param {...*} var_args other arguments
 * @return {*}
 */
Loader.inst = function(type, var_args) {
  if (type.getInstance)
    return type.getInstance();
  if (!goog.isFunction(type))
    if (goog.isString(type))
      return Loader.inst(Loader.get(type));
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
          var type = Loader.get(inject);
          return type ? Loader.inst(type) : undefined;
        });
  }
  goog.array.extend(depends, args);
  type.apply(ret, depends);
  return ret;
};


Loader.test = function(type) {
  if (goog.isString(type)) {
    return Loader.test(Loader.get(type));
  }
  if (!goog.isFunction(type))
    return !!type;
  if (type.prototype.inject_)
    return goog.array.every(type.prototype.inject_, Loader.test);
  return true;
}


/**
 * will instantiate when required injectors are available, then will call
 * functions attached through next
 *
 * @param {Array|Object|string|Function} type to instantiate
 * @param {...*} var_args arguments to instantiate with
 */
Loader.instSoon = function(type, var_args) {
  if (!goog.isArray(type))
    type = [type];
  var next = [];
  var inst = null;
  var args = goog.array.slice(arguments, 1);
  var ret = {};
  var waiter = {
    type: type,
    run: function() {ret.next(goog.nullFunction);}
  };
  ret.next = function(fn) {
    if (!inst && goog.array.every(/** @type {Array} */(type), Loader.test))
      inst = goog.array.map(/** @type {Array} */(type), function(type) {
        return Loader.inst.apply(null,
            goog.array.concat([type], args));
      });
    if(inst) {
      goog.array.remove(Loader.Waiting, waiter);
      next.push(fn);
      goog.array.forEach(next, function(fn) {
        fn.apply(null, inst);
      });
      next = [];
    } else {
      next.push(fn);
    }
    return ret;
  };
  Loader.Waiting.push(waiter);
  return ret;
};
