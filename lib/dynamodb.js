"use strict";
const aws = require("aws-sdk");
const { through } = require('@microws/streams');

const retry = require('@lifeomic/attempt').retry;

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

/**
 * @callback batchGet
 * @param {string} ids Some cool ids
 * @param {string} msg Message to throw if it fails
 *
 *
 * @typedef DynamoDB
 * @type {Object}
 * @property {batchGet} batchGet
 * @property {function(AWS.DynamoDB.DocumentClient.QueryInput)} query
 * @property {function(AWS.DynamoDB.DocumentClient.QueryInput)} streamFromTable
 */

/**
 * @param {Object} config
 * @returns {DynamoDB}
 */
module.exports = function (config) {
    let service = new aws.DynamoDB.DocumentClient({
        maxRetries: 2,
        convertEmptyValues: true,
        httpOptions: {
            connectTimeout: 2000,
            timeout: 5000,
            // agent: new https.Agent({
            //     ciphers: 'ALL',
            //     secureProtocol: 'TLSv1_method',
            // })
        },
        ...config
    });
    var obj = {
        _service: service,
        get: async function (table, id, msg) {
            try {
                let item = await service.get({
                    TableName: table,
                    Key: id
                }).promise();
                return item.Item;
            } catch (e) {
                throw err(new Error(e.message + " while " + msg), { e });
            }
        },
        /**@type {batchGet} */
        batchGet: async function (ids, msg) {
            try {
                let docs = await service.batchGet({
                    RequestItems: ids
                }).promise();
                if (docs.UnprocessedKeys !== undefined && Object.keys(docs.UnprocessedKeys).length > 0) {
                    throw err(new Error("Not enough Capacity to Read"));
                }
                return docs.Responses;
            } catch (e) {
                throw err(new Error(e.message + " while " + msg), { e });
            }
        },
        query: async function (params, msg) {
            try {
                let docs = await service.query(params).promise();
                return docs.Items;
            } catch (e) {
                throw err(new Error(e.message + " while " + msg), { e });
            }
        },
        streamFromTable: function (params, { limit, maxSize } = {}) {
            let pass = through(async obj => {
                return obj;
            });
            let shouldContinue = true;
            (async () => {
                while (shouldContinue) {
                    let docs = await this.query(params);
                    docs.forEach(item => pass.write(item));
                    shouldContinue = false;
                }
                pass.end();
            })();
            return pass;
        },
        update: async function (table, key, body) {
            let params = {
                TableName: table,
                Key: key,
                UpdateExpression: "set ",
                ExpressionAttributeNames: {},
                ExpressionAttributeValues: {},
                ReturnValues: "ALL_NEW"
            };
            let fields = [];
            Object.keys(body).forEach((field, i) => {
                if (!(field in key)) {
                    fields.push(`#field${i}=:value${i}`);
                    params.ExpressionAttributeNames[`#field${i}`] = field;
                    params.ExpressionAttributeValues[`:value${i}`] = body[field] || null;
                }
            });
            params.UpdateExpression = "set " + fields.join(", ");

            return await service.update(params).promise();
        }
    };
    return obj;
};
