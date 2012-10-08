# LOADER #

## An IoC DI for Closure Tools ##

### What is it? ###

It allows you to inject dependacies in to objects rather than use a goog.require() to explicitly depend upon it.

### Usage ###

in your main file you need to require it:

```javascript
goog.require('Loader');
```

Then when you want to register a dependancy you need to register it:

```javascript
Loader.reg('mediator', app.Mediator);
```

If the object is meant to be a singleton you can either pass in app.Mediator which has a goog.addSingletonGetter applied to it or use:

```javascript
Loader.regSingle('mediator', app.Mediator);
```

if using regSingle you can also pass in cariables for the constructor and an object is returned with a "next" method that allows you to call something like:

```javascript
	Loader.regSingle('mediator', app.Mediator, arg1).next(function(mediator) {
		mediator.on('thing', function() {do stuff();});
	});
```

which will be run once the singleton is instantiated.

When you need the mediator in a new class you can inject it:

```javascript
/**
 * @constructor
 */
app.myClass = function(mediator) {
	this.mediator = mediator
};

app.myClass.prototype.inject_ = ['mediator'];
```

notice that you need to list dependencies to inject on the prototype of the object.

Now when you want to create a new app.myClass:

```javascript
Loader.inst(app.myClass);
```

and the mediator will be injected. You can also still pass in normal arguments after the dependencies like so:

```javascript
app.myClass = function(mediator, model) {};

// you can instantiate like this:
Loader.inst(app.myClass, myModel);
```

you can test if all dependancies are satisfied before trying to instantiate by calling:

```javascript
Loader.test(app.myClass); // return true if dependencies satisfied
```

If you have used goog.addSingletonGetter then the dependancy will be the singleton.

You can also register an object rather than a constructor function if you want the same instance used (which means you can just add in the object once instead of using addSingletonGetter).

If you need to pass in a function that another module want to use with the 'new' keyword then you can make it instantiatable before passing it in like so:

var instantiatableClass = Loader.instify(myClass);

Also you can instantiate the class only when all of it's dependancies are met by instSoon and setup actions for instance one it is instantiated:

```javascript
Loader.instSoon(app.myClass)
	.next(function(myInst) {myInst.foo();})
	.next(function(myInst) {myInst.bar();});
```
