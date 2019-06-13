"use strict";
const aws = require("aws-sdk");
module.exports = function (config) {
    let service = new aws.SecretsManager(config);
    return {
        _service: service,
        /**
         * Returns a secret from secrets manager
         * @param {string} secretName
         */
        getSecret: async function (secretName) {
            let data = await service.getSecretValue({
                SecretId: secretName
            }).promise();
            return JSON.parse(data.SecretString);
        }
    }
};
