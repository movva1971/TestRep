app.dataservice = (function (breeze, logger) {

    breeze.config.initializeAdapterInstance("modelLibrary", "backingStore", true);
    
 // get the current default Breeze ajax adapter
    var ajaxAdapter = breeze.core.config.getAdapterInstance("ajax");
    // set fixed headers
    ajaxAdapter.defaultSettings = {
          headers: { 
              "Accept": "application/json, text/javascript, */*; q=0.01"
          },
   };    
    
    //var serviceName = 'api/todos'; // route to the same domain Web Api controller
   
    // Cross domain service example
    var serviceName = 'http://todo.breezejs.com/api/todos'; // controller in different domain
    jQuery.support.cors = true; // enable for cross domain calls
    
    var manager = new breeze.EntityManager(serviceName);
    var _isSaving = false;
    
    return {
        getAllTodos: getAllTodos,
        createTodo: createTodo,
        saveChanges: saveChanges,
        purge: purge,
        reset: reset,
    };

    /*** implementation details ***/
 
    //#region main application operations
    function getAllTodos(includeArchived) {
        var query = breeze.EntityQuery
                .from("Todos")
                .orderBy("CreatedAt");

        if (!includeArchived) { // exclude archived Todos
            // add filter clause limiting results to non-archived Todos
            query = query.where("IsArchived", "==", false);
        }

        return manager.executeQuery(query);
    }

    function createTodo() {
        var todoType = manager.metadataStore.getEntityType("TodoItem");
        var newTodo = todoType.createEntity();
        return manager.addEntity(newTodo);
    }

    function saveChanges(suppressLogIfNothingToSave) {
        if (manager.hasChanges()) {
            if (_isSaving) {
                setTimeout(saveChanges, 50);
                return;
            }
            _isSaving = true;
            manager.saveChanges()
                .then(saveSucceeded)
                .fail(saveFailed);
        } else if (!suppressLogIfNothingToSave) {
            logger.info("Nothing to save");
        };
    }
    
    function saveSucceeded(saveResult) {
        _isSaving = false;
        console.log('saveSucceded');
        logger.success("# of Todos saved = " + saveResult.entities.length);
        logger.log(saveResult);
    }
    
    function logObject(obj) {
        for (var key in obj) {
            if ((obj.hasOwnProperty(key)) && (typeof obj[key] !== 'function')) {
            	console.log(key + ' = ' + obj[key]);
            }
        }    
    }
    
    function saveFailed(error) {
        _isSaving = false;
        console.log('saveFailed: ' + error.message);
        logObject(error);
        logObject(error.XHR);

        var reason = error.message;
        var detail = error.detail;
        
        if (reason === "Validation error") {
            handleSaveValidationError(error);
            return;
        }
        if (detail && detail.ExceptionType &&
            detail.ExceptionType.indexOf('OptimisticConcurrencyException') !== -1) {
            // Concurrency error 
            reason =
                "Another user, perhaps the server, may have deleted one or all of the todos.";
            manager.rejectChanges(); // DEMO ONLY: discard all pending changes
        }

        logger.error(error,
            "Failed to save changes. " + reason + ": " + json);
    };
    
    function handleSaveValidationError(error) {
        var message = "Not saved due to validation error";
        try { // fish out the first error
            var firstErr = error.entitiesWithErrors[0].entityAspect.getValidationErrors()[0];
            message += ": " + firstErr.errorMessage;
        } catch (e) { /* eat it for now */ }
        logger.error(message);
    }
    
    //#endregion
    
    //#region demo operations
    function purge(callback) {
        // Todo: breeze should support commands to the controller
        // Simplified: fails silently
        $.post(serviceName + '/purge', function () {
            logger.success("database purged.");
            if (callback) callback();
        });
    }

    function reset(callback) {
        // Todo: breeze should support commands to the controller
        // Simplified: fails silently
        $.post(serviceName + '/reset', function () {
            logger.success("database reset.");
            if (callback) callback();
        });
    }
    //#endregion

})(breeze, app.logger);