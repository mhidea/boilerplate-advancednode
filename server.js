'use strict';
require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const app = express();
const bcrypt = require('bcrypt')
const routes = require('./routes')
const auth = require('./auth')
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

fccTesting(app); //For FCC testing purposes

app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  key: 'express.sid',
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'pug')
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');
  let currentUsers = 0;

  io.on('connection', socket => {
    ++currentUsers;
    console.log('user ' + socket.request.user.name + ' connected');
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    }); socket.on('disconnect', socket => {
      --currentUsers;
      console.log('user ' + socket.request.user.name + ' disconnected');
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: false
      });
    });
  });

  // Be sure to change the title
  routes(app, myDataBase);
  auth(app, myDataBase);
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
