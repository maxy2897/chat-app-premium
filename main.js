/**
 * Nexus Chat - Socket.io Version
 */

const state = {
    username: localStorage.getItem('nexus_user') || '',
    room: localStorage.getItem('nexus_room') || '',
    messages: [],
    socket: null
};

// DOM Elements
const messagesContainer = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const nameModal = document.getElementById('name-modal');
const usernameEntry = document.getElementById('username-entry');
const roomEntry = document.getElementById('room-entry');
const startBtn = document.getElementById('start-btn');
const displayName = document.getElementById('display-name');
const userAvatarImg = document.getElementById('user-avatar');
const clearChatBtn = document.getElementById('clear-chat');
const exportChatBtn = document.getElementById('export-chat');
const roomIdDisplay = document.getElementById('room-id');

const userListContainer = document.getElementById('user-list');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const sidebar = document.querySelector('.sidebar');
const participantCount = document.querySelector('.participant-count');

function initSocket() {
    if (!state.room) return;

    state.socket = io({
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
    });

    state.socket.on('connect', () => {
        state.socket.emit('join_room', { 
            roomCode: state.room, 
            username: state.username 
        });
        roomIdDisplay.textContent = state.room;
        document.querySelector('.status-indicator').classList.add('online');
        document.querySelector('.user-status').textContent = 'En línea';
    });

    state.socket.on('update_user_list', (users) => {
        renderUserList(users);
        participantCount.textContent = `${users.length} persona(s) conectada(s)`;
    });

    state.socket.on('init_history', (history) => {
        state.messages = history;
        renderMessages();
    });

    state.socket.on('broadcast_message', (msg) => {
        state.messages.push(msg);
        renderMessages();
    });

    state.socket.on('disconnect', () => {
        document.querySelector('.status-indicator').classList.remove('online');
        document.querySelector('.user-status').textContent = 'Reconectando...';
    });
}

function renderUserList(users) {
    userListContainer.innerHTML = '';
    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.innerHTML = `
            <div class="contact-avatar">${user.charAt(0).toUpperCase()}</div>
            <div class="contact-name">${user} ${user === state.username ? '(Tú)' : ''}</div>
        `;
        userListContainer.appendChild(item);
    });
}

/**
 * UI Functions
 */
function init() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        state.room = hash;
        if (roomEntry) roomEntry.value = hash;
    }

    if (!state.username || !state.room) {
        nameModal.classList.remove('hidden');
    } else {
        nameModal.classList.add('hidden');
        setupUserUI();
        initSocket();
    }
}

function setupUserUI() {
    displayName.textContent = state.username;
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${state.username}`;
    userAvatarImg.src = avatar;
}

function renderMessages() {
    messagesContainer.innerHTML = '';
    state.messages.forEach(msg => {
        const isMe = msg.user === state.username;
        const msgElement = document.createElement('div');
        msgElement.className = `message ${isMe ? 'me' : 'other'}`;
        const timestamp = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        msgElement.innerHTML = `
            ${!isMe ? `<span class="message-label">${msg.user}</span>` : ''}
            <div class="message-content">
                ${msg.text}
                <div class="message-time">${timestamp}</div>
            </div>
        `;
        messagesContainer.appendChild(msgElement);
    });
    scrollToBottom();
}

function addSystemMessage(text) {
    const sysMsg = document.createElement('div');
    sysMsg.className = 'system-message';
    sysMsg.textContent = text;
    messagesContainer.appendChild(sysMsg);
    scrollToBottom();
}

function sendMessage(text) {
    if (!text.trim() || !state.socket) return;
    const msg = {
        room: state.room,
        user: state.username,
        text: text.trim(),
        time: new Date().toISOString()
    };
    state.socket.emit('new_message', msg);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Event Listeners
toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// Cerrar sidebar al hacer clic fuera en móvil
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        !toggleSidebarBtn.contains(e.target) && 
        sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(messageInput.value);
    messageInput.value = '';
});

startBtn.addEventListener('click', () => {
    const userVal = usernameEntry.value.trim();
    const roomVal = roomEntry.value.trim();
    if (userVal && roomVal) {
        state.username = userVal;
        state.room = roomVal;
        localStorage.setItem('nexus_user', userVal);
        localStorage.setItem('nexus_room', roomVal);
        nameModal.classList.add('hidden');
        setupUserUI();
        initSocket();
    }
});

clearChatBtn.addEventListener('click', () => {
    state.messages = [];
    renderMessages();
});

exportChatBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.messages, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `nexus_chat_${state.room}.json`);
    downloadAnchorNode.click();
});

init();
