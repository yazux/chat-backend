const helper = require('./../../modules/helper'),
    auth = require('./../../modules/auth'),
    db = require('./../../modules/db');

module.exports = {
    'get::/actions::auth': (request, response) => {
        auth.check_access(request, response, 'get_actions', () => {
            db.actions.get(request, response, (error, resp) => {
                helper.response.json(request, response, resp);
            });
        });
    },
    'get::/actions/:id::auth': (request, response) => {
        auth.check_access(request, response, 'get_actions', () => {
            db.actions.select(request, response, (error, resp) => {
                helper.response.json(request, response, resp);
            });
        });
    }
};