var app = require('koa.io')();
var staticServe = require('koa-static');

// inmemory database
// note: this is also the initial state.
var database = {
  chatrooms: {javascript: [{username: 'Administrator', msg: 'Welcome to the chatting app :)', at: new Date()}], CSS: []}, 
  users: {},
};

app.use(staticServe('./public'));

app.io.use(function* (next) {
  console.log(`connected ${this.id}`);

  database.users[this.id] = {};

  yield next;
  console.log(`disconnected ${this.id}`);

  delete database.users[this.id];

  this.broadcast.emit('user room list change', database.users);

});

app.io.route('set name', function* (next, username) {
  
  database.users[this.id] = {username: username, room: 'javascript'};

  // give to the requester the app state
  this.emit('login', database);

  // give to all users to the new users
  this.broadcast.emit('user room list change', database.users);

});

app.io.route('user room changed', function* (next, userObj) {
  database.users[userObj.userId]['room'] = userObj.room;
  this.broadcast.emit('user room list change', database.users);
  this.emit('user room list change', database.users);
});


app.io.route('new message', function* (next, data) {
  var newPost = {username: data.username, msg: data.msg, at: data.at};
  database.chatrooms[data.room].push(newPost);
  this.broadcast.emit('update chatroom messages', data);
  this.emit('update chatroom messages', data);
});

app.listen(80);