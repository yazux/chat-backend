const helper = require('./../../modules/helper'),
    auth = require('./../../modules/auth'),
    db = require('./../../modules/db');

module.exports = {
    'get::/users::auth': (request, response) => {
        auth.check_access(request, response, 'get_users', () => {
            db.users.get(request, response, (error, resp) => {
                helper.response.json(request, response, resp);
            });
        });
    },
    'get::/users/:id::auth': (request, response) => {
        auth.check_access(request, response, 'get_users', () => {
            db.users.select(request, response, (error, resp) => {
                helper.response.json(request, response, resp);
            });
        });
    },
    'post::/users': (request, response) => {
        auth.check_access(request, response, 'post_users', () => {
            db.users.post(request, response, (error, resp) => {
                helper.response.json(request, response, resp);
            });
        });
    },
    'delete::/users/:id::auth': async (request, response) => {
        auth.check_access(request, response, 'delete_users', () => {
            helper.response.json(request, response, 'delete user');
        });
    },
    'post::/auth': (request, response) => {
        auth.auth(request, response, (user) => {
            helper.response.json(request, response, user)
        });
    }
};