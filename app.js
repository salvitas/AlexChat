// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var port = process.env.PORT || 3000;

// Routing
app.use(express.static(__dirname + '/public'));

server.listen(port, function () {
  console.log('Socket.io Server listening at port %d', port);
});



// Chatroom

// in-memeory data stores
var usernames = {};
var numUsers = 0;
var groups = [];

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // When the client emits 'group:add', this executes
  socket.on('group:add', function(data) {
	if(data) {
		var userGroup = {};
		userGroup[data.name] = {
			owner : socket.username,
			participants : data.participants
		};
		groups.push(userGroup);
	}
	console.log(groups);
  });
  
  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;

	var found = false;
	for(var key in usernames) {
		if(usernames.hasOwnProperty(key)) {
			if(key === username) {
				found = true;
				break;
			}
		}
	}
	
	if(found) {
		console.log('username ' + username + ' is already loggedin!')
		socket.emit('nologin', {
		  numUsers: numUsers
		});
	} else {
		// add the client's username to the global list
		usernames[username] = username;
		++numUsers;
		addedUser = true;
		socket.emit('login', {
		  numUsers: numUsers
		});
		// echo globally (all clients) that a person has connected
		socket.broadcast.emit('user joined', {
		  username: socket.username,
		  numUsers: numUsers
		});
	}
	
	console.log('Usernames object : ' + JSON.stringify(usernames));
  });

  // when the client emits his contact list
  socket.on('send contacts', function (userContactList) {
	if(userContactList) {
		var onlineContacts = [];
		for(var c in userContactList.contacts) {
			if(usernames[userContactList.contacts[c]]) {
				console.log('contact : ' + userContactList.contacts[c] + ' isonline : true');
				onlineContacts.push(userContactList.contacts[c]);
			} else {
				console.log('contact : ' + userContactList.contacts[c] + ' isonline : false');
			}
		}
		socket.emit('online contacts', onlineContacts);
	}
  });
  
  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});