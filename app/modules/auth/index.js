const env = require('./../../../env'),
    md5 = require('md5'),
    actions = require('./route_action'),
    db = require('./../db'),
    helper = require('./../helper');


module.exports = {
    //авторизация пользователя
    auth: (request, response, callback) => {
        const that = module.exports, body = request.body;
        if (!body.name || !body.password) {
            helper.response.error(request, response, 'Требуется указать логин и пароль пользователя', 400, false);
        }

        //ищем пользователя по логину
        db.users.get_by_login(request, response, (error, db_user) => {
            if (!db_user) {
                helper.response.error(request, response, 'Пользователь с таким логином не найден', 400, false);
            }
            //проверяем пароль
            if (db_user.password !== helper.encrypt_md5(body.password)) {
                helper.response.error(request, response, 'Ввенённый пароль неверен', 400, false);
            }
            //генерируем токен
            db_user.token = helper.get_token(db_user);

            //пишем JWT в Redis
            helper.redis.set(db_user.token, JSON.stringify(db_user));

            //возвращаем пользователю авторизационные данные
            helper.redis.get(db_user.token, (string) => {
                db_user = JSON.parse(string);
                callback(db_user);
            });
        });
    },
    //проверяет, есть ли у пользователя права выполнять переданное действие
    check_access: (request, response, action, callback) => {
        const that = module.exports;
        if (!action) {
            that.response.error(request, response, 'Извините, произошла ошибка, пожалуйста, попробуйте позже', 500, false);
        }

        db.actions.get_by_code(request, response, action, (error, action) => {
            let findAction = false;
            if (!action || !action.length) callback();

            if (action.roles && !action.roles.length) {
                helper.response.error(request, response, 'У вас нет прав на выполнение действия.', 403, false);
            }

            request.params.id = request.user.id;
            db.users.select(request, response, (error, user) => {
                action.roles.forEach(role => {
                    user.roles.forEach(user_role => { if (parseInt(user_role.id) === parseInt(role.id)) findAction = true; });
                });
                if (!findAction) {
                    helper.response.error(request, response, 'У вас нет прав на выполнение действия.', 403, false);
                } else {
                    callback();
                }
            });
        });
    }
};