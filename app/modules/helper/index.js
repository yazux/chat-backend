const env = require('./../../../env'),
      md5 = require('md5'),
      actions = require('../auth/route_action'),
    redis = require("redis"),
    redis_client = redis.createClient({
        host: '127.0.0.1',
        port: 6379
    });

module.exports = {
    response: {
        json: (request, response, data, code) => {
            response.status((code) ? code : 200).json({
                status: (code) ? code : 200,
                request: {
                    body: request.body,
                    query: request.query,
                    params: request.params
                },
                errors: {
                    text: '',
                    trace: ''
                },
                response: data,
            }).end();
        },
        error: (request, response, data, code, error, next, trace) => {
            if (!(error instanceof Error)) {
                error = {
                    message: (data) ? data : 'Sorry, something went wrong, we are already working on this& :('
                };
            } else {
                trace = error.trace;
            }
            code = (code) ? code : ((error.status) ? error.status : 500);
            response.status(code).json({
                status: code,
                request: {
                    body: request.body,
                    query: request.query,
                    params: request.params
                },
                errors: {
                    text: error.message,
                    trace: trace
                },
                response: '',
            }).end();
        },
    },
    redis: {
        get: (key, callback) => {
            redis_client.get(key, (err, reply) => {
                callback((err) ? false : reply);
            });
        },
        set: (key, val) => {
            return redis_client.set(key, val);
        },
    },
    encrypt_md5: (password) => {
        return md5( password + env.password_salt );
    },
    get_token: (user) => {
        return md5( user.login + user.password + env.password_salt );
    }
};