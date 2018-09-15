"use strict";

const WebSocketServer = require('ws').Server;
const port = 3001;
let wsServer = new WebSocketServer({ port: port });

let isConnect = false;
let roomName = '';

wsServer.on('connection', ((ws) => {
    console.log('-- websocket connected --');
    console.log('number of clients: ', countClient());

    ws.on('message', ((message) => {
        const msg = JSON.parse(message);
        if (!isConnect) {
            if (roomName == '') {
                roomName = msg.room;
                console.log('setting roomName: ', roomName)
                const createMsg = JSON.stringify({
                    type: 'server', data: 'createroom'
                });
                ws.send(createMsg);
            } else if (roomName == msg.room){
                console.log('matching roomName: ', roomName)
                isConnect = true;
                wsServer.clients.forEach(function each(client) {
                    console.log('sending connect signal');
                    const connectMsg = JSON.stringify({
                        type: 'server', data: 'success'
                    });
                    // roomNameをセットしたclientにメッセージを送信
                    if (!isSame(ws, client)) {
                        client.send(connectMsg);
                    }
                });
            } else {
                console.log('the roomName is not setting');
                const notSettingMsg = JSON.stringify({
                    type: 'server', data: 'notsetting'
                });
                ws.send(notSettingMsg)
            }
        }
        else {
            wsServer.clients.forEach(function each(client) {
                if (isSame(ws, client)) {
                    console.log('- skip sender -');
                } else {
                    console.log('sending');
                    client.send(message);
                }
            });
        }
    }));
}));

const countClient = () => {
    let clientNum = 0;
    wsServer.clients.forEach(function each(client) {
        clientNum++;
    });
    return clientNum;
};

const isSame = (ws1, ws2) => {
    // -- compare object --
    return (ws1 === ws2);
};

console.log('websocket server start. port=' + port);
