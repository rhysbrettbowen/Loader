/*******************************************************************************
********************************************************************************
**                                                                            **
**  Copyright (c) 2012 Catch.com, Inc.                                        **
**                                                                            **
**  Licensed under the Apache License, Version 2.0 (the "License");           **
**  you may not use this file except in compliance with the License.          **
**  You may obtain a copy of the License at                                   **
**                                                                            **
**      http://www.apache.org/licenses/LICENSE-2.0                            **
**                                                                            **
**  Unless required by applicable law or agreed to in writing, software       **
**  distributed under the License is distributed on an "AS IS" BASIS,         **
**  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  **
**  See the License for the specific language governing permissions and       **
**  limitations under the License.                                            **
**                                                                            **
********************************************************************************
*******************************************************************************/

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
  args[0] = name;
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
      if (Ldr.Depends[type].inst !== null) {
        if (Ldr.Depends[type].con)
          return Ldr.Depends[type].type;
        return Ldr.inst(Ldr.get(type));
      } else {
        if (!goog.isFunction(Ldr.Depends[type].type)) {
          Ldr.Depends[type].inst = Ldr.Depends[type].type;
          return Ldr.Depends[type].inst;
        }
        var name = type;
        type = Ldr.Depends[type].type;
      }
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
  if (name)
    Ldr.Depends[name].inst = ret;
  var args = goog.array.slice(arguments, 1);
  var depends = [];
  if(type.prototype && type.prototype.inject_) {
    depends = goog.array.map(
        type.prototype.inject_, function(inject) {
          if (Ldr.Depends[inject] && Ldr.Depends[inject].con)
            return Ldr.Depends[inject].type;
          if (Ldr.Depends[inject] && Ldr.Depends[inject].inst === null)
            return Ldr.inst(inject);
          var type = Ldr.get(inject);
          return type ? Ldr.inst(type) : undefined;
        });
  }
  goog.array.extend(depends, args);
  type.apply(ret, depends);
  return ret;
};


/**
 * @param {*} type
 * @param {Array=} opt_singles
 */
Ldr.test = function(type, opt_singles) {
  if (!goog.isArray(opt_singles))
    opt_singles = [];
  if (goog.isString(type)) {
    if (Ldr.Depends[type] && goog.isDef(Ldr.Depends[type].inst)) {
      if (Ldr.Depends[type].inst !== null)
        return true;
      if (goog.array.contains(opt_singles, type))
        return true;
      if (!Ldr.Depends[type].type.prototype ||
          !Ldr.Depends[type].type.prototype.inject_ ||
          !Ldr.Depends[type].type.prototype.inject_.length)
        return true;
      opt_singles.push(type);
      return goog.array.every(Ldr.Depends[type].type.prototype.inject_,
          function(type) {
            return Ldr.test(type, opt_singles.slice(0));
          });
    }
    return !!(Ldr.Depends[type] &&
        (Ldr.Depends[type].con ||
        Ldr.test(Ldr.Depends[type].type, opt_singles.slice(0))));
  } else if (!goog.isFunction(type))
    return !!type;
  if (type.prototype && goog.isDef(type.prototype.inject_))
    return goog.array.every(type.prototype.inject_, function(type) {
      return Ldr.test(type, opt_singles.slice(0));
    });
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
    if (!inst && goog.array.every(/** @type {Array} */(type), function(type) {
        return Ldr.test(type);
      }))
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
