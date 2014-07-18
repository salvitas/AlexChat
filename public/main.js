$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize varibles
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page
  var $contactsPage = $('.contacts.page');

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();
  var contactList = {'680859498': ['693770103', '693770107','693770108','693770109'], '693770107': ['693770101','693770102','693770103']};

  var socket = io.connect('http://sharechat.herokuapp.com/');

  
  function createGroup() {
	var groupName = prompt("Please enter a group name,(693770103, 693770107) will be added to the group", "");

	if (groupName != null) {
		$('<li/>',{text:groupName}).appendTo($('.groups'));
		socket.emit('group:add', {name:groupName, participants:['693770103','693770107']})
	}
  }
  
  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there're " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());

	// Tell the server your username
	socket.emit('user:add', username);
  }
  
  function showChatWindow() {
    if (username && connected) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();
    }
  }
  
    function showContactsWindow() {
    if (username && connected) {
      $loginPage.fadeOut();
	  for(var c in contactList[username]) {
		$('<li/>',{id:contactList[username][c], text:contactList[username][c]}).appendTo($('ul.contacts'));
	  }
      $contactsPage.show();
      $loginPage.off('click');
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('message:new', message);
    }
  }

  // used to colorify the online contacts of username.
  function updateOnlineContactList(userId) {
	for(var c in contactList[username]) {	
		if(contactList[username][c] === userId) {
			$('li#'+userId).css({'color':'green', 'font-weight':'bold'});
		}
	}
  }
  function updateOfflineContactList(userId) {
	for(var c in contactList[username]) {	
		if(contactList[username][c] === userId) {
			$('li#'+userId).css('color','red');
		}
	}
  }
  
  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
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
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing:start');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('typing:stop');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('typing:stop');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
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

  $('#createGroupBtn').click(createGroup);
  
  
  // Socket events
  socket.on('nologin', function (data) {
    connected = false;
	username = null;
    // Display the welcome message
    var message = "User already logged-in!";
	$('<span/>',{text:message, style:'color:gray;'}).insertAfter('.usernameInput');
	$('<br/>').insertAfter('.usernameInput');
	$('.usernameInput').val('').focus();
  });
  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
	showContactsWindow();
	socket.emit('contacts:send', {contacts: contactList[username]});
	//showChatWindow();
    // Display the welcome message
    //var message = "Welcome to Alex Chat ";
    //log(message, { prepend: true });
    //addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('message:new', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user:joined', function (data) {
    log(data.username + ' joined');
	updateOnlineContactList(data.username);
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user:left', function (data) {
    log(data.username + ' left');
	updateOfflineContactList(data.username);
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever ther server emits 'online contacts', we color in green our online contacts list.
  socket.on('contacts:online', function(data) {
	for(var c in data) {
		$('li#'+data[c]).css({'color':'green', 'font-weight':'bold'});
	}
  });
  
  // Whenever the server emits 'typing', show the typing message
  socket.on('typing:start', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('typing:stop', function (data) {
    removeChatTyping(data);
  });
});