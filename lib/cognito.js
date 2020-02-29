"use strict";
const aws = require("aws-sdk");

function err(err, opts = {}) {
    const origError = opts.e || {};
    delete opts.e;

    if (typeof Object.defineProperty === 'function') {
        Object.defineProperty(err, 'name', { writable: true, enumerable: false });
        Object.defineProperty(err, 'message', { writable: true, enumerable: true });
    }
    err.code = opts.code || origError.code || opts.name || null;
    err.name = opts.name || err.name || origError.name || err.code || 'Error';
    err.time = origError.time || new Date();

    err.requestId = typeof opts.requestId !== 'undefined' ? opts.requestId : origError.requestId;
    err.retryable = typeof opts.retryable !== 'undefined' ? opts.retryable : origError.retryable;
    err.retryDelay = typeof opts.retryDelay !== 'undefined' ? opts.retryDelay : origError.retryDelay;
    err.originalError = origError;

    return err;
}


module.exports = function (config) {
    let service = new aws.CognitoIdentityServiceProvider({
        ...config
    });
    var obj = {
        _service: service,
        setCustomAttributes: async function (userpool, username, attributes, msg) {
            try {
                let result = await service.adminUpdateUserAttributes({
                    UserAttributes: attributes,
                    UserPoolId: userpool,
                    Username: username
                }).promise();
            } catch (e) {
                throw err(new Error(e.message + " while " + msg), { e });
            }
        }
    };
    return obj;
};
