const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const app = express();
const PORT = 3500;
var bodyParser = require("body-parser");
var mysql = require("mysql");
const bcrypt = require('bcrypt');
const cors = require('cors');
const crypto = require('crypto');
//node cron 
const cron = require('node-cron');
//googel login
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(cors());
require('dotenv').config();

//connect db
var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "Cybercrime" //db name 
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database');
});

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'ejs');

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session setup
app.use(session({
    secret: 'COSCI',
    cookie: { maxAge: 60000000 },
    resave: true,
    saveUninitialized: false
}));

//middleware
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for checking if authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
};

// Root route - Redirect to /home
app.get('/', (req, res) => {
    res.redirect('/home');
});


// after login
app.get('/login', function(req, res) {
    if (req.session.isLoggedIn) {
        return res.redirect("/home");
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// get register
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// post register
app.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    
    if (!username || !password || !email) {
        return res.status(400).send("Please provide username, password, and email.");
    }

    // bcrypt password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error("Error hashing password", err);
            return res.status(500).send("Internal server error");
        }

       
        const query = 'INSERT INTO account (username, password, email) VALUES (?, ?, ?)';
        connection.query(query, [username, hashedPassword, email], (err, results) => {
            if (err) {
                console.error("Error saving user to the database", err);
                return res.status(500).send("Internal server error");
            }

           
            res.redirect('/login');
        });
    });
});


//Post Log In
app.post("/login", function (req, res) {
    const { username, password } = req.body;

    if (username && password) {
        connection.query(
            "SELECT * FROM account WHERE username = ?",
            [username],
            function (error, results, fields) {
                if (error) {
                    console.error("Database query error:", error);
                    return res.status(500).send("Internal server error");
                }

                if (results.length > 0) {
                    // bcrypt match
                    bcrypt.compare(password, results[0].password, (err, isMatch) => {
                        if (err) {
                            console.error("Error comparing passwords", err);
                            return res.status(500).send("Internal server error");
                        }

                        if (isMatch) {
                            req.session.isLoggedIn = true;
                            req.session.username = username;
                            res.redirect("/home");
                        } else {
                            //passwords don't match
                            res.sendFile(path.join(__dirname, 'public', 'loginError.html'));
                        }
                    });
                } else {
                    //  username is not found
                    res.sendFile(path.join(__dirname, 'public', 'loginError.html'));
                }
            }
        );
    } else {
        // username or password is empty
        res.sendFile(path.join(__dirname, 'public', 'loginError.html'));
    }
});





//Check login
app.get('/check-login', (req, res) => {
    if (req.session.isLoggedIn) {
        res.json({ isLoggedIn: true });
    } else {
        res.json({ isLoggedIn: false });
    }
});

// Sign Out
app.post('/signOut', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Error while logging out.");
        }
        res.redirect('/home');
    });
});



// Home page -  route
app.get('/home', (req, res) => {
    const query = 'SELECT COUNT(*) AS visitCount FROM keepcounter WHERE visit_date = ?';
    const currentDate = new Date().toISOString().slice(0, 10); // Get current date

    connection.query(query, [currentDate], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).send('Internal server error');
        }

        res.render('home', { visitCount: results[0] ? results[0].visitCount : 0 });
    });
});


   
   
// pages requires login
app.get('/statistics', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'statistics.html'));
});

app.get('/prevent', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'prevent.html'));
});

app.get('/report', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'report.html'));
});




// check ip and date 
const shouldCountVisit = (ip, callback) => {
    const currentDate = new Date().toISOString().slice(0, 10);

    const query = 'SELECT * FROM keepcounter WHERE ip_address = ? AND visit_date = ?';
    connection.query(query, [ip, currentDate], (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            return callback(false);
        }
        
        callback(results.length === 0);
    });
};

// count Visit
const countVisit = (ip) => {
    const currentDate = new Date().toISOString().slice(0, 10); // only date

    // insert to database
    const query = 'INSERT INTO keepcounter (ip_address, visit_date) VALUES (?, ?)';
    connection.query(query, [ip, currentDate], (err) => {
        if (err) {
            console.error('Error inserting visit data:', err);
        }
    });
};

// API endpoint 
app.get('/api/visits', (req, res) => {
    const userIP = req.ip;

    
    shouldCountVisit(userIP, (canCount) => {
        if (canCount) {
            
            countVisit(userIP);
            res.json({ message: 'Visit counted' });
        } else {
            res.json({ message: 'Your visit has already been counted today' });
        }
    });
});


// get Forgot Password
app.get('/forgot-password', (req, res) => {
    res.render('forgot-password'); 
});

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,  
        pass: process.env.EMAIL_PASS  
    }
});

// Forgot Password 
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    // email exists in the database
    connection.query('SELECT * FROM account WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).send('Error checking email in database');
        }

        if (results.length === 0) {
            return res.status(404).send('Email not found');
        }

        //  generate a temporary password
        const tempPassword = crypto.randomBytes(6).toString('hex');

        // Send email 
        const mailOptions = {
            from: 'Cybercrime - test <heyuapo@gmail.com>',
            to: email,
            subject: 'Temporary Password',
            text: `Your temporary password is: ${tempPassword}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).send('Error sending email');
            }

            // Hash temporary password 
            bcrypt.hash(tempPassword, 10, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).send('Error hashing password');
                }

                // Update password in db
                connection.query('UPDATE account SET password = ? WHERE email = ?', [hashedPassword, email], (err) => {
                    if (err) {
                        return res.status(500).send('Error updating password');
                    }
                    res.sendFile(path.join(__dirname, 'public', 'temPass.html'));
                });
            });
        });
    });
});

// Node Cron 
const sendEmail = (email) => {
    const mailOptions = {
        from: 'Cybercrime - Test <heyuapo@gmail.com>',
        to: email,
        subject: 'Reminder: Daily Update',
        text: 'This is your daily reminder email from the Cybercrime platform.'
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
        } else {
            console.log('Email sent to ' + email);
        }
    });
};

cron.schedule('0 0 0 * * *', () => {
    console.log('Running Cron Job at Midnight...');

    
    connection.query('SELECT email FROM account', (err, results) => {
        if (err) {
            console.error('Error fetching emails:', err);
            return;
        }

       
        results.forEach(user => {
            sendEmail(user.email);
        });
    });
});


//Get Change Password
app.get('/change-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'changePass.html'));
});

//Post Change Password
app.post('/change-password', (req, res) => {
    const { email, newPassword, confirmPassword } = req.body;

    
    if (newPassword !== confirmPassword) {
        return res.status(400).send('Passwords do not match');
    }

    
    connection.query('SELECT * FROM account WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).send('Database error');
        }

        if (results.length === 0) {
            res.sendFile(path.join(__dirname, 'public', 'emailNot.html'));
        }

        // Hash
        bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).send('Error hashing password');
            }

            // Update the password in the database
            connection.query('UPDATE account SET password = ? WHERE email = ?', [hashedPassword, email], (err) => {
                if (err) {
                    return res.status(500).send('Error updating password');
                }

                res.sendFile(path.join(__dirname, 'public', 'changeDone.html'));
            });
        });
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3500/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    const { id, displayName, emails } = profile;
    const email = (emails && emails.length > 0) ? emails[0].value : 'no-email@example.com';

    connection.query('SELECT * FROM loginviaGoogle WHERE google_id = ?', [id], (err, results) => {
        if (err) {
            return done(err);
        }

        if (results.length > 0) {
            return done(null, results[0]); // User already exists
        } else {
            // If the user doesn't exist, create a new entry in the loginviaGoogle table
            connection.query('INSERT INTO loginviaGoogle (google_id, username, email) VALUES (?, ?, ?)', 
                [id, displayName, email], (err, results) => {
                    if (err) {
                        return done(err);
                    }
                    return done(null, { google_id: id, username: displayName, email });
                });
        }
    });
}));

passport.serializeUser((user, done) => {
    done(null, user.google_id);  // Serialize by google_id
});

passport.deserializeUser((google_id, done) => {
    connection.query('SELECT * FROM loginviaGoogle WHERE google_id = ?', [google_id], (err, results) => {
        if (err) {
            return done(err);
        }
        done(null, results[0]);
    });
});

// Google login callback
app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/login'
}), (req, res) => {
    req.session.isLoggedIn = true;
    req.session.username = req.user.username;
    res.redirect('/home');
});

// Route to start Google login
app.get('/auth/google', 
    passport.authenticate('google', {
        scope: ['profile', 'email']  
    })
);




// start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
