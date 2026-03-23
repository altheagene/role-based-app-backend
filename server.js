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
            
             const validPassword = await bcrypt.compare(password, user.password);
            if(!validPassword){
                return res.status(401).json({message: 'Invalid credentials!'});
            }
            console.log('HELLO')
            //if user exists generate token
            const token = jwt.sign(
                {id: user.id, email: user.email, role: user.role},
                SECRET_KEY,
                {expiresIn : '1h'}
            )

            res.status(200).json({
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

app.get('/api/requests', authenticateToken, async (req, res) => {
    try {
        const accountId = req.user.id;

        // Get employeeId
        const [employee] = await db.query(
            'SELECT id FROM employees WHERE accountId = ?',
            [accountId]
        );

        if(employee.length === 0){
            return res.status(404).json({ message: 'Employee not found' });
        }

        const employeeId = employee[0].id;

        // Get requests
        const [requests] = await db.query(
            `SELECT 
                r.id AS requestId,
                r.type,
                r.status,
                r.dateFiled
             FROM requests r
             WHERE r.employeeId = ?
             ORDER BY r.dateFiled DESC`,
            [employeeId]
        );

        res.json({
            myRequests: requests
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

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
        console.error(err); 
        res.status(500).json({ message: 'Server error. Could not create account.' });
    }

})


app.post('/api/admin/addemployee', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const { employeeId, email, position, deptId, hireDate } = req.body;

    try {
        //Check if account exists
        const [accountRows] = await db.query(
            'SELECT * FROM accounts WHERE email = ?',
            [email]
        );

        if (accountRows.length === 0) {
            return res.status(200).json({
                message: 'There is no account associated with this email',
                accountExists: false,
                employeeExists: false
            });
        }

        const accountId = accountRows[0].id;

        //Check if employeeId already exists
        const [employeeIdRows] = await db.query(
            'SELECT * FROM employees WHERE employeeID = ?',
            [employeeId]
        );

        if (employeeIdRows.length > 0) {
            return res.status(200).json({
                message: 'Employee ID already exists',
                employeeExists: true,
                accountExists: true
            });
        }

        //Check if this account already has an employee
        const [employeeRows] = await db.query(
            'SELECT * FROM employees WHERE accountId = ?',
            [accountId]
        );

        if (employeeRows.length > 0) {
            return res.status(200).json({
                message: 'There is already an employee with this email',
                employeeExists: true,
                accountExists: true
            });
        }

        // Insert new employee
        const [result] = await db.query(
            'INSERT INTO employees (employeeID, accountId, position, departmentId, hireDate) VALUES (?, ?, ?, ?, ?)',
            [employeeId, accountId, position, deptId, hireDate]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({
                message: 'Error saving employee!',
                employeeExists: false,
                accountExists: true
            });
        }

        res.status(201).json({
            message: 'New employee successfully added!',
            employeeExists: false,
            accountExists: true
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/addrequest', authenticateToken, async (req, res) => {
    try {
        const { type, items, dateFiled } = req.body;

        // Get account ID from token
        const accountId = req.user.id;

        // Get employee ID from account
        const [employee] = await db.query(
            'SELECT id FROM employees WHERE accountId = ?',
            [accountId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const employeeId = employee[0].id;

        // Insert request
        const [result] = await db.query(
            'INSERT INTO requests (employeeId, type, dateFiled) VALUES (?, ?, ?)',
            [employeeId, type, dateFiled]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({ message: "Failed to create request" });
        }

        const requestId = result.insertId;

        // Insert request items
        for (const item of items) {
            await db.query(
                'INSERT INTO request_items (requestId, itemName, quantity) VALUES (?, ?, ?)',
                [requestId, item.itemName, item.quantity]
            );
        }

        res.status(201).json({
            message: "Request created successfully",
            requestId: requestId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});



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
        console.error(err); 
        res.status(500).json({ message: 'Server error. Could not create account.' });
    }
})

app.put('/api/admin/resetpassword', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const {email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and new password are required' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password in database
        const [result] = await db.query(
            'UPDATE accounts SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Password successfully reset!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

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

app.delete('/api/admin/deleteemployee/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const id = parseInt(req.params.id);

    if (!id) return res.status(400).json({ message: 'Invalid employee ID' });

    try {
        // Check for existing requests
        const [requests] = await db.query('SELECT COUNT(*) AS count FROM requests WHERE employeeId = ?', [id]);

        if(requests[0].count > 0){
            return res.status(400).json({ message: 'Cannot delete employee with existing requests.' });
        }

        // Safe to delete
        const [result] = await db.query('DELETE FROM employees WHERE id = ?', [id]);

        if(result.affectedRows > 0){
            return res.json({ message: 'Employee successfully deleted.' });
        } else {
            return res.status(404).json({ message: 'Employee not found.' });
        }

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error.' });
    }
});

app.delete('/api/admin/deleteaccount/:email', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const emailToDelete = req.params.email;
        const loggedInEmail = req.user.email;

        // Prevent self-deletion
        if(emailToDelete === loggedInEmail){
            return res.status(400).json({ message: 'You cannot delete your own account!' });
        }

        // Get employee linked to this account
        const [employeeRows] = await db.query(
            'SELECT e.id AS employeeId FROM employees e JOIN accounts a ON e.accountId = a.id WHERE a.email = ?',
            [emailToDelete]
        );

        if(employeeRows.length > 0){
            const employeeId = employeeRows[0].employeeId;

            // Check if employee has existing requests
            const [requests] = await db.query(
                'SELECT COUNT(*) AS count FROM requests WHERE employeeId = ?',
                [employeeId]
            );

            if(requests[0].count > 0){
                return res.status(400).json({ message: 'Cannot delete account: employee has existing requests.' });
            }

            // Safe to delete employee
            await db.query('DELETE FROM employees WHERE id = ?', [employeeId]);
        }

        // Delete account
        const [result] = await db.query(
            'DELETE FROM accounts WHERE email = ?',
            [emailToDelete]
        );

        if(result.affectedRows === 0){
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json({ message: 'Account deleted successfully!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


//==============================================================================

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