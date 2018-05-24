const helper = require('./../../modules/helper');
module.exports = {
    'get::/test::auth': (request, response) => {
        helper.response.json(request, response, 'Hello world this is test route!');
    }
};