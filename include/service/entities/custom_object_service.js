/*
    Copyright (C) 2014  PencilBlue, LLC

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

//dependencies
var HtmlEncoder = require('htmlencode');

/**
 *
 * @class CustomObjectService
 * @constructor
 */
function CustomObjectService() {}

//statics
CustomObjectService.CUST_OBJ_COLL = 'custom_object';
CustomObjectService.CUST_OBJ_TYPE_COLL = 'custom_object_type';
CustomObjectService.CUST_OBJ_SORT_COLL = 'custom_object_sort';

//constants
/**
 *
 * @private
 * @static
 * @property NAME_FIELD
 * @type {String}
 */
var NAME_FIELD = 'name';

/**
 *
 * @private
 * @static
 * @property PEER_OBJECT_TYPE
 * @type {String}
 */
var PEER_OBJECT_TYPE = 'peer_object';

/**
 *
 * @private
 * @static
 * @property CHILD_OBJECTS_TYPE
 * @type {String}
 */
var CHILD_OBJECTS_TYPE = 'child_objects';

/**
 *
 * @private
 * @static
 * @property CUST_OBJ_TYPE_PREFIX
 * @type {String}
 */
var CUST_OBJ_TYPE_PREFIX = 'custom:';

/**
 *
 * @private
 * @static
 * @property AVAILABLE_FIELD_TYPES
 * @type {Object}
 */
var AVAILABLE_FIELD_TYPES = {
    'text': pb.validation.isStr,
    'number': pb.validation.isNum,
    'date': pb.validation.isDate,
    'peer_object': pb.validation.isIdStr,
    'child_objects': pb.validation.isArray
};

/**
 *
 * @private
 * @static
 * @property AVAILABLE_REFERENCE_TYPES
 * @type {Object}
 */
var AVAILABLE_REFERENCE_TYPES = [
    'article',
    'page',
    'section',
    'topic',
    'media',
    'user'
];

CustomObjectService.prototype.saveSortOrdering = function(sortOrder, cb) {
    if (!pb.validation.isObj(sortOrder, true)) {
        throw new Error('The custom object type must be a valid object.');
    }

    var self = this;
    sortOrder.object_type = CustomObjectService.CUST_OBJ_SORT_COLL;
    this.validateSortOrdering(sortOrder, function(err, errors) {
        if (util.isError(err) || errors.length > 0) {
            return cb(err, errors);
        }

        var dao = new pb.DAO();
        dao.update(sortOrder).then(function(result) {
            cb(util.isError(result) ? result : null, result);
        });
    });
};

CustomObjectService.prototype.validateSortOrdering = function(sortOrder, cb) {
    if (!pb.utils.isObject(sortOrder)) {
        throw new Error('The sortOrder parameter must be a valid object');
    };

    //validat sorted IDs
    var errors = [];
    if (!util.isArray(sortOrder.sorted_objects)) {
        errors.push(CustomObjectService.err('sorted_objects', 'The sorted_objects property must be an array of IDs'));
    }
    else {
        if (sortOrder.length === 0) {
            errors.push(CustomObjectService.err('sorted_objects', 'The sorted objects ID list cannot be empty'));
        }

        for (var i = 0; i < sortOrder.length; i++) {

            if (!pb.validation.isIdStr(sortOrder[i], true)) {
                errors.push(CustomObjectService.err('sorted_objects.'+i, 'An invalid ID was found in the sorted_objects array at index '+i));
            }
        }
    }

    //validate that an object type Id is present
    if (!pb.validation.isIdStr(sortOrder.custom_object_type, true)) {
        errors.push(CustomObjectService.err('custom_object_type', 'An invalid ID value was passed for the custom_object_type property'));
    }

    //validate an object type exists
    if (sortOrder.object_type !== CustomObjectService.CUST_OBJ_SORT_COLL) {
        errors.push(CustomObjectService.err('object_type', 'The object_type value must be set to: '+CustomObjectService.CUST_OBJ_SORT_COLL));
    }

    cb(null, errors);
};

CustomObjectService.prototype.findByTypeWithOrdering = function(custObjType, options, cb) {
    if (pb.utils.isFunction(options)) {
        cb = options;
        options = {};
    }
    else if (!pb.utils.isObject(options)) {
        options = {};
    }

    var sortOrder   = null;
    var custObjects = null;
    var self        = this;
    var tasks       = [

        //load objects
        function(callback) {
            self.findByType(custObjType, options, function(err, custObjectDocs) {
                custObjects = custObjectDocs;
                callback(err);
            });
        },

        //load ordering
        function(callback) {
            self.loadSortOrdering(custObjType, function(err, ordering) {
                sortOrder = ordering;
                callback(err);
            });
        }
    ];
    async.parallel(tasks, function(err, results) {
        custObjects = CustomObjectService.applyOrder(custObjects, sortOrder);
        cb(err, custObjects);
    });
};


CustomObjectService.prototype.loadSortOrdering = function(custObjType, cb) {
    if (pb.utils.isObject(custObjType)) {
        custObjType = custObjType[pb.DAO.getIdField()] + '';
    }
    else if (!pb.utils.isString(custObjType)) {
        throw new Error('An invalid custom object type was provided: '+(typeof custObjType)+':'+custObjType);
    }

    var dao = new pb.DAO();
    dao.loadByValue('custom_object_type', custObjType, CustomObjectService.CUST_OBJ_SORT_COLL, cb);
};

CustomObjectService.prototype.findByType = function(type, options, cb) {
    if (pb.utils.isFunction(options)) {
        cb = options;
        options = {};
    }
    else if (!pb.utils.isObject(options)) {
        options = {};
    }

    //ensure a where clause
    if (!pb.utils.isObject(options.where)) {
        options.where = {};
    }

    var typeStr = type;
    if (pb.utils.isObject(type)) {
        typeStr = type[pb.DAO.getIdField()] + '';
    }
    options.where.type = typeStr;

    var dao = new pb.DAO();
    dao.query(CustomObjectService.CUST_OBJ_COLL, options.where, options.select, options.order, options.limit, options.offset).then(function(result) {
        cb(util.isError(result) ? result : null, result);
    });
};

CustomObjectService.prototype.findTypes = function(cb) {

    var order = [
        [NAME_FIELD, pb.DAO.ASC]
    ];
    var dao  = new pb.DAO();
	dao.query(CustomObjectService.CUST_OBJ_TYPE_COLL, pb.DAO.ANYWHERE, pb.DAO.PROJECT_ALL, order).then(function(custObjTypes) {
        if (util.isArray(custObjTypes)) {
            //currently, mongo cannot do case-insensitive sorts.  We do it manually
            //until a solution for https://jira.mongodb.org/browse/SERVER-90 is merged.
            custObjTypes.sort(function(a, b) {
                var x = a.name.toLowerCase();
                var y = b.name.toLowerCase();

                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
            });
        }
        cb(util.isError(custObjTypes) ? custObjTypes : null, custObjTypes);
    });
};

CustomObjectService.prototype.countByType = function(type, where, cb) {
    if (pb.utils.isFunction(where)) {
        cb = where;
        where = {};
    }
    else if (!pb.utils.isObject(where)) {
        where = {};
    }

    var typeStr = type;
    if (pb.utils.isObject(type)) {
        typeStr = type[pb.DAO.getIdField()] + '';
    }
    where.type = typeStr;

    var dao = new pb.DAO();
    dao.count(CustomObjectService.CUST_OBJ_COLL, where, cb);
};

CustomObjectService.prototype.loadById = function(id, cb) {
    this.loadBy(undefined, pb.DAO.getIDWhere(id), cb);
};

CustomObjectService.prototype.loadByName = function(type, name, cb) {
    var where = {};
    where[NAME_FIELD] = name;
    this.loadBy(type, where, cb);
};

CustomObjectService.prototype.loadBy = function(type, where, cb) {
    if (!pb.validation.isIdStr(type, false) || !pb.validation.isObj(where, true) || pb.validation.isEmpty(where)) {
        throw new Error('The type, where must be provided in order to load a custom object');
    }

    if (type) {
        where.type = type;
    }
    var dao = new pb.DAO();
    dao.loadByValues(where, CustomObjectService.CUST_OBJ_COLL, cb);
};

CustomObjectService.prototype.loadTypeById = function(id, cb) {
    this.loadTypeBy(pb.DAO.getIDWhere(id), cb);
};

CustomObjectService.prototype.loadTypeByName = function(name, cb) {
    name      = CustomObjectService.getCustTypeSimpleName(name);
    var where = {};
    where[NAME_FIELD] = name;
    this.loadTypeBy(where, cb);
};

CustomObjectService.prototype.loadTypeBy = function(where, cb) {
    if (!pb.validation.isObj(where, true) || pb.validation.isEmpty(where)) {
        throw new Error('The type, where must be provided in order to load a custom object type');
    }

    var dao = new pb.DAO();
    dao.loadByValues(where, CustomObjectService.CUST_OBJ_TYPE_COLL, cb);
};

CustomObjectService.prototype.validate = function(custObj, custObjType, cb) {

    var self   = this;
    var errors = [];
    var dao    = new pb.DAO();
    var tasks  = [

        //validate object type
        function(callback) {
            if (custObj.object_type !== CustomObjectService.CUST_OBJ_COLL) {
                errors.push(CustomObjectService.err('type', "The object type must be: "+custObj.object_type));
            }
            callback(null);
        },

        //validate the type
        function(callback) {
            if (!pb.validation.isIdStr(custObj.type) || custObj.type !== custObjType[pb.DAO.getIdField()].toString()) {
                errors.push(CustomObjectService.err('type', "The type must be an ID string and must match the describing custom object type's ID"));
            }
            callback(null);
        },

        //validate the name
        function(callback) {
            if (!pb.validation.isNonEmptyStr(custObj.name, true)) {
                errors.push(CustomObjectService.err('name', 'The name cannot be empty'));
                return callback(null);
            }

            //test uniqueness of name
            var where = {
                type: custObjType[pb.DAO.getIdField()].toString()
            };
            where[NAME_FIELD] = new RegExp('^'+pb.utils.escapeRegExp(custObj.name)+'$', 'i');
            dao.unique(CustomObjectService.CUST_OBJ_COLL, where, custObj[pb.DAO.getIdField()], function(err, isUnique){
                if (!isUnique) {
                    errors.push(CustomObjectService.err('name', 'The name '+custObj.name+' is not unique'));
                }
                callback(err);
            });
        },

        //validate other fields
        function(callback) {
            self.validateCustObjFields(custObj, custObjType, function(err, fieldErrors) {
                if (util.isArray(fieldErrors)) {
                    pb.utils.arrayPushAll(fieldErrors, errors);
                }
                callback(err);
            });
        }
    ];
    async.series(tasks, function(err, results) {
        cb(err, errors);
    });
};

CustomObjectService.prototype.validateCustObjFields = function(custObj, custObjType, cb) {

    var errors = [];
    var tasks = pb.utils.getTasks(Object.keys(custObjType.fields), function(keys, i) {
        return function(callback) {

            //check for excption
            var fieldName = keys[i];
            if (fieldName === NAME_FIELD) {
                //validated independently in main validation function
                return callback(null);
            }

            //get value
            var val = custObj[fieldName];

            //execute validation procedure
            var field          = custObjType.fields[fieldName];
            var fieldType      = field.field_type;
            var isValid        = AVAILABLE_FIELD_TYPES[fieldType];
            if (!isValid(val, false)) {
                errors.push(CustomObjectService.err(fieldName, 'An invalid value ['+val+'] was found.'));
            }
            callback(null);
        };
    });
    async.series(tasks, function(err, results) {
        cb(err, errors);
    });
};

/**
 * Validates a Custom Object Type.
 * @method validateType
 * @param {Object} custObjType The object to validate
 * @param {Function} cb A callback function that provides two parameters: The
 * first, an error, if exists. The second is an array of objects that represent
 * validation errors.  If the 2nd parameter is an empty array it is safe to
 * assume that validation passed.
 */
CustomObjectService.prototype.validateType = function(custObjType, cb) {
    if (!pb.validation.isObj(custObjType)) {
        return cb(new Error('The type descriptor must be an object: '+(typeof custObjType)));
    }

    var self   = this;
    var errors = [];
    var dao    = new pb.DAO();
    var tasks  = [

        //validate the name
        function(callback) {
            if (!pb.validation.isNonEmptyStr(custObjType.name)) {
                errors.push(CustomObjectService.err('name', 'The name cannot be empty'));
                return callback(null);
            }

            //test uniqueness of name
            var where = {};
            where[NAME_FIELD] = new RegExp('^'+pb.utils.escapeRegExp(custObjType.name)+'$', 'i');
            dao.unique(CustomObjectService.CUST_OBJ_TYPE_COLL, where, custObjType[pb.DAO.getIdField()], function(err, isUnique){
                if (!isUnique) {
                    errors.push(CustomObjectService.err('name', 'The name '+custObjType.name+' is not unique'));
                }
                callback(err);
            });
        },

        //validate the fields
        function(callback) {

            if (!pb.validation.isObj(custObjType.fields)) {
                errors.push(CustomObjectService.err('fields', 'The fields property must be an object'));
                return callback(null);
            }

            //get the supported object types
            self.getReferenceTypes(function(err, types) {
                if (util.isError(err)) {
                    return callback(err);
                }

                var typesHash = pb.utils.arrayToHash(types);
                for (var fieldName in custObjType.fields) {
                    if (!pb.validation.isNonEmptyStr(fieldName)) {
                        errors.push(CustomObjectService.err('fields.', 'The field name cannot be empty'));
                    }
                    else {
                        var fieldErrors = self.validateFieldDescriptor(custObjType.fields[fieldName], typesHash);
                        pb.utils.arrayPushAll(fieldErrors, errors);
                    }
                }
                callback(null);
            });
        }
    ];
    async.series(tasks, function(err, results) {
        cb(err, errors);
    });
};

/**
 * Validates that the field descriptor for a custom object type.
 * @method validateFieldDescriptor
 * @param {String} field
 * @param {Array} customTypes
 * @return {Array} An array of objects that contain two properties: field and
 * error
 */
CustomObjectService.prototype.validateFieldDescriptor = function(field, customTypes) {
    var errors = [];
    if (!pb.validation.isObj(field)) {
        errors.push(CustomObjectService.err('', 'The field descriptor must be an object: '+(typeof field)));
    }
    else {

        if (!AVAILABLE_FIELD_TYPES[field.field_type]) {
            errors.push(CustomObjectService.err('field_type', 'An invalid field type was specified: '+field.field_type));
        }
        else if (field.field_type === PEER_OBJECT_TYPE || field.field_type === CHILD_OBJECTS_TYPE) {
            if (!customTypes[field.object_type]) {
                errors.push(CustomObjectService.err('object_type', 'An invalid object type was specified: '+field.object_type));
            }
        }
    }
    return errors;
};

/**
 * Retrieves an array of all of the available object types that can be
 * referenced as a child or peer object.
 * @method getReferenceTypes
 * @param {Function} cb A callback that takes two parameters: The first, an
 * error, if occurs.  The second is an array of all of the available object
 * types that can be referenced as a peer or child object.
 */
CustomObjectService.prototype.getReferenceTypes = function(cb) {

    var select                  = {};
    select[NAME_FIELD]          = 1;
    select[pb.DAO.getIdField()] = 0;
    var dao                     = new pb.DAO();
    dao.query(CustomObjectService.CUST_OBJ_TYPE_COLL, {}, select).then(function(types) {
        if (util.isError(types)) {
            return cb(result);
        }

        var allTypes = pb.utils.clone(AVAILABLE_REFERENCE_TYPES);
        for (var i = 0; i < types.length; i++) {
            allTypes.push('custom:'+types[i][NAME_FIELD]);
        }
        cb(null, allTypes);
    });
};

CustomObjectService.prototype.save = function(custObj, custObjType, cb) {
    if (!pb.validation.isObj(custObj, true)) {
        throw new Error('The custom object must be a valid object.');
    }

    var self = this;
    custObj.object_type = CustomObjectService.CUST_OBJ_COLL;
    this.validate(custObj, custObjType, function(err, errors) {
        if (util.isError(err) || errors.length > 0) {
            return cb(err, errors);
        }

        var dao = new pb.DAO();
        dao.update(custObj).then(function(result) {
            cb(util.isError(result) ? result : null, result);
        });
    });
};

CustomObjectService.prototype.saveType = function(custObjType, cb) {
    if (!pb.validation.isObj(custObjType, true)) {
        throw new Error('The custom object type must be a valid object.');
    }

    var self = this;
    custObjType.object_type = CustomObjectService.CUST_OBJ_TYPE_COLL;
    this.validateType(custObjType, function(err, errors) {
        if (util.isError(err) || errors.length > 0) {
            return cb(err, errors);
        }

        var dao = new pb.DAO();
        dao.update(custObjType).then(function(result) {
            cb(util.isError(result) ? result : null, result);
        });
    });
};

CustomObjectService.getStaticReferenceTypes = function() {
    return pb.utils.clone(AVAILABLE_REFERENCE_TYPES);
};

CustomObjectService.isReferenceFieldType = function(fieldType) {
    return fieldType === PEER_OBJECT_TYPE || fieldType === CHILD_OBJECTS_TYPE;
};

CustomObjectService.isCustomObjectType = function(objType) {
    return pb.utils.isString(objType) && objType.indexOf(CUST_OBJ_TYPE_PREFIX) === 0;
};

CustomObjectService.getCustTypeSimpleName = function(name) {
    if (pb.utils.isString(name)) {
        name = name.replace(CUST_OBJ_TYPE_PREFIX, '');
    }
    return name;
};

CustomObjectService.formatRawForType = function(post, custObjType) {

    //remove system fields if posted back
    delete post[pb.DAO.getIdField()];
    delete post.created;
    delete post.last_modified;

    //apply types to fields
    for(var key in custObjType.fields) {

        if(custObjType.fields[key].field_type == 'number') {
            if(post[key]) {
                post[key] = parseFloat(post[key]);
            }
            if (isNaN(post[key]) || !post[key]) {
                post[key] = null;
            }
        }
        else if(custObjType.fields[key].field_type == 'date') {
            if(post[key]) {
                post[key] = new Date(post[key]);
            }
            else {
                post[key] = null;
            }
        }
        else if(custObjType.fields[key].field_type == CHILD_OBJECTS_TYPE) {
            if(post[key]) {
                post[key] = post[key].split(',');
            }
            else {
                post[key] = [];
            }
        }
        else if (custObjType.fields[key].field_type == PEER_OBJECT_TYPE) {
            if (!post[key]) {
                post[key] = null;
            }
        }
    }
    post.type = custObjType[pb.DAO.getIdField()].toString();
};

CustomObjectService.formatRawType = function(post, ls) {

    //document shell
    var objectTypeDocument = {
        object_type: CustomObjectService.CUST_OBJ_TYPE_COLL,
        name: post.name,
        fields: {
            name: {
                field_type: 'text'
            }
        }
    };

    //ensure the field order is specified
    if(!post.field_order) {
        return objectTypeDocument;
    }

    //create an array from the comma delimited list
    fieldOrder = post.field_order.split(',');

    //iterate over posted field orderings to build the field definitions
    for(var i = 0; i < fieldOrder.length; i++) {

        var index = fieldOrder[i];
        var field = post['value_' + index];
        if(field) {
            if(objectTypeDocument.fields[field]) {
                continue;
            }

            objectTypeDocument.fields[field] = {
                field_type: post['field_type_' + index]
            };
        }
        else if(post['date_' + index]) {
            if(objectTypeDocument.fields[post['date_' + index]]) {
                continue;
            }

            objectTypeDocument.fields[post['date_' + index]] = {
                field_type: 'date'
            };
        }
        else if(post['peer_object_' + index]) {
            if(objectTypeDocument.fields[post['peer_object_' + index]]) {
                continue;
            }

            if(post['field_type_' + index] == ls.get('OBJECT_TYPE')) {
                return null;
            }

            objectTypeDocument.fields[post['peer_object_' + index]] = {
                field_type: 'peer_object', object_type: post['field_type_' + index]
            };
        }
        else if(post['child_objects_' + index]) {
            if(objectTypeDocument.fields[post['child_objects_' + index]]) {
                continue;
            }

            if(post['field_type_' + index] == ls.get('OBJECT_TYPE')) {
                return null;
            }

            objectTypeDocument.fields[post['child_objects_' + index]] = {
                field_type: 'child_objects', object_type: post['field_type_' + index]
            };
        }
    }

    return objectTypeDocument;
};

CustomObjectService.formatRawSortOrdering = function(post, sortOrder) {
    delete post.last_modified;
    delete post.created;
    delete post[pb.DAO.getIdField()];

    var sortOrderDoc = pb.DocumentCreator.create('custom_object_sort', post, ['sorted_objects']);
    if (!sortOrderDoc) {
        return sortOrderDoc;
    }

    //merge the old and new
    if (pb.utils.isObject(sortOrder)) {
        pb.utils.merge(sortOrderDoc, sortOrder);
        return sortOrder;
    }
    return sortOrderDoc;
};

CustomObjectService.setFieldTypesUsed = function(custObjTypes, ls) {
    if (!util.isArray(custObjTypes)) {
        return;
    }

    var map                 = {};
    map['text']             = ls.get('TEXT');
    map['number']           = ls.get('NUMBER');
    map['date']             = ls.get('DATE');
    map[PEER_OBJECT_TYPE]   = ls.get('PEER_OBJECT');
    map[CHILD_OBJECTS_TYPE] = ls.get('CHILD_OBJECTS');

    // Make the list of field types used in each custom object type, for display
    for(var i = 0; i < custObjTypes.length; i++) {

        var fieldTypesUsed = {};
        for(var key in custObjTypes[i].fields) {

            var fieldType = custObjTypes[i].fields[key].field_type;
            fieldTypesUsed[map[fieldType]] = 1;
        }

        fieldTypesUsed = Object.keys(fieldTypesUsed);
        custObjTypes[i].fieldTypesUsed = fieldTypesUsed.join(', ');
    }
};


CustomObjectService.applyOrder = function(custObjects, sortOrder) {
    if (!util.isArray(custObjects)) {
        throw new Error('The custObjects parameter must be an array');
    }

    //sort by name (case-insensitive)
    if(!pb.utils.isObject(sortOrder)) {
        //currently, mongo cannot do case-insensitive sorts.  We do it manually
        //until a solution for https://jira.mongodb.org/browse/SERVER-90 is merged.
        custObjects.sort(function(a, b) {
            var x = a.name.toLowerCase();
            var y = b.name.toLowerCase();

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
    }
    else {
        var customObjectSort = sortOrder.sorted_objects;
        var sortedObjects    = [];
        for(var i = 0; i < customObjectSort.length; i++)
        {
            for(var j = 0; j < custObjects.length; j++)
            {
                if(custObjects[j]._id.equals(ObjectID(customObjectSort[i])))
                {
                    sortedObjects.push(custObjects[j]);
                    custObjects.splice(j, 1);
                    break;
                }
            }
        }

        sortedObjects.concat(custObjects);
        custObjects = sortedObjects;
    }
    return custObjects;
};

/**
 * Creates a validation error field
 * @static
 * @method err
 * @param {String} field The field in the object that contains the error
 * @param {String} err A string description of the error
 * @return {Object} An object that describes the validation error
 */
CustomObjectService.err = function(field, err) {
    return {
        field: field,
        msg: err
    };
};

CustomObjectService.createErrorStr = function(errors, msg) {
    var errStr = '';
    if (msg) {
        errStr += msg + '\n';
    }

    errStr += '<ul>';
    for(var i = 0; i < errors.length; i++) {
        var err = errors[i];

        errStr += '<li>';
        if (err.field) {
            errStr += err.field + ': ';
        }
        errStr += HtmlEncoder.htmlEncode(err.msg) + '</li>';
    }
    errStr += '</ul>';
    return errStr;
};

//exports
module.exports = CustomObjectService;
