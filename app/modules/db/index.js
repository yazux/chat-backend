"use strict";

const {Client, Pool} = require('pg'),
    helper = require('./../helper'),
    {validate} = require('indicative'),
    moment = require('moment');

const pgClient = new Client({
    user: 'admin_chat',
    host: 'localhost',
    database: 'admin_chat',
    password: 'Bb103ecc',
    port: 5432,
});
pgClient.connect();
module.exports = {
    query: (text, params) =>  {
        return pgClient.query(text, params);
    },
    get: (request, response, fields, table) => {
        let query_string = 'SELECT ' + fields.join(', ') + ' FROM ' + table,
            count_query_string = 'SELECT COUNT(id) FROM ' + table,
            operators = ['<', '>', '=', '!=', '%', '=%', '%=', '>=', '<='], filter, result = {
                current_page: 0,
                last_page: 0,
                items_per_page: 0,
                order_by: '',
                order_type: '',
                items: []
            };
        //строим фильтр
        if (request.query && request.query.filter) {
            //строим фильтр
            filter = JSON.parse(request.query.filter);
            if (typeof filter === 'object') {
                filter.forEach((item, i) => {
                    //проверяем параметры
                    if (item.length > 4) {
                        helper.response.error(
                            request, response,
                            'В фильтре доступно указывть максимум 4 параметра.',
                            400, false
                        );
                    }
                    //проверяем поле
                    if (!(fields.indexOf(item[0]) + 1)) {
                        helper.response.error(
                            request, response,
                            "В таблице '" + table + "' нет поля '" + item[0] + "'. " +
                            'Доступные поля: ' + fields.join(', '),
                            400, false
                        );
                    }
                    //проверяем оператор
                    if (!(operators.indexOf(item[1]) + 1)) {
                        helper.response.error(
                            request, response,
                            'Неверный оператор ' + "'" + item[1] + "'. " +
                            'Оператор может быть одним из: ' + operators.join(', '),
                            400, false
                        );
                    }

                    if (i) { //если это не первое условие, то добавляем AND или OR
                        //проверяем оператор для доп условий
                        if (!(['OR', 'AND'].indexOf(item[3].toUpperCase()) + 1)) {
                            helper.response.error(
                                request, response,
                                'При фильтрации по нескольким параметрам, ' +
                                '4-тый атрибут должен быть AND или OR',
                                400, false
                            );
                        }
                        query_string += ' ' + item[3].toUpperCase() + ' ';
                    } else {
                        query_string += ' WHERE ';
                    }

                    //если сравниваемый параметр массив, то используем IN
                    if (typeof item[2] === 'object') {
                        query_string += item[0] + " IN (" + item[2].join(', ') + ")";
                    } else {
                        //удаляем одинарные ковычки
                        if ((item[2].indexOf("'") + 1)) {
                            item[2] = item[2].replace(/'/g, "");
                        }
                        switch (item[1]) {
                            case '%':
                                query_string += item[0] + " LIKE '%" + item[2] + "%'";
                                break;
                            case '=%':
                                query_string += item[0] + " LIKE '" + item[2] + "%'";
                                break;
                            case '%=':
                                query_string += item[0] + " LIKE '%" + item[2] + "'";
                                break;
                            default:
                                query_string += item[0] + ' ' + item[1] + ' ' + item[2];
                                break;
                        }
                    }

                });
            }
        }
        //добавляем сортировку из данных 'order_by', 'order_type'
        if (request.query && request.query.order_by) {
            let order_by = request.query.order_by,
                order_type = request.query.order_type;
            result.order_by = order_by;
            result.order_type = order_type;
            //проверяем поле сортировки
            if (!(fields.indexOf(order_by) + 1)) {
                helper.response.error(
                    request, response,
                    "В таблице '" + table + "' нет поля '" + order_by + "'. " +
                    'Доступные поля для сортировки: ' + fields.join(', '),
                    400, false
                );
            }

            query_string += ' ORDER BY ' + order_by;

            //добавляем направление сортировки
            if (order_type) {
                order_type = order_type.toUpperCase();
                //проверяем направление сортировки
                if (!(['ASC', 'DESC'].indexOf(order_type) + 1)) {
                    helper.response.error(
                        request, response,
                        "'" + order_type + "' не является направлением сортировки. " +
                        "Доступные направления: ASC, DESC.",
                        400, false
                    );
                }

                query_string += ' ' + order_type;
            } else {
                query_string += ' ASC';
            }
        } else {
            query_string += ' ORDER BY id ASC';
        }

        //строим постраничную пагинацию
        if (request.query && request.query.count) {
            let count = request.query.count, offset = 0;
            result.items_per_page = parseInt(count);
            result.current_page = 1;
            //проверяем на целое число
            if (parseInt(count) != count) {
                helper.response.error(
                    request, response,
                    "В поле 'count' требуется указать целое число",
                    400, false
                );
            }
            //проверяем страницу
            if (request.query.page) {
                let page = request.query.page;
                result.current_page = parseInt(page);
                //проверяем на целое число
                if (parseInt(page) != page) {
                    helper.response.error(
                        request, response,
                        "В поле 'page' требуется указать целое число",
                        400, false
                    );
                }
                offset = (parseInt(page) - 1) * parseInt(count);
                query_string += ' OFFSET ' + offset + ' LIMIT ' + count;
            } else {
                query_string += ' LIMIT ' + count;
            }

            return pgClient.query(count_query_string).catch(e => helper.response.error(request, response, e.message, 500, e)).then((resp) => {
                return pgClient.query(query_string).catch(e => helper.response.error(request, response, e.message, 500, e)).then(r => {
                    result.last_page = parseInt((resp.rows && resp.rows[0]) ? resp.rows[0].count : 1);
                    result.items = r.rows;
                    return result;
                });
            });
        } else {
            return pgClient.query(query_string).catch(e => helper.response.error(request, response, e.message, 500, e)).then(resp => {
                result.items = resp.rows;
                return result;
            });
        }
    },
    get_many_to_many: (request, response, table1, table2, relation_table, keys, key, table1_items, callback) => {
        const that = module.exports;

        let inputs = Object.assign({}, {
            table1: table1,
            table2: table2,
            relation_table: relation_table,
            keys: keys,
            key: key,
            table1_items: table1_items
        });

         //table2_fields = that[table2].fields,
        let table1_items_id = table1_items.map(item => {return item.id}),
            table1_key = keys[table1],
            table2_key = keys[table2];
        //table2_fields.splice(table2_fields.indexOf('id'), 1);
        //table2_fields = table2_fields.map(field => { return 'chat.' + table2 + '.' + field; }).join(', ');

        let query = "SELECT chat." + table2 + ".*, " +
            "chat." + relation_table + "." + table1_key + "::int AS pivot_" + table1_key + ", " +
            "chat." + relation_table + "." + table2_key + "::int AS pivot_" + table2_key +
            " FROM chat." + table2 +
            " INNER JOIN chat." + relation_table + " ON chat." + table2 + ".id = chat." + relation_table + "." + table2_key +
            " WHERE chat." + relation_table + "." + table1_key + " IN (" + table1_items_id.join(', ') + ")";

        that.query(query).catch(e => helper.response.error(request, response, e.message + ', query: ' + query + ', inputs: ' + JSON.stringify(inputs), 500)).then((r) => {
            if (r.rows.length) {
                let table2_items = r.rows;
                table1_items = table1_items.map(table1_item => {
                    table1_item[key] = table2_items.filter(table2_item => {
                        return (parseInt(table1_item.id) === parseInt(table2_item['pivot_' + table1_key])) ? table1_item : false;
                    });
                    return table1_item;
                });
            }
            callback(table1_items);
        });
    },
    validate: {
        int: function(variable) {
            return validate({data: parseInt(variable)}, {data: 'required|integer|min:1|max:9999999999'});
        }
    },
    actions: {
        table: 'chat.actions',
        _table: 'actions',
        schema: {
            name:        'required|min:2|max:50',
            code:        'required|min:2|max:255',
            description: 'min:2|max:1000'
        },
        fields: ['id', 'name', 'code', 'description'],
        get: (request, response, callback) => {
            const that = module.exports;
            that.get(request, response, that.actions.fields.concat(['id']), that.actions.table).then((r) => {
                callback(false, r);
            }).catch(e => helper.response.error(request, response, e.message, 500, e));
        },
        select: (request, response, callback) => {
            const that = module.exports;
            that.validate.int(request.params.id).catch((errors) => {
                helper.response.error(
                    request, response,
                    "Требуется указать целое число в качестве id",
                    400, false
                );
            }).then(() => {
                let actions_fields = that.actions.fields.map(item => { return that.actions.table + '.' + item; });
                let query =  "SELECT " + actions_fields.concat(['id']).join(', ') + " FROM " + that.actions.table +
                    " WHERE " + that.actions.table + ".id = " + request.params.id + " LIMIT 1";

                that.query(query).catch(e => helper.response.error(request, response, e.message, 500, e)).then((r1) => {
                    if (r1.rows.length) {
                        let keys = {};
                        keys[that.actions._table] = 'action_id';
                        keys[that.roles._table] = 'role_id';

                        that.get_many_to_many(
                            request, response,
                            that.actions._table, that.roles._table, that.role_action._table,
                            keys, 'roles', r1.rows,
                            (result) => {
                                callback(false, (result.length && result[0]) ? result[0]: []);
                            }
                        );

                    } else { callback(false, []); }
                });
            });
        },
        get_by_code: (request, response, code, callback) => {
            const that = module.exports;

            code = (code) ? code : request.params.code;

            console.log('code: ' + code);

            let actions_fields = that.actions.fields.map(item => { return that.actions.table + '.' + item; });
            let query =  "SELECT " + actions_fields.join(', ') + " FROM " + that.actions.table +
                " WHERE " + that.actions.table + ".code = '" + code + "' LIMIT 1";

            that.query(query).catch(e => helper.response.error(request, response, e.message, 500, e)).then((r1) => {
                if (r1.rows.length) {

                    let keys = {};
                    keys[that.actions._table] = 'action_id';
                    keys[that.roles._table] = 'role_id';

                    that.get_many_to_many(
                        request, response,
                        that.actions._table, that.roles._table, that.role_action._table,
                        keys, 'roles', r1.rows,
                        (result) => {
                            callback(false, (result.length && result[0]) ? result[0]: []);
                        }
                    );

                } else { callback(false, []); }
            });
        }
    },
    users_role: {
        table: 'chat.user_role',
        _table: 'user_role',
        fields: ['id', 'user_id', 'role_id'],
    },
    role_action: {
        table: 'chat.role_action',
        _table: 'role_action',
        fields: ['id', 'role_id', 'action_ud'],
    },
    roles: {
        table: 'chat.roles',
        _table: 'roles',
        schema: {
            name:       'required|min:1|max:255',
            description:   'min:1|max:1000',
        },
        fields: ['id', 'name', 'description'],
        select: (request, response, callback) => {
            const that = module.exports;
            that.validate.int(request.params.id).catch((errors) => {
                helper.response.error(
                    request, response,
                    "Требуется указать целое число в качестве id",
                    400, false
                );
            }).then(() => {
                let roles_fields = that.roles.fields.map(item => { return that.roles.table + '.' + item; });
                let query =  "SELECT " + roles_fields.join(', ') + " FROM " + that.roles.table +
                    " WHERE " + that.roles.table + ".id = " + request.params.id + " LIMIT 1";

                that.query(query).catch(e => helper.response.error(request, response, e.message, 500, e)).then((r1) => {
                    if (r1.rows.length) {
                        let keys = {};
                        keys[that.actions._table] = 'action_id';
                        keys[that.roles._table] = 'role_id';

                        that.get_many_to_many(
                            request, response,
                            that.roles._table, that.actions._table, that.role_action._table,
                            keys, 'actions', r1.rows,
                            (result) => {
                                callback(false, (result.length && result[0]) ? result[0]: []);
                            }
                        );
                    } else { callback(false, []); }
                });
            });
        },
        get_by_code: (request, response, callback) => {
            const that = module.exports;
            let roles_fields = that.roles.fields.map(item => { return that.roles.table + '.' + item; });
            let query =  "SELECT " + roles_fields.join(', ') + " FROM " + that.roles.table +
                " WHERE " + that.roles.table + ".code = '" + request.params.code + "' LIMIT 1";

            that.query(query).catch(e => helper.response.error(request, response, e.message, 500, e)).then((r1) => {
                if (r1.rows.length) {
                    that.roles.get_role_actions(request, response, r1.rows, (roles) => {
                        callback(false, (roles.length && roles[0]) ? roles[0] : []);
                    });
                } else { callback(false, []); }
            });
        }
    },
    users: {
        table: 'chat.users',
        _table: 'users',
        schema: {
            name:       'required|min:2|max:50',
            password:   'required|min:6|max:255',
            keyword:    'required|min:6|max:255',
            created_at: 'required|date'
        },
        fields: ['id', 'name', 'created_at'],
        post: (request, response, callback) => {
            const that = module.exports,
            body = request.body;

            if (body.password === body.keyword) {
                helper.response.error(request, response, 'Ключевое слово не может совпадать с паролем', 400, false);
            }
            if (body.password !== body.password_confirm) {
                helper.response.error(request, response, 'Пароли не совпадают', 400, false);
            }
            body.created_at = moment().format('YYYY-MM-DD HH:mm:ss');
            body.password   = helper.encrypt_md5(body.password);
            body.keyword    = helper.encrypt_md5(body.keyword);

            return validate(body, that.users.schema).then(() => {
                let query = 'INSERT INTO ' + that.users.table + ' (' + Object.keys(that.users.schema).join(', ') + ') ' +
                    "VALUES ('" + body.name + "', '" + body.password + "', '" + body.keyword + "', '" + body.created_at + "');",
                check_query = 'SELECT ' + that.users.fields.join(', ') + ' FROM ' + that.users.table +
                    " WHERE name = '" + body.name + "' LIMIT 1";

                that.query(check_query).catch(e => helper.response.error(request, response, e.message, 500, e)).then((resp) => {
                    if (resp.rows.length) {
                        helper.response.error(request, response, 'Пользователь с таким именем уже зарегистрирован', 400, false);
                    }
                    that.query(query).catch(e => helper.response.error(request, response, e.message, 500, e)).then((r) => {
                        that.query(check_query).catch(e => helper.response.error(request, response, e.message, 500, e)).then((resp) => {
                            callback(false, (resp.rows.length) ? resp.rows[0] : [] );
                        });
                    });
                });

            }).catch((errors) => {
                helper.response.error(
                    request, response,
                    "Проверьте все поля на корретность, одно из полей содержит ошибку",
                    400, false, false, errors
                );
            });
        },
        put: (request, response, callback) => {},
        get: (request, response, callback) => {
            const that = module.exports;
            that.get(request, response, that.users.fields, that.users.table).then((r) => {
                if (r && r.items && r.items.length) {
                    let keys = {};
                    keys[that.users._table] = 'user_id';
                    keys[that.roles._table] = 'role_id';

                    that.get_many_to_many(
                        request, response,
                        that.users._table, that.roles._table, that.users_role._table,
                        keys, 'roles', r.items,
                        (result) => {
                            r.items = (result && result.length) ? result: [];
                            callback(false, r);
                        }
                    );
                } else { callback(false, r); }
            }).catch(e => helper.response.error(request, response, e.message, 500, e));
        },
        select: (request, response, callback) => {
            const that = module.exports;
            that.validate.int(request.params.id).catch((errors) => {
                helper.response.error(
                    request, response,
                    "Требуется указать целое число в качестве id",
                    400, false
                );
            }).then(() => {

                let fields = Object.assign([], that.users.fields);
                fields.splice(fields.indexOf('id'), 1);

                let query =  "SELECT " + that.users.table + ".id::int, " + fields.join(', ') + " FROM " + that.users.table +
                    " WHERE " + that.users.table + ".id = " + request.params.id + " LIMIT 1";
                that.query(query).catch(e => helper.response.error(request, response, e.message, 500, e)).then((r1) => {
                    if (r1.rows.length) {
                        let keys = {};
                        keys[that.users._table] = 'user_id';
                        keys[that.roles._table] = 'role_id';

                        that.get_many_to_many(
                            request, response,
                            that.users._table, that.roles._table, that.users_role._table,
                            keys, 'roles', r1.rows,
                            (result) => {
                                callback(false, (result.length && result[0]) ? result[0]: []);
                            }
                        );
                    } else {
                        callback(false, []);
                    }
                });
            });
        },
        get_by_login: (request, response, callback) => {
            const that = module.exports;

            let user_fields = that.users.fields.filter(item => {
                if (item !== 'id') return that.users.table + '.' + item;
            });


            let query =  "SELECT " + that.users.table + ".id::int, " + user_fields.join(', ') + ", " + that.users.table + ".password" + " FROM " + that.users.table +
                " WHERE " + that.users.table + ".name = '" + request.body.name + "' LIMIT 1";


            that.query(query).then((r1) => {
                if (r1 && r1.rows.length) {

                    let keys = {};
                    keys[that.users._table] = 'user_id';
                    keys[that.roles._table] = 'role_id';

                    that.get_many_to_many(
                        request, response,
                        that.users._table, that.roles._table, that.users_role._table,
                        keys, 'roles', r1.rows,
                        (result) => {
                            callback(false, (result.length && result[0]) ? result[0]: []);
                        }
                    );

                } else { callback(false, []); }

            }).catch(e => helper.response.error(request, response, e.message + ', query: ' + query, 500));
        },
    }
};