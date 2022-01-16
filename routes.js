const passport = require('passport');

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
};
module.exports = function (app, myDataBase) {
    app.route('/').get((req, res) => {
        //Change the response to render the Pug template
        res.render('pug', {
            title: 'Connected to Database',
            message: 'Please login',
            showLogin: true,
            showRegistration: true,
            showSocialAuth: true
        });
    });
    app.route('/profile').get(ensureAuthenticated, (req, res) => {
        //Change the response to render the Pug template
        res.render(process.cwd() + '/views/pug/profile', { username: req.user.username });
    });

    app.get('/auth/github', passport.authenticate('github'));

    app.get('/auth/github/callback', passport.authenticate('github', {
        failureRedirect: '/'
    }), (req, res) => {
        return res.redirect('/profile');
    });
    app.post('/login', passport.authenticate('local', {
        failureRedirect: '/'
    }), (req, res) => {
        return res.redirect('/profile');
    }
    );
    app.route('/logout')
        .get((req, res) => {
            req.logout();
            res.redirect('/');
        });

    app.route('/register')
        .post((req, res, next) => {
            myDataBase.findOne({ username: req.body.username }, function (err, user) {
                if (err) {
                    next(err);
                } else if (user) {
                    res.redirect('/');
                } else {
                    myDataBase.insertOne({
                        username: req.body.username,
                        password: bcrypt.hashSync(req.body.password, 12)
                    },
                        (err, doc) => {
                            if (err) {
                                res.redirect('/');
                            } else {
                                // The inserted document is held within
                                // the ops property of the doc
                                next(null, doc.ops[0]);
                            }
                        }
                    )
                }
            })
        },
            passport.authenticate('local', { failureRedirect: '/' }),
            (req, res, next) => {
                res.redirect('/profile');
            }
        );
    app.use((req, res, next) => {
        res.status(404)
            .type('text')
            .send('Not Found');
    });
}