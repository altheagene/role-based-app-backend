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
    {id: 1, username: 'admin', password: 'admin123', role: 'admin'},
    {id: 2, username: 'alice', password: 'user123', role: 'user'}
];

app.post('/api/register', async (req, res) => {
    const {username, password, role = 'user'} = req.body;

    if(!username || !password){
        return res.status(400).send('Username and password required!');
    }

    //Check if user exists
    const existing = users.find(u => u.username == username);
    if(existing){
        return res.status(409).send('User already exists!');
    }

    //Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: users.length + 1,
        username,
        password: hashedPassword,
        role
    };

    users.push(newUser);
    res.status(201).json({message: 'User registered', username, role});
})


//API login
app.post('/api/login', async(req, res) => {
    const {username, password} = req.body;
    const user = users.find(u => u.username == username);

    if(!user || !await bcrypt.compare(password, user.password)){
        return res.status(401).json({error: 'Invalid credentials'});
    }

    //Generate JWT token
    const token = jwt.sign(
        {id: user.id, username: user.username, role: user.role},
        SECRET_KEY,
        {expiresIn : '1h'}
    );

    res.json({token, user: {username: user.username, role: user.role}})
});

//Protected Route === Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
    res.json({user: req.user})
});

//Admin-only route
app.get('/api/admin/dashboard', authenticateToken, authorizeRole('admin'), (req, res) => {
    res.json({message: 'Welcome to admin dashboard!', data: 'secret admin info'})
});

//Public route : Guest
app.get('/api/content/guest', (req, res) => {
    res.json({message: 'Public content for all visitors.'});
});

function authenticateToken(req, res, next){
    const authHeader = req.headers('authorization');
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