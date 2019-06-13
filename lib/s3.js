"use strict";
const aws = require("aws-sdk");

module.exports = function (config) {
    let service = new aws.S3({
        ...config
    });
    var obj = {
        _service: service,
        streamFromFile: function ({ Bucket, Key, Range } = {}) {
            let obj = service.getObject({
                Bucket,
                Key,
                Range: Range || undefined
            });
            let stream = obj.createReadStream();
            stream.destroy = stream.destroy || stream.close || (() => {
                obj.abort();
            });
            [
                "httpHeaders",
                "httpUploadProgress",
                "httpDownloadProgress",
            ].map(event => {
                obj.on(event, (...args) => {
                    stream.emit(event, ...args);
                });
            });
            return stream;
        }
    };
    return obj;
};
