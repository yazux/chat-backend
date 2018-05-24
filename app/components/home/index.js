const helper = require('./../../modules/helper'),
    db = require('./../../modules/db');

module.exports = {
    'all::/': (request, response) => {
        helper.response.json(request, response, 'Hello world!');
    }
};