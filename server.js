const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'my$3cretk3yH3H3';

app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500']
}))

//====================== MIDDLEWARE ==========================

//parse JSON
app.use(express.json());

app.use(express.static('public'));

//log incoming requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
})

//log errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
})


app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});

let departments = [
    {
        deptId: 1,
        name: 'Engineering',
        description: 'Department of Engineering'
    },
    {
        deptId: 2,
        name: 'Human Resources',
        description: 'Department of Human Resources'
    }
]

let employees = []

let requests = [
    {
        //input dummy data
    }
]



app.post('/api/register', async (req, res) => {
    const {firstName, lastName, email, password, role = 'user'} = req.body;

    if(!firstName || !lastName || !email || !password){
        return res.status(400).send('First name, lastname, email, and password required!');
    }

    try{
        //Check if user exists
        const [rows] = await db.query(
            'SELECT * from accounts where email = ?',
            [email]
        );

        if(rows.length > 0){
            return res.status(409).json({message: 'User already exists!'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO accounts (firstName, lastName, email, password, role, verified) VALUES (?, ?, ?, ?, ?, ?)',
            [firstName, lastName, email, hashedPassword, role, false]
        )

        res.status(201).json({ message: 'Registered successfully'});
    }catch(err){
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
})

//verify registration email
app.post('/api/verifyemail', async (req, res) => {
    const {unverifiedEmail} = req.body;

    try{
        const [account] = await db.query(
            'UPDATE accounts SET verified = true WHERE email = ?',
            [unverifiedEmail]
        )

        if(account.affectedRows === 0){
            return res.status(404).json({message: 'User not found!'})
        }

        res.json({message: 'Email verified!'})

    }catch(err){
        return res.status(500).json({message: 'Internal server error!'})
    }
});


//API login
app.post('/api/login', async(req, res) => {
    const {email, password} = req.body;
    
    try{
        const [rows] = await db.query(
            'SELECT * FROM accounts WHERE email = ? AND verified = true',
            [email]
        )

        console.log('HI')
        if(rows.length > 0){
            const user = rows[0];
            
            if(!user && !await bcrypt.compare(user.password, password)){
                return res.status(401).json({message: 'Invalid credentials!'})
            }

            console.log('HELLO')
            //if user exists generate token
            const token = jwt.sign(
                {id: user.id, email: user.email, role: user.role},
                SECRET_KEY,
                {expiresIn : '1h'}
            )

            res.json({
                token, user: {email: user.email, role: user.role}
            })
        }

    }catch(err){
        return res.status(500).json({message: 'Internal server error!'});
    }
    
});


// ======================  GET ROUTES ===========================

//Protected Route === Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    
    const [rows] = await db.query(
        'SELECT * FROM accounts WHERE email = ?',
        [req.user.email]
    )

    res.json({user: rows[0]})
});

app.get('/api/requests', authenticateToken, (req, res) => {
    const user = req.user;
    const myRequests = requests.filter(r => r.email == user.email);

    res.json({myRequests})
})

app.get('/api/admin/departments', authenticateToken, authorizeRole('admin'), async (req, res) => {

    try{
        const [rows] = await db.query(
            'SELECT * from departments'
        )

        res.json({departments: rows})
    }catch(err){
        console.log(err)
    }
    
    
})

app.get('/api/admin/employees', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT e.*, a.firstName, a.lastName, a.email, d.name as deptName
            FROM employees e
            JOIN accounts a ON a.id = e.accountId
            JOIN departments d ON e.departmentId = d.deptId
            
        `);

        return res.status(200).json({ employees: rows });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error fetching employees' });
    }
});

app.get('/api/admin/accounts', authenticateToken, authorizeRole('admin'), async (req, res) => {
    
    try{
        const [rows] = await db.query(
            'SELECT * FROM accounts'
        );

        res.json({accounts: rows})
    }catch(err){

    }
})

//Admin-only route
app.get('/api/admin/dashboard', authenticateToken, authorizeRole('admin'), (req, res) => {
    res.json({message: 'Welcome to admin dashboard!', data: 'secret admin info'})
});

//Public route : Guest
app.get('/api/content/guest', (req, res) => {
    res.json({message: 'Public content for all visitors.'});
});

app.get('/api/admin/getaccount', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const {email} = req.query;

   try{
        const [rows] = await db.query(
            'SELECT * FROM accounts WHERE email = ?',
            [email]
        )

        if(rows.length > 0){
            const user = rows[0]
            res.status(201).json({
                    exists: true, 
                    message: 'This email already exists', 
                    user: {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        role: user.role,
                        verified: user.verified
                    }})
        }else{
            res.status(401).json({exists: false, message: 'This email is available'})
        }
    }catch(err){

    }

       
})

app.get('/api/admin/getemployee', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const {id} = req.query;

    const [rows] = await db.query(
        'SELECT e.*, a.email FROM employees e JOIN accounts a ON a.id = e.accountId  WHERE e.id = ?',
        [id]
    )

    res.status(200).json({employee: rows[0]})
})




// ============================ POST REQUESTS ===================================

app.post('/api/admin/addaccount', authenticateToken, authorizeRole('admin'), async(req, res) => {
    const {firstName, lastName, email, password, role, verified} = req.body;


    //hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    try{
        const [result] = await db.query(
            'INSERT INTO accounts (firstName, lastName, email, password, role, verified) VALUES (?, ?, ?, ?, ?, ?)',
            [firstName, lastName, email, hashedPassword, role, verified]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.status(201).json({ message: 'Successfully updated account!' });
    }catch(err){

    }

})


app.post('/api/admin/addemployee', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const {employeeId, email, position, deptId, hireDate} = req.body;
    console.log(employeeId)
    console.log(email)

    //check if email exists in user

    try{
        const [rows] = await db.query(
            'SELECT * FROM accounts WHERE email = ?',
            [email]
        )

        if(rows.length == 0){
            return res.status(200).json({message: 'There is no account associated with this email', accountExists : false, employeeExists: false});
        }

        const [rows2] = await db.query(
            'SELECT * FROM employees WHERE accountId = ?',
            [rows[0].id]
        )

        if(rows2.length > 0){
            return res.status(200).json({message: 'There is already an employee with this email', employeeExists : true, accountExists: true});
        }

        const [result] = await db.query(
            'INSERT INTO employees (employeeID, accountId, position, departmentId, hireDate) values(?, ?, ?, ?, ?)',
            [employeeId, rows[0].id, position, deptId, hireDate]
        )

        if(result.affectedRows == 0){
            return res.status(404).json({message: 'Error saving account!', employeeExists: false, accountExists: false})
        }
            
        res.status(201).json({message: 'New employee successfully added!',  employeeExists: false, accountExists: true})
    }catch(err){
        console.error(err)
    }
    
})

app.post('/api/admin/addrequest', authenticateToken, async (req, res) => {
    
})


// ============================== PUT REQUESTS =====================================
app.put('/api/admin/saveaccountedits', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const {firstName, lastName, email, role, verified, editingEmail} = req.body;

    try{
        const [result] = await db.query(
            'UPDATE accounts SET firstName = ?, lastName = ?, email = ?, role = ?, verified = ? WHERE email = ?',
            [firstName, lastName, email, role, verified, editingEmail]
        )

        if( result.affectedRows === 0){
            return res.status(404).json({message: 'Account not found!'})
        }

        return res.status(201).json({message: 'Successfully updated account!'})
    }catch(err){

    }
})

app.put('/api/admin/resetpassword', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const {email, password} = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = users.find(u => u.email == email);
    user.password = hashedPassword;

    res.json({message: 'Password successfully reset!'})
})

app.put('/api/admin/saveemployeedits', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const {id, employeeId, position, deptId, hireDate} = req.body

    const [result] = await db.query(
        'UPDATE accounts SET employeeID = ?, position = ?, deptId = ?, hireDate = ? WHERE id = ?',
        [employeeId, position, deptId, hireDate, id]
    )

    if(result.affectedRows === 0){
        res.status(404).json({message: 'Error saving edits!'});
    }

    res.status(201).json({message: 'Successfully saved edits!'})
})


// ============================= DELETE REQUESTS ================================

app.delete('/api/admin/deleteemployee', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const {id} = req.body;

    try{
        const [result] = await db.query(
            'DELETE FROM employees WHERE id = ?',
            [id]
        );

        if(result.affectedRows > 0){
            res.status(201).json({message: 'Employee successfully deleted.'})
        }

    }catch(err){
        console.error(err)
    }
    
})
function authenticateToken(req, res, next){
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token){
        return res.status(401).json({error : 'Access token required'});
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({error: 'Invalid or expired token.'});
        req.user = user;
        next();
    })
}

function authorizeRole(role){
    return (req, res, next) => {
        if(req.user.role !== role){
            return res.status(403).json({error: 'Access denied: insufficient permissions'});
        }

        next();
    }
}
