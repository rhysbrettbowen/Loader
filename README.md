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
Loader.register('mediator', app.Mediator);
```

Now when you need the mediator in a new class you can inject it:

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
Loader.instantiate(app.myClass);
```

and the mediator will be injected. You can also still pass in normal arguments like so:

```javascript
app.myClass = function(model, mediator) {};

// you can instantiate like this:
Loader.instantiate(app.myClass, myModel);
```

If you have used goog.addSingletonGetter then the dependancy will be the singleton.

You can also register an object rather than a constructor function if you want the same instance used (which means you can just add in the object once instead of using addSingletonGetter).
