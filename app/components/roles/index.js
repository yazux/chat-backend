const helper = require('./../../modules/helper'),
    auth = require('./../../modules/auth'),
    db = require('./../../modules/db');

module.exports = {
    'get::/roles/:id::auth': (request, response) => {
        auth.check_access(request, response, 'get_roles', () => {
            db.roles.select(request, response, (error, resp) => {
                helper.response.json(request, response, resp);
            });
        });
    },
};