const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js'); // Import MessageMedia
const qrcode = require('qrcode');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

// Serve static files from the "public" directory
app.use(express.static('public'));

client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        io.emit('qr', url);
    });
});

client.on('ready', () => {
    console.log('Client is ready!');
    io.emit('ready');
});

client.on('authenticated', () => {
    console.log('Authenticated successfully');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failure', msg);
    io.emit('auth_failure', msg);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

client.initialize().catch(err => {
    console.error('Failed to initialize client:', err);
});

io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('sendMessage', async (data) => {
        const numbers = data.numbers;
        const message = data.message;
        const imageData = data.image;

        if (!Array.isArray(numbers) || numbers.length === 0) {
            console.error('No numbers provided or invalid numbers format');
            socket.emit('messageStatus', { status: 'failure', error: 'No numbers provided or invalid format' });
            return;
        }

        if (!message && !imageData) {
            console.error('No message or image provided');
            socket.emit('messageStatus', { status: 'failure', error: 'No message or image provided' });
            return;
        }

        for (let number of numbers) {
            const chatId = ${number.replace('+', '')}@c.us;

            try {
                if (imageData) {
                    const media = new MessageMedia('image/jpeg', imageData.split(',')[1]);
                    await client.sendMessage(chatId, media, { caption: message });
                } else {
                    await client.sendMessage(chatId, message);
                }
                console.log(Message sent successfully to ${number});
                socket.emit('messageStatus', { number, status: 'success' });
            } catch (err) {
                console.error(Failed to send message to ${number}:, err);
                socket.emit('messageStatus', { number, status: 'failure', err });
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});