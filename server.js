const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

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

let users = [
    {id: 1, firstName: 'Billie', lastName: 'Dove', email: 'admin@example.com', password: '$2a$10$.w1V1HnyIEAL.RuAbrZXNOsofSlcBxvxgNszEgXxhzxhLyWTF3DPa', role: 'admin', verified: true},
    {id: 2, firstName: 'Althea', lastName: 'Genegobis', email: 'altheagenegobis2022@gmail.com', password: '$2a$10$.N52yJYLpjB.XOzcziYBbetUQIjrJzQ4tPhdqu2sbOZquL9i2PIiS', role: 'user', verified: true}
];

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

    //Check if user exists
    const existing = users.find(u => u.email == email);
    if(existing){
        return res.status(409).send('User already exists!');
    }

    //Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: users.length + 1,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        verified: false,
        role
    };

    users.push(newUser);
    console.log(users)
    res.status(201).json({message: 'User registered', email, role});
})

//verify registration email
app.post('/api/verifyemail', (req, res) => {
    const {unverifiedEmail} = req.body;

    const user = users.find(u => u.email == unverifiedEmail);
    console.log(user)
    if(user){
        if(!user.verified){
            user.verified = true;
            return res.status(201).json({message: 'Email verified!', success : true})
        }
    }else{
        return res.status(401).json({message: 'User not found!'})
    }
})


//API login
app.post('/api/login', async(req, res) => {
    const {email, password} = req.body;
    console.log(email + ' ' + password)
    const user = users.find(u => u.email == email && u.verified);

    if(!user || !await bcrypt.compare(password, user.password)){
        return res.status(401).json({error: 'Invalid credentials'});
    }

    //Generate JWT token
    const token = jwt.sign(
        {id: user.id, email: user.email, role: user.role},
        SECRET_KEY,
        {expiresIn : '1h'}
    );

    res.json({token, user: {email: user.email, role: user.role}})
});


// ======================  GET ROUTES ===========================

//Protected Route === Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.email == req.user.email);
    res.json({user: user})
});

app.get('/api/requests', authenticateToken, (req, res) => {
    const user = req.user;
    const myRequests = requests.filter(r => r.email == user.email);

    res.json({myRequests})
})

app.get('/api/admin/departments', authenticateToken, authorizeRole('admin'), (req, res) => {
    res.json({departments})
})

app.get('/api/admin/employees', authenticateToken, authorizeRole('admin'), (req, res) => {
    res.json({employees})
})

app.get('/api/admin/accounts', authenticateToken, authorizeRole('admin'), (req, res) => {
    res.json({users})
})

//Admin-only route
app.get('/api/admin/dashboard', authenticateToken, authorizeRole('admin'), (req, res) => {
    res.json({message: 'Welcome to admin dashboard!', data: 'secret admin info'})
});

//Public route : Guest
app.get('/api/content/guest', (req, res) => {
    res.json({message: 'Public content for all visitors.'});
});

app.get('/api/admin/getaccount', authenticateToken, authorizeRole('admin'), (req, res) => {
    const {email} = req.query;

    const user = users.find(u => u.email == email);
    if(user){
        res.json({
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
        res.json({exists: false, message: 'This email is available'})
    }
})



// ============================ POST REQUESTS ===================================

app.post('/api/admin/addaccount', authenticateToken, authorizeRole('admin'), async(req, res) => {
    const {firstName, lastName, email, password, role, verified} = req.body;

    //hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = {
        firstName, 
        lastName, 
        email,
        password: hashedPassword,
        role,
        verified
    }

    users.push(newUser);
    res.status(201).json({message: 'New account created!'});

})


// ============================== PUT REQUESTS =====================================
app.put('/api/admin/saveaccountedits', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const {firstName, lastName, email, role, verified, editingEmail} = req.body;


    const user = users.findIndex(u => u.email == editingEmail);

    if(user){
        users[user].firstName = firstName;
        users[user].lastName = lastName
        users[user].email = email;
        users[user].role = role,
        users[user].verified = verified
        
        res.json({message: 'Successfully saved edits!'})
    }
})

app.put('/api/admin/resetpassword', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const {email, password} = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = users.find(u => u.email == email);
    user.password = hashedPassword;

    res.json({message: 'Password successfully reset!'})
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