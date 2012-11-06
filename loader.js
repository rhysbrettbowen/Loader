goog.provide('Ldr');

goog.require('goog.array');

Ldr.Depends = {};


Ldr.reg = function(name, type) {
  Ldr.Depends[name] = {
    type: type
  };
  Ldr.checkWaiting();
};


Ldr.regConst = function(name, type) {
  Ldr.Depends[name] = {
    type: type,
    con: true
  };
  Ldr.checkWaiting();
};


/**
 * register a singleton
 * 
 * @param {string} name of component
 * @param {Object|Function} type to register
 * @param {...*} var_args to pass to object
 */
Ldr.regSingle = function(name, type, var_args) {
  var args = goog.array.slice(arguments, 1);
  Ldr.Depends[name] = {
    type: type,
    inst: null
  };
  var ret = Ldr.instSoon.apply(null, args).next(function(inst) {
    Ldr.Depends[name].inst = inst;
  });
  Ldr.checkWaiting();
  return ret;
};

Ldr.checkWaiting = function() {
  goog.array.forEach(goog.array.clone(Ldr.Waiting), function(waiter) {
    if (Ldr.test(waiter.type[0])) {
      goog.array.remove(Ldr.Waiting, waiter);
      waiter.run();
    }
  });
};


Ldr.Waiting = [];


Ldr.get = function(name) {
  if (Ldr.Depends[name] && goog.isDef(Ldr.Depends[name].inst) &&
      !Ldr.Depends[name].inst && Ldr.test(Ldr.Depends[name].type)) {
    goog.array.find(Ldr.Waiting, function(wait) {
      return wait.type[0] == Ldr.Depends[name].type;
    }).run();
  };

  return Ldr.Depends[name] &&
      (Ldr.Depends[name].inst || Ldr.Depends[name].type);
};


/**
 * return a constructor that will instantiate the object.
 *
 * @param {Function} type the constructor function
 */
Ldr.instify = function(type) {
  return function() {
    return Ldr.inst.apply(null, goog.array.concat(
      [type], goog.array.clone(arguments)));
  };
};


/**
 * 
 * @param {Object|Function|string} type
 * @param {...*} var_args other arguments
 * @return {*}
 */
Ldr.inst = function(type, var_args) {
  if (type.getInstance)
    return type.getInstance();
  if (!goog.isFunction(type))
    if (goog.isString(type)) {
      if (Ldr.Depends[type].con)
        return Ldr.Depends[type].type;
      return Ldr.inst(Ldr.get(type));
    } else {
      return type;
    }
  /** @constructor */
  var LdrInst = function() {};
  goog.object.forEach(type, function(val, key) {
    LdrInst[key] = val;
  });
  LdrInst.prototype = type.prototype;
  LdrInst.superClass_ = type;
  var ret = new LdrInst();
  var args = goog.array.slice(arguments, 1);
  var depends = [];
  if(type.prototype.inject_) {
    depends = goog.array.map(
        type.prototype.inject_, function(inject) {
          if (Ldr.Depends[inject] && Ldr.Depends[inject].con)
            return Ldr.Depends[inject].type;
          var type = Ldr.get(inject);
          return type ? Ldr.inst(type) : undefined;
        });
  }
  goog.array.extend(depends, args);
  type.apply(ret, depends);
  return ret;
};


Ldr.test = function(type) {
  if (goog.isString(type)) {
    return !!(Ldr.Depends[type] &&
        (Ldr.Depends[type].con ||
        Ldr.Depends[type].inst ||
        Ldr.test(Ldr.Depends[type].type)));
  } else if (!goog.isFunction(type))
    return !!type;
  if (type.prototype.inject_)
    return goog.array.every(type.prototype.inject_, Ldr.test);
  return true;
}


/**
 * will instantiate when required injectors are available, then will call
 * functions attached through next
 *
 * @param {Array|Object|string|Function} type to instantiate
 * @param {...*} var_args arguments to instantiate with
 */
Ldr.instSoon = function(type, var_args) {
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
    if (!inst && goog.array.every(/** @type {Array} */(type), Ldr.test))
      inst = goog.array.map(/** @type {Array} */(type), function(type) {
        return Ldr.inst.apply(null,
            goog.array.concat([type], args));
      });
    if(inst) {
      goog.array.remove(Ldr.Waiting, waiter);
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
  Ldr.Waiting.push(waiter);
  return ret;
};
