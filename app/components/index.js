const fs = require('fs'), COMPONENTS_DIR  = './app/components/';

//скрипт, который автоматически собирает все компоненты
let componentRoutes = {}, routes = [], route = {};


fs.readdirSync(COMPONENTS_DIR).forEach(file => {
    if ( fs.statSync(COMPONENTS_DIR + file).isDirectory() ) {
        //routes[ file ] = require('./' + file);
        componentRoutes = require('./' + file);
        Object.keys(componentRoutes).forEach(key => {
            route = key.split('::');
            routes.push({
                method: route[0],
                url: route[1],
                route: componentRoutes[key],
                middleware: (route[2]) ? route[2] : false
            });
        });
    }
});

module.exports = {routes: routes};