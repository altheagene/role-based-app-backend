const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host : 'localhost',
    user : 'root',
    password: 'Soraya128!',
    database: 'full_stack_app'
})

module.exports = db