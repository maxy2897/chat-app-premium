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

io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado:', socket.id);

    // Enviar historial al conectar
    const history = fs.readJsonSync(DB_PATH);
    socket.emit('init_history', history);

    socket.on('new_message', (msg) => {
        // Guardar mensaje en disco local
        const currentData = fs.readJsonSync(DB_PATH);
        currentData.push(msg);

        // Mantener solo los últimos 200 mensajes
        const updatedData = currentData.slice(-200);
        fs.writeJsonSync(DB_PATH, updatedData);

        // Reenviar a todos (incluyendo el remitente)
        io.emit('broadcast_message', msg);
    });

    socket.on('clear_all', () => {
        fs.writeJsonSync(DB_PATH, []);
        io.emit('history_cleared');
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
