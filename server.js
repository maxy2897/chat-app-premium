import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'chat-history.json');

const app = express();
app.use(cors());

// Intentar servir desde 'dist' (si existe) o desde la raíz
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(__dirname));

// Red de seguridad: Cualquier otra ruta devolverá el index.html (esto evita errores de Path en Express 5)
app.use((req, res) => {
    const indexPath = fs.existsSync(path.join(__dirname, 'dist', 'index.html')) 
        ? path.join(__dirname, 'dist', 'index.html')
        : path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Asegurar que el archivo de datos existe
if (!fs.existsSync(DB_PATH)) {
    fs.writeJsonSync(DB_PATH, []);
}

// Objeto para rastrear usuarios: { roomId: { socketId: username } }
const rooms = {};

io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado:', socket.id);

    socket.on('join_room', ({ roomCode, username }) => {
        socket.join(roomCode);
        
        // Registrar usuario en la sala
        if (!rooms[roomCode]) rooms[roomCode] = {};
        rooms[roomCode][socket.id] = username;
        
        console.log(`Usuario ${username} se unió a la sala: ${roomCode}`);
        
        // Enviar historial de la sala
        const history = fs.readJsonSync(DB_PATH).filter(m => m.room === roomCode);
        socket.emit('init_history', history);

        // Notificar a todos en la sala la nueva lista de usuarios
        io.to(roomCode).emit('update_user_list', Object.values(rooms[roomCode]));
    });

    socket.on('new_message', (msg) => {
        const currentData = fs.readJsonSync(DB_PATH);
        currentData.push(msg);
        fs.writeJsonSync(DB_PATH, currentData.slice(-500));
        io.to(msg.room).emit('broadcast_message', msg);
    });

    socket.on('disconnecting', () => {
        // Al desconectarse, eliminar de todas las salas
        for (const roomCode of socket.rooms) {
            if (rooms[roomCode] && rooms[roomCode][socket.id]) {
                delete rooms[roomCode][socket.id];
                io.to(roomCode).emit('update_user_list', Object.values(rooms[roomCode]));
            }
        }
    });

    socket.on('clear_room', (roomCode) => {
        const currentData = fs.readJsonSync(DB_PATH);
        const newData = currentData.filter(m => m.room !== roomCode);
        fs.writeJsonSync(DB_PATH, newData);
        io.to(roomCode).emit('history_cleared');
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Servidor de Chat Privado corriendo en http://localhost:${PORT}`);
    console.log(`Mensajes guardándose en: ${DB_PATH}`);
});
