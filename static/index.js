// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const ROOM = document.querySelector(".room");
const supportedEmojis = ['👍', '❤️', '😄', '😢', '😡'];

// Custom validation on the password reset fields
const passwordField = document.querySelector(".profile input[name=password]");
const repeatPasswordField = document.querySelector(".profile input[name=repeatPassword]");
const repeatPasswordMatches = () => {
  const p = document.querySelector(".profile input[name=password]").value;
  const r = repeatPassword.value;
  return p == r;
};

const checkPasswordRepeat = () => {
  const passwordField = document.querySelector(".profile input[name=password]");
  if(passwordField.value == repeatPasswordField.value) {
    repeatPasswordField.setCustomValidity("");
    return;
  } else {
    repeatPasswordField.setCustomValidity("Password doesn't match");
  }
}

passwordField.addEventListener("input", checkPasswordRepeat);
repeatPasswordField.addEventListener("input", checkPasswordRepeat);

//---------------------------------------
window.addEventListener('load', () => {
  router();
});

window.addEventListener('popstate', () => {
  router();
});

let CURRENT_ROOM = 0;
let USER_NAME = "";
let USER_ID = 0;
let TIMER_ID = null;

function isLoggedIn() {
  if (localStorage.getItem('yuzhuobai_belay_api_key') != null) {
    return true;
  }
  else {
    return false;
  }
  
}

// -------------------- all page ----------
let showOnly = (element) => {
  CURRENT_ROOM = 0;
  SPLASH.classList.add("hide");
  PROFILE.classList.add("hide");
  LOGIN.classList.add("hide");
  ROOM.classList.add("hide");
  element.classList.remove("hide");
}

let router = () => {
  let path = window.location.pathname;
  if (!isLoggedIn() && !['/', '/login'].includes(path)) {
    localStorage.setItem('redirectAfterLogin', path);
    showOnly(LOGIN);
    stopMessagePolling();
  } else if (!isLoggedIn() && ['/'].includes(path)){
    localStorage.setItem('redirectAfterLogin', path);
    showOnly(SPLASH);
    fetchRoomsNotLogin();
    stopMessagePolling();
  } else {
    switch (path) {
      case "/":
        if (isLoggedIn()) {
          showOnly(SPLASH);
          stopMessagePolling();
        } else {
          showOnly(LOGIN);
          stopMessagePolling();
        }
        break;
      case "/login":
        if (isLoggedIn()) {
          window.location.pathname = "/";
        } else {
          showOnly(LOGIN);
          stopMessagePolling();
        }
        break;
      case "/profile":
        if (isLoggedIn()) {
          showOnly(PROFILE);
          stopMessagePolling();
        } else {
          localStorage.setItem('redirectAfterLogin', path);
          showOnly(LOGIN);
          stopMessagePolling();
        }
        break;
        case path.startsWith("/room/") && path.includes("/thread/"):
          if (isLoggedIn()) {
            let parts = path.split('/');
            CURRENT_ROOM = parseInt(parts[2]);
            const messageId = parseInt(parts[4]);
            localStorage.setItem('current_room', CURRENT_ROOM.toString());
            showOnly(ROOM);
            enterRoom();
            openThread(messageId);
          } else {
            localStorage.setItem('redirectAfterLogin', path);
            showOnly(LOGIN);
            stopMessagePolling();
          }
          break;
        default:
          if (path.startsWith("/room/") && isLoggedIn()) {
            let parts = path.split('/');
            CURRENT_ROOM = parseInt(parts[2]);
            localStorage.setItem('current_room', CURRENT_ROOM.toString());
            showOnly(ROOM);
            enterRoom();
          } else {
            localStorage.setItem('redirectAfterLogin', path);
            showOnly(LOGIN);
            stopMessagePolling();
          }
    }
  }

  if (!window.history.state || window.history.state.path !== path) {
    window.history.pushState({ path: path }, "", path);
  }
};

window.addEventListener('popstate', () => {
  router();
});

// window.addEventListener("DOMContentLoaded", router);
// window.addEventListener("popstate", router);

// ------------------index page---------------
function fetchRoomsNotLogin() {
  fetch('/api/rooms/not_logged', {
  }).then(response => response.json())
      .then(data => {
        const roomsContainer = document.querySelector(".splash .roomList");
        roomsContainer.innerHTML = "";
        console.log("data: " + data);

        if (data.length > 0) {
          document.querySelector(".splash .rooms").classList.remove("hide");
          data.forEach(room => {
            console.log("room.id: " + room.room_id);
            console.log("room.room_name: " + room.room_name);
            console.log("room.unread_count: " + room.total_messages);
            const roomElement = document.createElement("a");
            roomElement.href = `/room/${room.room_id}`;
            roomElement.innerHTML = `${room.room_id}: <strong>${room.room_name}</strong> ${room.total_messages > 0 ? `<span>(${room.total_messages})</span>` : ''}`;
            roomElement.addEventListener("click", (e) => {
              e.preventDefault();
              window.location.pathname = `/room/${room.room_id}`;
            });
            roomsContainer.appendChild(roomElement);
          });
          document.querySelector(".splash .noRooms").classList.add("hide");
        } else {
          document.querySelector(".splash .rooms").classList.remove("hide");
          document.querySelector(".splash .noRooms").classList.remove("hide");
        }
      }).catch(error => console.error('Error fetching rooms:', error));
}

document.addEventListener('DOMContentLoaded', function() {
  checkLoginStatus();
  setupEventListeners();
});

function checkLoginStatus() {
  const loggedIn = isLoggedIn();
  if (loggedIn) {
      document.querySelector(".loggedIn").classList.remove("hide");
      document.querySelector(".loggedOut").classList.add("hide");
      document.querySelector(".create").classList.remove("hide");
      document.querySelector(".signup").classList.add("hide");
      USER_NAME = localStorage.getItem('user_name');
      document.querySelector(".username").textContent = `Welcome back, ${USER_NAME}!`;
      fetchRooms();
  } else {
      document.querySelector(".loggedIn").classList.add("hide");
      document.querySelector(".loggedOut").classList.remove("hide");
      document.querySelector(".create").classList.add("hide");
      document.querySelector(".signup").classList.remove("hide");
      document.querySelector(".rooms").classList.add("hide");
  }
}

function setupEventListeners() {
  document.querySelector(".create").addEventListener("click", createRoom);
  document.querySelector(".signup").addEventListener("click", signUp);
  document.querySelector(".loggedOut a").addEventListener("click", function() {
      window.location.pathname = "/login";
  });
  document.querySelector(".loggedIn a").addEventListener("click", function() {
    window.location.pathname = "/profile";
});
}



function createRoom() {
  const api_key = localStorage.getItem('yuzhuobai_belay_api_key');
  fetch('/api/rooms/new', {
      method: 'POST',
      headers: {
          'Authorization': api_key,
      }
  }).then(response => response.json())
  .then(data => {
      window.location.pathname = `/room/${data.id}`;
  }).catch(error => console.error('Error creating room:', error));
}

function signUp() {
  fetch('/api/signup', {
      method: 'POST'
  }).then(response => response.json())
  .then(data => {
      localStorage.setItem('user_name', data.user_name);
      localStorage.setItem('yuzhuobai_belay_api_key', data.api_key);
      localStorage.setItem('user_id', data.user_id);
      USER_NAME = data.user_name;
      USER_ID = data.user_id;
      checkLoginStatus();
    const redirectPath = localStorage.getItem('redirectAfterLogin') || "/";
    localStorage.removeItem('redirectAfterLogin');
    window.location.pathname = redirectPath;
  }).catch(error => console.error('Error signing up:', error));
}

function fetchRooms() {
  const api_key = localStorage.getItem('yuzhuobai_belay_api_key');
  fetch('/api/rooms', {
      headers: {
          'Authorization': api_key,
      }
  }).then(response => response.json())
  .then(data => {
      const roomsContainer = document.querySelector(".splash .roomList");
      roomsContainer.innerHTML = "";
      if (data.length > 0) {
          document.querySelector(".splash .rooms").classList.remove("hide");
          data.forEach(room => {
            const roomElement = document.createElement("a");
            roomElement.href = `/room/${room.room_id}`;
            roomElement.innerHTML = `${room.room_id}: <strong>${room.room_name}</strong> ${room.unread_count > 0 ? `<span>(${room.unread_count})</span>` : ''}`;
            roomElement.addEventListener("click", (e) => {
              e.preventDefault();
              window.location.pathname = `/room/${room.room_id}`;
            });
            roomsContainer.appendChild(roomElement);
          });
          document.querySelector(".splash .noRooms").classList.add("hide");
      } else {
          document.querySelector(".splash .rooms").classList.remove("hide");
          document.querySelector(".splash .noRooms").classList.remove("hide");
      }
  }).catch(error => console.error('Error fetching rooms:', error));
}



// ----------------------- MessagePolling -------------------------
function startMessagePolling() {
  CURRENT_ROOM = localStorage.getItem("current_room")
  console.log("startMessagePolling, CURRENT_ROOM Id = " + CURRENT_ROOM);
  if (TIMER_ID){
    clearInterval(TIMER_ID);
    TIMER_ID = null;
  }
  fetchMessages(CURRENT_ROOM);
  TIMER_ID = setInterval(() => fetchMessages(CURRENT_ROOM), 500);
  console.log("success startMessagePolling");
}

function stopMessagePolling() {
  console.log("stopMessagePolling, CURRENT_ROOM Id = " + CURRENT_ROOM);
  clearInterval(TIMER_ID);
  TIMER_ID = null;
  console.log("success stopMessagePolling");
}

// ------------------profile---------------------
// ------------------ Profile Page Event Listeners ---------------------
document.addEventListener('DOMContentLoaded', function() {
  if(isLoggedIn()) {
    const usernameDisplay = document.querySelector(".profile .loginHeader .loggedIn .username");
    USER_NAME = localStorage.getItem('user_name'); // Assuming you saved the username in localStorage
    usernameDisplay.textContent = USER_NAME;
  }

  document.querySelector(".profile [name='username'] + button").addEventListener("click", updateUsername);
  document.querySelector(".profile [name='password'] + button").addEventListener("click", updatePassword);

  document.querySelector(".profile .logout").addEventListener("click", logout);

  document.querySelector(".profile .goToSplash").addEventListener("click", () => {
    window.location.pathname = "/";
  });
});

document.addEventListener('DOMContentLoaded', function() {
  if(isLoggedIn()) {
    const usernameInput = document.querySelector(".profile input[name='username']");
    USER_NAME = localStorage.getItem('user_name');
    usernameInput.value = USER_NAME;
  }
  
  setupEventListeners();
});

// ------------------ Update Username Function ---------------------
function updateUsername() {
  const newUsername = document.querySelector(".profile input[name='username']").value;
  fetch("/api/user/name", {
    method: "POST",
    headers: {
      "Authorization": localStorage.getItem('yuzhuobai_belay_api_key'),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({new_name: newUsername})
  })
  .then(response => response.json())
  .then(data => {
    alert("Username updated successfully.");
    localStorage.setItem('user_name', newUsername);
    location.reload();
  })
  .catch(error => console.error('Error updating username:', error));
}

function updatePassword() {
  const newPassword = document.querySelector(".profile input[name='password']").value;
  const repeatPassword = document.querySelector(".profile input[name='repeatPassword']").value;
  if (newPassword !== repeatPassword) {
    alert("Passwords do not match.");
    return;
  }

  fetch("/api/user/password", {
    method: "POST",
    headers: {
      "Authorization": localStorage.getItem('yuzhuobai_belay_api_key'),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({new_password: newPassword})
  })
  .then(response => response.json())
  .then(data => {
    alert("Password updated successfully.");
    location.reload();
  })
  .catch(error => console.error('Error updating password:', error));
}


// ------------------ Logout Function ---------------------
function logout() {
  localStorage.removeItem('yuzhuobai_belay_api_key'); // Remove api_key from local storage
  localStorage.removeItem('user_name'); // Remove user_name from local storage
  localStorage.removeItem('user_id');
  USER_NAME = ""; // Reset global variable
  USER_ID = 0; // Assuming you also want to reset this
  window.location.pathname = "/"; // Redirect to the splash page
}


// -------------------------login page---------

function loginSuccess() {
  const redirectPath = localStorage.getItem('redirectAfterLogin') || "/";
  localStorage.removeItem('redirectAfterLogin');
  window.location.pathname = redirectPath;
}


document.querySelector('.header h2 a').addEventListener('click', () => {
  window.location.pathname = "/";
});

document.querySelector(".login button").addEventListener("click", function() {
  const username = document.querySelector(".login input[name='username']").value;
  const password = document.querySelector(".login input[type='password']").value;

  fetch('/api/login', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: password, userName: username })
  })
  .then(response => response.json())
  .then(data => {
      if (data.error) {
        document.querySelector('.login .failed').style.display = 'flex';
      } else {
          localStorage.setItem('yuzhuobai_belay_api_key', data.api_key);
          localStorage.setItem('user_name', data.user_name);
          localStorage.setItem('user_id', data.user_id);
          USER_ID = data.user_id; 
          USER_NAME = data.user_name;
          loginSuccess();
      }
  })
  .catch(error => {
      console.error('Error:', error);
      document.querySelector('.login .failed').style.display = 'flex';
  });
});

document.querySelector(".login .failed button").addEventListener("click", signUp);




// ---------------------- Room -----------------------
function fetchRoomsInRoom() {
  const api_key = localStorage.getItem('yuzhuobai_belay_api_key');
  fetch('/api/rooms', {
      headers: {
          'Authorization': api_key,
      }
  }).then(response => response.json())
  .then(data => {
      const roomsContainer = document.querySelector(".room .roomList");
      roomsContainer.innerHTML = "";
      
      if (data.length > 0) {
          document.querySelector(".room .rooms").classList.remove("hide");
          data.forEach(room => {
            const roomElement = document.createElement("a");
            roomElement.href = `/room/${room.room_id}`;
            roomElement.innerHTML = `${room.room_id}: <strong>${room.room_name}</strong> ${room.unread_count > 0 ? `<span>(${room.unread_count})</span>` : ''}`;
            roomElement.addEventListener("click", (e) => {
              e.preventDefault();
              window.location.pathname = `/room/${room.room_id}`;
            });
            roomsContainer.appendChild(roomElement);
          });
          document.querySelector(".room .noRooms").classList.add("hide");
      } else {
          document.querySelector(".room .rooms").classList.remove("hide");
          document.querySelector(".room .noRooms").classList.remove("hide");
      }
  }).catch(error => console.error('Error fetching rooms:', error));
}

setInterval(fetchRoomsInRoom, 1000);

function enterRoom() {
  document.querySelector(".displayRoomName").classList.remove("hide");
  document.querySelector(".editRoomName").classList.add("hide");
  document.querySelector(".thread-container").classList.add("hide");

  const room_id = localStorage.getItem('current_room');
  fetch(`/api/rooms/${room_id}`, {
    method: 'GET',
    headers: {
      'Authorization': localStorage.getItem('yuzhuobai_belay_api_key'),
    }
  })
  .then(response => response.json())
  .then(data => {
    document.querySelector(".displayRoomName strong").textContent = data.room_name;
    const inviteLinkElement = document.querySelector("#invite-link");
    inviteLinkElement.href = `/room/${data.room_id}`;
    inviteLinkElement.textContent = `/room/${data.room_id}`;
    document.querySelector(".editRoomName input").value = data.room_name;
    updateUsernameDisplay();
    console.log("userName:", USER_NAME);
    showOnly(ROOM);
    fetchRoomsInRoom();
    fetchMessages(room_id);
    startMessagePolling();
  })
  .catch(error => console.error('Error entering room:', error));
}

document.querySelector(".displayRoomName a").addEventListener("click", function() {
  document.querySelector(".displayRoomName").classList.add("hide");
  document.querySelector(".editRoomName").classList.remove("hide");
});

function updateUsernameDisplay() {
  const userName = localStorage.getItem('user_name');
  const usernameElements = document.querySelectorAll(".username");
  
  usernameElements.forEach((elem) => {
    elem.textContent = userName;
  });
}

document.querySelector(".editRoomName button").addEventListener("click", function() {
  const newRoomName = document.querySelector(".editRoomName input").value;
  const room_id = localStorage.getItem('current_room');
  fetch("/api/rooms/name", {
    method: "POST",
    headers: {
      "Authorization": localStorage.getItem('yuzhuobai_belay_api_key'),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ new_name: newRoomName, room_id: room_id })
  })
  .then(response => response.json())
  .then(data => {
    alert("Room name updated successfully.");
    enterRoom();
  })
  .catch(error => console.error('Error updating room name:', error));
});

document.querySelector(".comment_box button").addEventListener("click", function() {
  const messageBody = document.querySelector(".comment_box textarea").value;
  const room_id = localStorage.getItem('current_room');
  fetch(`/api/rooms/${room_id}/messages`, {
    method: "POST",
    headers: {
      "Authorization": localStorage.getItem('yuzhuobai_belay_api_key'),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body: messageBody, user_id: localStorage.getItem('user_id') })
  })
  .then(response => response.json())
  .then(data => {
    alert("Message posted successfully.");
    fetchMessages(room_id);
  })
  .catch(error => console.error('Error posting message:', error));
});

function fetchMessages(room_id) {
  fetch(`/api/rooms/${room_id}/messages`, {
    method: "GET",
    headers: {
      "Authorization": localStorage.getItem('yuzhuobai_belay_api_key'),
    }
  })
  .then(response => response.json())
  .then(data => {
    const messagesContainer = document.querySelector(".messages");
    messagesContainer.innerHTML = ''; // 清空当前消息

    if (data.length > 0) {
      const messageList = document.createElement("div");
      data.forEach(msg => {
        const messageElement = document.createElement("message");

        const urlRegex = /(https?:\/\/[^\s]+(?=\.(jpg|gif|png))\.\2)/g;
        let bodyWithImages = msg.body.replace(urlRegex, (url) => {
          return `<img src="${url}" alt="Image" style="max-width:200px;"><br>`;
        });

        messageElement.innerHTML = `
          <author>${msg.author}</author>
          <content>
            ${msg.replies_to ? `@${msg.replied_author} ` : ''}
            ${bodyWithImages}
          </content>
          ${msg.reply_count > 0 ? `<div class="reply-count">${msg.reply_count} replies</div>` : ''}
          <div class="reactions">
          ${(msg.reactions || []).map(reaction => `
          <button class="reaction" data-reaction-id="${reaction.id}" data-emoji="${reaction.emoji}">
            ${reaction.emoji} ${reaction.count}
          </button>
        `).join('')}
          </div>
        `;
        const replyButton = document.createElement("button");
        replyButton.textContent = "Reply";
        replyButton.addEventListener("click", () => openThread(msg.id));
        messageElement.appendChild(replyButton);

        const reactionsElement = document.createElement("div");
        reactionsElement.className = "reactions";
        supportedEmojis.forEach(emoji => {
          const buttonElement = document.createElement("button");
          buttonElement.textContent = emoji;
          buttonElement.addEventListener("click", () => addReaction(msg.id, emoji));
          reactionsElement.appendChild(buttonElement);
        });
        (msg.reactions || []).forEach(reaction => {
          const reactionElement = document.createElement("div");
          reactionElement.className = "reaction-info";
          reactionElement.innerHTML = `
            ${reaction.emoji} ${reaction.count}
            <div class="reaction-users" style="display:none;"></div>
          `;

          reactionElement.addEventListener("mouseover", function() {
            fetchReactionUsers(reaction.id, this.querySelector('.reaction-users'));
          });
          reactionElement.addEventListener("mouseout", function() {
            this.querySelector('.reaction-users').style.display = 'none';
          });
          
          
          reactionsElement.appendChild(reactionElement);
        });
    
        messageElement.appendChild(reactionsElement);

        messageList.appendChild(messageElement);
      });
      messagesContainer.appendChild(messageList);
    } else {
      const noMessagesElement = document.createElement("div");
      noMessagesElement.className = "noMessages";
      noMessagesElement.textContent = "No messages yet.";
      messagesContainer.appendChild(noMessagesElement);
    }
  })
  .catch(error => console.error('Error fetching messages:', error));
}

function addReaction(messageId, emoji) {
  fetch(`/api/messages/${messageId}/reactions`, {
    method: 'POST',
    headers: {
      'Authorization': localStorage.getItem('yuzhuobai_belay_api_key'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ emoji: emoji, user_id: localStorage.getItem('user_id') }),
  })
  .then(response => response.json())
  .then(data => {
    alert("Reaction added successfully");
    fetchMessages(localStorage.getItem('current_room'));
  })
  .catch(error => console.error('Error adding reaction:', error));
}

function fetchReactionUsers(reactionId, reactionUsersElement) {
  fetch(`/api/reactions/${reactionId}/users`, {
    headers: {
      'Authorization': localStorage.getItem('yuzhuobai_belay_api_key'),
    },
  })
  .then(response => response.json())
  .then(data => {
    const userNames = data.map(user => user.name).join(', ');
    
    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'emoji-reaction';
    emojiSpan.title = userNames; 
    reactionUsersElement.innerHTML = '';
    reactionUsersElement.appendChild(emojiSpan);
    reactionUsersElement.style.display = 'block';
  })
  .catch(error => console.error('Error fetching reaction users:', error));
}


function hideReactionUsers(button) {
  button.removeAttribute('title');
}

function closeThread() {
  document.querySelector(".thread-container").classList.remove("active");
  document.querySelector(".thread-container").classList.add("hide");

  if (window.innerWidth >= 768) {
    document.querySelector(".chat-container").style.width = "100%";
  } else {
    document.querySelector(".chat-container").style.display = "block";
  }

  const newUrl = `/room/${localStorage.getItem('current_room')}`;
  window.history.pushState({}, '', newUrl);
  window.location.reload();
}
document.querySelector(".close-thread-btn").addEventListener("click", closeThread);

function openThread(messageId) {
  document.querySelector(".thread-container").classList.remove("hide");
  document.querySelector(".thread-container").classList.add("active");

  const newUrl = `/room/${localStorage.getItem('current_room')}/thread/${messageId}`;
  window.history.pushState({}, '', newUrl);
  document.querySelector(".reply_box button").dataset.messageId = messageId;

  if (window.innerWidth >= 768) {
    document.querySelector(".chat-container").style.width = "calc(100% - 600px)";
  } else {
    document.querySelector(".chat-container").style.display = "none";
  }
  fetch(`/api/messages/${messageId}/thread`, {
    method: "GET",
    headers: {
      "Authorization": localStorage.getItem('yuzhuobai_belay_api_key'),
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const threadContainer = document.querySelector(".thread");
    const parentMessageElement = threadContainer.querySelector(".parent-message");
    const replyMessagesContainer = threadContainer.querySelector(".reply-messages");

    const parentAuthor = parentMessageElement.querySelector("author");
    const parentContent = parentMessageElement.querySelector("content");
    parentAuthor.textContent = data.parent_message.author;

    const urlRegex = /(https?:\/\/[^\s]+(?=\.(jpg|gif|png))\.\2)/g;
    let parentBodyWithImages = data.parent_message.body.replace(urlRegex, (url) => {
      return `<br><img src="${url}" alt="Image" style="max-width:200px;">`;
    });
    parentContent.innerHTML = parentBodyWithImages;

    replyMessagesContainer.innerHTML = "";
    if (data.reply_messages.length > 0) {
      data.reply_messages.forEach(message => {
        const replyMessageElement = document.createElement("message");
        replyMessageElement.classList.add("reply-message");

        let replyBodyWithImages = message.body.replace(urlRegex, (url) => {
          return `<br><img src="${url}" alt="Image" style="max-width:200px;">`;
        });

        replyMessageElement.innerHTML = `
          <author>${message.author}</author>
          <content>${replyBodyWithImages}</content>
        `;
        replyMessagesContainer.appendChild(replyMessageElement);
      });
      threadContainer.querySelector(".noMessages").style.display = "none";
    } else {
      threadContainer.querySelector(".noMessages").style.display = "block";
    }
  })
  .catch(error => {
    console.error('Error fetching thread:', error);
    alert('Error fetching thread. Please try again.');
  });
}


document.querySelector(".reply_box button").addEventListener("click", function() {
  const messageBody = document.querySelector(".reply_box textarea").value;
  const room_id = localStorage.getItem('current_room');
  const messageId = this.dataset.messageId;

  fetch(`/api/rooms/${room_id}/messages/${messageId}/thread`, {
    method: "POST",
    headers: {
      "Authorization": localStorage.getItem('yuzhuobai_belay_api_key'),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body: messageBody, user_id: localStorage.getItem('user_id') }) 
  })
  .then(response => response.json())
  .then(data => {
    alert("Message posted successfully.");
    openThread(messageId);
  })
  .catch(error => console.error('Error posting message:', error));
});