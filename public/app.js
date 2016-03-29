var socket = io();

// global UI data hub
var UIData = {
  username: '',
  chatrooms: {},
  users: {},
  active: ''
};


var conntected = true;
var wrapper = document.getElementById('app-wrapper');
var root = document.getElementById('app');

var modal = document.getElementById('app-setup-modal');
var modalForm = document.getElementById('app-setup-modal-form');
var modalFormInput = document.getElementById('app-setup-modal-form-input');
var modalFormSubmitBtn = document.getElementById('app-setup-modal-form-submit');

var sidebar = document.getElementById('app-sidebar');
var sidebarUserList = document.getElementById('app-sidebar-roomusers');
var sidebarRoomList = document.getElementById('app-sidebar-rooms');

var mainWrapper = document.getElementById('app-main');
var messageList = document.getElementById('app-main-messages');
var messageForm = document.getElementById('app-main-messageform');
var messageFormInput = document.getElementById('app-main-messageform-user-input');
var messageFormSubmitBtn = document.querySelector('#app-main-messageform > button[type="submit"]');

function hideModal () {
  modal.style.display = 'none';
  root.style.zIndex = '1';
}

function showModal () {
  modal.style.display = 'block';
  root.style.zIndex = '-1';
}

modalForm.addEventListener('submit', function (e) {
  e.preventDefault();

  var name = escapeHtml(modalFormInput.value); // todo: basic validation!
  
  socket.emit('set name', name);

  UIData.username = name;

});


socket.on('login', function (appstate) {
  conntected = true;
  UIData.chatrooms = appstate.chatrooms;
  UIData.users = appstate.users;
  UIData.active = appstate.users[this.id].room;

  renderApp();

  hideModal();


});

function renderApp() {
  renderSidebar();
  renderPosts();
}

function renderPosts() {
  var posts = UIData.chatrooms[UIData.active];
  
  var templ = '';

  for(var i = 0; i < posts.length; i++) {
    var p = posts[i];
    var d = formatDate(new Date(p.at));
    templ += `
      <li>
        <div><em>${p.username}</em> (${d}): </div>
        <p>${p.msg}</p>
      </li>
    `;
  }

  messageList.innerHTML = templ;

}

function renderSidebar() {
  renderSidebarUsers();
  renderSidebarRoomList();
}

function renderSidebarUsers() {
  var users = Object.keys(UIData.users).map(function(key) {
    return {username: UIData.users[key].username, id: key, active: UIData.users[key].room};
  }).filter(function (userObj) {
    return userObj.active === UIData.active;
  });

  var templ = '';
  
  for(var i = 0; i < users.length; i++) {
    templ += `<li id="${users[i].id}">${users[i].username}</li>`;
  }

  sidebarUserList.innerHTML = templ;

}

var cbs = [];

function renderSidebarRoomList() {
  var templ = '';
  
  // remove previous event listeners
  [].forEach.call(sidebarRoomList.children, function (li, i) {
    li.removeEventListener('click', cbs[i]);
  });

  for(var key in UIData.chatrooms) {
    if(UIData.chatrooms.hasOwnProperty(key)) {
      templ += `<li id="${key}" class="${UIData.active == key ? 'active' : ''}">${key}</li>`;
    }
  }

  sidebarRoomList.innerHTML = templ;

  // add list items event listers
  [].forEach.call(sidebarRoomList.children, function (li, i) {
   var handler = function (e) {
    if(li.classList.contains('active'))
      return;
     
      UIData.active = li.id;
      socket.emit('user room changed', {userId: socket.id, room: UIData.active}); 
   }; 
   li.addEventListener('click', handler, false);
   cbs[i] = handler;
  });


}


messageForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var msg = escapeHtml(messageFormInput.value);
  socket.emit('new message', {msg: msg, username: UIData.username, at: new Date, room: UIData.active});
});

socket.on('user room list change', function (nextUsers) {
  UIData.users = nextUsers;
  renderApp();
})

socket.on('update chatroom messages', function (data) {
  var newPost = {username: data.username, msg: data.msg, at: data.at};
  UIData.chatrooms[data.room].push(newPost);
  messageFormInput.value = '';
  renderPosts();
});

function formatDate(d) {
  return ("0" + d.getDate()).slice(-2) + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" +
    d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}


var entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
};

function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }
