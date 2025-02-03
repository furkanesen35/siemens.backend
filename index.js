const initTables = require('./initTables');
const server = require('./server');

initTables().then(() => {
 server();
});