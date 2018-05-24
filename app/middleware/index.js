const helper = require('./../modules/helper');

module.exports = {
    require: {
        cors: (request, response, next) => {
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader('Access-Control-Allow-Headers',
                'Authorization, Content-Type, Origin, api_key, X-Requested-With, ' +
                'X-Auth-Token, token, Accept, X-PINGOTHER, boundary'
            );
            response.setHeader("Accept", "text/html, text/plain, application/xml, application/json, multipart/form-data, */*");
            response.setHeader('Content-Type', 'application/json');
            next();
        }
    },
    other: {
        //проверяет авторизован ли пользователь
        auth: (request, response, next) => {
            let token = request.get('Authorization');
            request.user = false;
            if (!token) { //проверяем начичие токена в заголовках
                helper.response.error(request, response, 'Требуется авторизация', 403);
            }
            helper.redis.get(token, (user) => { //получаем JWT из Redis
                if (!user) { //проверям пользователя
                    helper.response.error(request, response, 'Требуется авторизация', 403);
                } user = JSON.parse(user);

                //проверяем токен
                if (user.token !== token) {
                    helper.response.error(request, response, 'Требуется авторизация', 403);
                }
                request.user = user;
                next();
            });
        }
    }
};