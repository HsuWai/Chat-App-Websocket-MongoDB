// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var ObjectID = require('mongodb').ObjectID;
var _ = require("lodash");

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom
var numUsers = 0;

const mongo = require('mongodb').MongoClient;

// Connect to mongo
mongo.connect('mongodb://127.0.0.1/mongochat', function (err, db) {
  if (err) {
    throw err;
  }
  var usocket = {}, user = [];

  console.log('MongoDB connected...');

  io.on('connection', function (socket) {
    var addedUser = false;

    //Get Chat List
    db.collection('chats').find().toArray(function (err, res) {
      if (err) {
        throw err;
      }
      // Emit the messages
      //socket.emit('chat messages', res);
    });

    /* //Get Users
    db.collection('users').find().toArray(function (err, res) {
      if (err) throw err;

      socket.emit('all users', res)
    }); */

    // when the client emits 'new message', this listens and executes 
    //Currently not used
    socket.on('new message', function (data) {
      db.collection('chats').insertOne({ username: socket.username, message: data }, function (err, docsInserted) {

        if (err) throw err;
        socket.broadcast.emit('new message', {
          id: docsInserted.insertedId,
          username: socket.username,
          message: data
        });

      });

      // we tell the client to execute 'new message'
      /* socket.broadcast.emit('new message', {
        username: socket.username,
        message: data
      }); */
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
      //if (addedUser) return;

      //console.log("In add user", (username in usocket), usocket);
      if (!(username in usocket)) {
        console.log(username, "New User");
        addedUser = true;
        user.push(username);
        //socket.emit('login', { numUsers: user.length });
        //console.log("After login ", user)
        //socket.broadcast.emit('user joined', { username, numUsers: user.length });
        //console.log(user);
      } else {
        console.log("old User", username, user);

      }
      socket.username = username;
      usocket[username] = socket;
      socket.emit('login', { numUsers: user.length });
      socket.broadcast.emit('user joined', { username, numUsers: user.length });
      db.collection('users').find({ username }).toArray(function (err, res) {
        if (err) throw err;

        socket.emit('inbox list', res)
      });

      /* // we store the username in the socket session for this client
      socket.username = username;
      ++numUsers;
      addedUser = true;
      socket.emit('login', {
        numUsers: numUsers
      });
      // echo globally (all clients) that a person has connected
      socket.broadcast.emit('user joined', {
        username: socket.username,
        numUsers: numUsers
      }); */
    });

    socket.on('send private message', function (res) {
      console.log("Send ", res.recipient in usocket);

      var _id = new ObjectID();
      res._id = _id;

      //For sender
      usocket[socket.username].emit('receive private message', res)
      if (res.recipient in usocket) {
        //For receiver 
        usocket[res.recipient].emit('receive private message', res);
      }

      db.collection('chats').updateOne(
        { id: res.room_id },
        {
          $push: { "messages": { _id, time: Date(), message: res.message, username: socket.username } }
        }
      ).then(function (result) {
        console.log("message insert ", result)
      })
      /* db.collection('chats').insertOne({ username: socket.username, message: data }, function (err, docsInserted) {
  
        if (err) throw err;
        socket.broadcast.emit('new message', {
          id: docsInserted.insertedId,
          username: socket.username,
          message: data
        });
  
      }); */
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {

      //For private chat 

      var recipient = socket.username == "Thin Ei" ? "Hsu Wai" : "Thin Ei"
      console.log("Recipient", socket.username, recipient);
      usocket[recipient].emit('typing', {
        username: socket.username
      });
      /* socket.broadcast.emit('typing', {
        username: socket.username
      }); */
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
      socket.broadcast.emit('stop typing', {
        username: socket.username
      });
    });

    // when the user disconnects.. perform this
    /* socket.on('disconnect', function () {
      if (addedUser) {
        //--numUsers;
        _.remove(user, function (value) {
          return value == socket.username;
        })

        console.log("Disconnet ", user)
        // echo globally that this client has left
        socket.broadcast.emit('user left', {
          username: socket.username,
          numUsers: user.length
        });
      }
    }); */

    // start private chat
    socket.on('start private chat', function (data) {
      console.log("Starting Room ", data);
      //Get Chat Message
      db.collection('chats').find({ id: data.id }).toArray(function (err, res) {
        if (err) {
          throw err;
        }
        //console.log("messages ", res);
        //Check chat room is existed or not
        if (res.length == 0) {
          db.collection('chats').insertOne({ id: data.id, create_date: Date(), messages: [] });
        } else {
          const { messages } = res[0];
          //console.log("messages ", messages)
          //start private chat
          socket.emit('show chat', { username: socket.username })
          // Emit the messages
          socket.emit('chat messages', messages);
        }

      });
    })
  });

})

