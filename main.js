import { Peer } from "https://esm.sh/peerjs@1.5.1?bundle-deps";

/**
 * Nexus Chat - P2P Logic (No Cloud Records)
 */

const state = {
    username: localStorage.getItem('nexus_user') || '',
    avatar: localStorage.getItem('nexus_avatar') || '',
    messages: [],
    peer: null,
    conn: null
};

// DOM Elements
const messagesContainer = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const nameModal = document.getElementById('name-modal');
const usernameEntry = document.getElementById('username-entry');
const startBtn = document.getElementById('start-btn');
const displayName = document.getElementById('display-name');
const userAvatarImg = document.getElementById('user-avatar');
const clearChatBtn = document.getElementById('clear-chat');
const exportChatBtn = document.getElementById('export-chat');
const peerIdDisplay = document.getElementById('peer-id');

/**
 * Initialize PeerJS
 */
function initP2P() {
    state.peer = new Peer();

    state.peer.on('open', (id) => {
        console.log('Mi ID de Peer es: ' + id);
        peerIdDisplay.textContent = id;
        
        // Si hay un ID en la URL, conectar automáticamente
        const targetId = window.location.hash.replace('#', '');
        if (targetId) {
            connectToPeer(targetId);
        }
    });

    state.peer.on('connection', (connection) => {
        state.conn = connection;
        setupConnection();
        addSystemMessage(`Conectado con un par remoto.`);
    });

    state.peer.on('error', (err) => {
        console.error('Error de Peer:', err);
        addSystemMessage(`Error: ${err.type}`);
    });
}

function connectToPeer(targetId) {
    if (state.conn) return;
    addSystemMessage(`Conectando a ${targetId}...`);
    state.conn = state.peer.connect(targetId);
    setupConnection();
}

function setupConnection() {
    state.conn.on('open', () => {
        addSystemMessage('Conexión P2P establecida con éxito.');
        // Enviar nuestro nombre al conectar
        state.conn.send({ type: 'SYSTEM', text: `${state.username} se ha unido al chat.` });
    });

    state.conn.on('data', (data) => {
        if (data.type === 'MESSAGE') {
            state.messages.push(data.payload);
            renderMessages();
        } else if (data.type === 'SYSTEM') {
            addSystemMessage(data.text);
        }
    });

    state.conn.on('close', () => {
        addSystemMessage('El par remoto se ha desconectado.');
        state.conn = null;
    });
}

/**
 * UI Functions
 */
function init() {
    if (!state.username) {
        nameModal.classList.remove('hidden');
    } else {
        nameModal.classList.add('hidden');
        setupUserUI();
    }
    initP2P();
    renderMessages();
}

function setupUserUI() {
    displayName.textContent = state.username;
    if (!state.avatar) {
        state.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${state.username}`;
        localStorage.setItem('nexus_avatar', state.avatar);
    }
    userAvatarImg.src = state.avatar;
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
    if (!text.trim()) return;

    const msg = {
        user: state.username,
        text: text.trim(),
        time: new Date().toISOString()
    };

    state.messages.push(msg);
    renderMessages();

    if (state.conn && state.conn.open) {
        state.conn.send({ type: 'MESSAGE', payload: msg });
    } else {
        addSystemMessage('No hay nadie conectado actualmente.');
    }
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
    const val = usernameEntry.value.trim();
    if (val) {
        state.username = val;
        localStorage.setItem('nexus_user', val);
        nameModal.classList.add('hidden');
        setupUserUI();
    }
});

clearChatBtn.addEventListener('click', () => {
    state.messages = [];
    renderMessages();
    addSystemMessage('Pantalla limpia (El historial remoto no ha sido afectado)');
});

exportChatBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.messages, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `nexus_chat_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

peerIdDisplay.addEventListener('click', () => {
    const url = `${window.location.origin}${window.location.pathname}#${state.peer.id}`;
    navigator.clipboard.writeText(url);
    alert('¡Enlace de invitación copiado al portapapeles!');
});

init();
