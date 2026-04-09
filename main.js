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

function initSocket() {
    // Si no hay room, no conectamos todavía
    if (!state.room) return;

    state.socket = io();

    state.socket.on('connect', () => {
        console.log('Conectado al servidor');
        state.socket.emit('join_room', state.room);
        roomIdDisplay.textContent = state.room;
        addSystemMessage(`Te has unido a la sala: ${state.room}`);
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
        addSystemMessage('Desconectado del servidor.');
    });
}

/**
 * UI Functions
 */
function init() {
    // Check if room is provided in URL hash (e.g. #N7@k9)
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        state.room = hash;
        roomEntry.value = hash;
        localStorage.setItem('nexus_room', hash);
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
    } else {
        alert('Por favor, introduce tu nombre y el código de sala.');
    }
});

clearChatBtn.addEventListener('click', () => {
    state.messages = [];
    renderMessages();
    addSystemMessage('Pantalla limpia (El historial del servidor no ha sido afectado)');
});

exportChatBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.messages, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `nexus_chat_${state.room}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

init();
