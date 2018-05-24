const express = require('express'),
    fs = require('fs'),
    md5 = require('md5'),
    bodyParser = require('body-parser'),
    fileUpload = require('express-fileupload'),
    cluster = require('cluster'),
    env = require('./env');

const helper = require('./app/modules/helper'),
    middleware = require(env.app_dir + 'middleware'),
    components = require(env.app_dir + 'components');

/*-----------------------------------------------------*/
/*-----------------------------------------------------*/
/*-----------------------------------------------------*/

if(cluster.isMaster) {
    let numWorkers = require('os').cpus().length;

    console.log('Master cluster setting up ' + numWorkers + ' workers...');

    for(let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('online', (worker) => {
        console.log('Worker ' + worker.process.pid + ' is online');
    });

    cluster.on('exit', (worker, code, signal) => {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        cluster.fork();
    });
} else {
    const app = express();
    app.set('port', env.port);
    app.use(express.static(__dirname + '/app/public'));

    //включаем поддержку нужных форматов
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));



    //запускаем все middleware
    Object.keys(middleware.require).forEach((index) => {
        app.use(middleware.require[index]);
    });

    //запускаем все роуты из компонентов
    components.routes.forEach(route => {
        if ((['all','get','post','put','delete'].indexOf(route.method) + 1)) {
            if (route.middleware && middleware.other[route.middleware]) {
                app[route.method](route.url, middleware.other[route.middleware], route.route); //эквивалент записи app.get('/route', (req, res) => {});
            } else {
                app[route.method](route.url, route.route); //эквивалент записи app.get('/route', (req, res) => {});
            }
        }
    });


    app.use(function(err, req, res, next) {
        helper.response.error(req, res, false, false, err, next);
    });

    const server = app.listen(env.port, () => {
        console.log('Process ' + process.pid + ' is listening to all incoming requests');
    });
}





