/**
 * @module MicrowsAWS
 */

const aws = require("aws-sdk");
const secrets = require("./lib/secrets");
const dynamodb = require("./lib/dynamodb");
const S3 = require("./lib/s3");

/**
 * @typedef MicrowsAWS
 * @type {Object}
 * @property {import("./lib/dynamodb").DynamoDB} dynamodb
 */

/**
 * @param {import("aws-sdk/lib/config").ConfigurationOptions} config Standard AWS Configuration Object
 *
 * @returns {MicrowsAWS}
 */
function AWS(config = null) {
    return {
        secrets: secrets(config),
        dynamodb: dynamodb(config),
        S3: S3(config)
    };
}
AWS.AWS = aws;

module.exports = AWS;
