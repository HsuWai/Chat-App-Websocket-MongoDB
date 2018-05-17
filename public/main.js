
/* $(function () { */
var FADE_TIME = 150; // ms
var TYPING_TIMER_LENGTH = 400; // ms
var COLORS = [
  '#e21400', '#91580f', '#f8a700', '#f78b00',
  '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
  '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
];

// Initialize variables
var $window = $(window);
var $usernameInput = $('.usernameInput'); // Input for username
var $messages = $('.messages'); // Messages area
var $inputMessage = $('.inputMessage'); // Input message input box
var $chatLogs = $('.chatLog');
var $userList = $('.userlist');
var $inboxList = $('.inboxList');

var $loginPage = $('.login.page'); // The login page
var $chatPage = $('.chat.page'); // The chatroom page
var $inboxPage = $('.inbox.page');//The Inbox page

// Prompt for setting a username
var username;
var connected = false;
var typing = false;
var lastTypingTime;
var $currentInput = $usernameInput.focus();

var socket = io();


function addParticipantsMessage(data) {
  console.log("Number of Users ", data)
  var message = '';
  if (data.numUsers === 1) {
    message += "there's 1 participant";
  } else {
    message += "there are " + data.numUsers + " participants";
  }
  //log(message);
}

// Sets the client's username
function setUsername() {
  username = cleanInput($usernameInput.val().trim());
  console.log("user name", username);
  // If the username is valid
  if (username) {
    $loginPage.fadeOut();
    //$chatPage.show();
    $inboxPage.show();
    $loginPage.off('click');
    $currentInput = $inputMessage.focus();

    // Tell the server your username
    socket.emit('add user', username);
  }
}

function showChatRoom(data) {
  $inboxPage.fadeOut();
  //$chatPage.show();
  $chatPage.show();
  $loginPage.off('click');
  $currentInput = $inputMessage.focus();

  // Tell the server your username
  //socket.emit('add user', data.username);
}

// Sends a chat message
function sendMessage() {
  var message = $inputMessage.val();
  // Prevent markup from being injected into the message
  message = cleanInput(message);
  // if there is a non-empty message and a socket connection
  console.log(message, connected);
  if (message && connected) {
    $inputMessage.val('');
    /* addChatMessage({
      username: username,
      message: message
    }); */
    var req = {
      'username': username,
      'recipient': username == "Thin Ei" ? "Hsu Wai" : "Thin Ei",
      'type': 'plain',
      'message': message,
      'room_id': "CR_1_2"
    }
    console.log("private ", req)
    // tell server to execute 'new message' and send along one parameter
    //socket.emit('new message', message);
    socket.emit('send private message', req)
  }
}

// Log a message
function log(message, options) {
  var $el = $('<li>').addClass('log').text(message);
  addMessageElement($el, options);
}

// Adds the visual chat message to the message list
function addChatMessage(data, options) {
  console.log(data);
  // Don't fade the message in if there is an 'X was typing'
  var $typingMessages = getTypingMessages(data);
  options = options || {};
  if ($typingMessages.length !== 0) {
    options.fade = false;
    $typingMessages.remove();
  }

  var id = data._id;
  var $usernameDiv = $('<span class="username"/>')
    .text(data.username)
    .css('color', getUsernameColor(data.username));
  var $messageBodyDiv = $('<span class="messageBody">')
    .text(data.message);
  var $messageDeleteButton = $('<input type="button" class="messageDelete" value="delete" onclick=deleteMessage("' + data._id + '"); /> ')

  var typingClass = data.typing ? 'typing' : '';
  var $messageDiv = $('<li class="message"/>')
    .data('username', data.username)
    .addClass(typingClass)
    .append($usernameDiv, $messageBodyDiv, $messageDeleteButton);

  addMessageElement($messageDiv, options);
}

function deleteMessage(data) {
  console.log(data)
}

// Adds the visual chat typing message
function addChatTyping(data) {
  console.log("add chat typing ", data)
  data.typing = true;
  data.message = 'is typing';
  addChatMessage(data);
}

// Removes the visual chat typing message
function removeChatTyping(data) {
  getTypingMessages(data).fadeOut(function () {
    $(this).remove();
  });
}

// Adds a message element to the messages and scrolls to the bottom
// el - The element to add as a message
// options.fade - If the element should fade-in (default = true)
// options.prepend - If the element should prepend
//   all other messages (default = false)
function addMessageElement(el, options) {
  var $el = $(el);

  // Setup default options
  if (!options) {
    options = {};
  }
  if (typeof options.fade === 'undefined') {
    options.fade = true;
  }
  if (typeof options.prepend === 'undefined') {
    options.prepend = false;
  }

  // Apply options
  if (options.fade) {
    $el.hide().fadeIn(FADE_TIME);
  }
  if (options.prepend) {
    $messages.prepend($el);
  } else {
    $messages.append($el);
  }
  $messages[0].scrollTop = $messages[0].scrollHeight;
}

// Prevents input from having injected markup
function cleanInput(input) {
  return $('<div/>').text(input).html();
}

// Updates the typing event
function updateTyping() {
  if (connected) {
    console.log(connected, typing)
    if (!typing) {
      typing = true;
      socket.emit('typing');
    }
    lastTypingTime = (new Date()).getTime();

    setTimeout(function () {
      var typingTimer = (new Date()).getTime();
      var timeDiff = typingTimer - lastTypingTime;
      if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
        socket.emit('stop typing');
        typing = false;
      }
    }, TYPING_TIMER_LENGTH);
  }
}

// Gets the 'X is typing' messages of a user
function getTypingMessages(data) {
  return $('.typing.message').filter(function (i) {
    return $(this).data('username') === data.username;
  });
}

// Gets the color of a username through our hash function
function getUsernameColor(username) {
  // Compute hash code
  var hash = 7;
  /* for (var i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + (hash << 5) - hash;
  } */
  // Calculate color
  var index = Math.abs(hash % COLORS.length);
  return COLORS[index];
}

function chatPrivate(id) {
  console.log(id);
  socket.emit("start private chat", { id })
}

function addUsers(data) {
  var $usernameDiv = $('<a class="user" id="' + data._id + '" onclick=chatPrivate("' + data._id + '","' + data.username + '"); /> ')
    .text(data.username);
  var $userDiv = $('<li/>')
    .append($usernameDiv);
  $userList.append($userDiv);
}

function addInbox(data) {
  var $usernameDiv = $('<a class="user" id="' + data.room_id + '" onclick=chatPrivate("' + data.room_id + '"); /> ')
    .text(data.room_name);
  var $userDiv = $('<li/>')
    .append($usernameDiv);
  $inboxList.append($userDiv);
}



// Keyboard events

$window.keydown(function (event) {
  // Auto-focus the current input when a key is typed
  if (!(event.ctrlKey || event.metaKey || event.altKey)) {
    $currentInput.focus();
  }
  // When the client hits ENTER on their keyboard
  if (event.which === 13) {
    console.log("username", username);
    if (username) {
      sendMessage();
      socket.emit('stop typing');
      typing = false;
    } else {
      console.log("start chat");
      setUsername();
    }
  }
});

$inputMessage.on('input', function () {
  updateTyping();
});

// Click events

// Focus input when clicking anywhere on login page
$loginPage.click(function () {
  $currentInput.focus();
});

// Focus input when clicking on the message input's border
$inputMessage.click(function () {
  $inputMessage.focus();
});

//Start Chatting
function startChat() {
  console.log("Start Chat");
  username = cleanInput($usernameInput.val().trim());
  console.log("user name", username);
  // If the username is valid
  if (username) {
    $loginPage.fadeOut();
    $inboxPage.show();
    $loginPage.off('click');

    // Tell the server your username
    socket.emit('add user', username);
  }
}

// Socket events

// Whenever the server emits 'login', log the login message
socket.on('login', function (data) {
  connected = true;
  // Display the welcome message
  var message = "Welcome to Socket.IO Chat – ";
  log(message, {
    prepend: true
  });
  addParticipantsMessage(data);
});

socket.on('receive private message', function (data) {
  console.log("receive private message", data);
  addChatMessage(data);
})

// Whenever the server emits 'new message', update the chat body
socket.on('send private message', function (data) {
  console.log("Send Private Message", data);

});

// Whenever the server emits 'user joined', log it in the chat body
socket.on('user joined', function (data) {
  console.log(data);
  //log(data.username + ' joined');
  addParticipantsMessage(data);
});

// Whenever the server emits 'typing', show the typing message
socket.on('typing', function (data) {
  addChatTyping(data);
});

// Whenever the server emits 'stop typing', kill the typing message
socket.on('stop typing', function (data) {
  removeChatTyping(data);
});

socket.on('disconnect', function () {
  log('you have been disconnected');
});

socket.on('reconnect', function () {
  log('you have been reconnected');
  if (username) {
    socket.emit('add user', username);
  }
});

socket.on('reconnect_error', function () {
  log('attempt to reconnect has failed');
});

//Chat Messages
socket.on('chat messages', function (data) {
  console.log(data);
  if (data.length) {
    _.forEach(data, function (value) {
      addChatMessage(value);
    })
  }
});

// All Users
socket.on("all users", function (data) {
  console.log("Users ", data)
  if (data.length) {
    _.forEach(data, function (value) {
      addUsers(value)
    })
  }
});

// All Inbox List
socket.on("inbox list", function (data) {
  console.log("inbox ", data)

  if (data.length) {
    const { rooms } = data[0];
    _.forEach(rooms, function (value) {
      addInbox(value)
    })
  }
});

socket.on('show chat', function (data) {
  showChatRoom(data);
})
/* }); */
