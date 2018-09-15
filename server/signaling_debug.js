"use strict";

const WebSocketServer = require('ws').Server;
const port = 3001;
const wsServer = new WebSocketServer({ port: port });

wsServer.on('connection', function(ws) {
    console.log('-- websocket connected --');
    ws.on('message', function(message) {
        wsServer.clients.forEach(function each(client) {
            if (isSame(ws, client)) {
                console.log('- skip sender -');
            }
            else {
                client.send(message);
            }
        });
    });
});

function isSame(ws1, ws2) {
    // -- compare object --
    return (ws1 === ws2);
}

console.log('websocket server start. port=' + port);

/*
const doLocalNegotiation =  () => {
    switchStream(localStream, captureStream);
    doNegotiation();
};

const doCaptureNegotiation =  () => {
    switchStream(captureStream, localStream);
    doNegotiation();
};

const switchStream =  (stream1, stream2) => {
    // stream2を除外
    if (stream2) {
        peerConnection.removeStream(stream2);
        stream2 = null;
    }
    // stream1を追加
    stream1.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream1);
    });
    console.log('adding steram');
};

const doNegotiation = async (stream) => {
    if (!peerConnection) {
        console.log('negotiation is not need because peerConnection is null' );
        return;
    }

    try {
        const offer = await peerConnection.createOffer();
        console.log('createOffer() succsess in promise');
        await peerConnection.setLocalDescription(offer);
        console.log('setLocalDescription() succsess in promise');
        sendSdp(peerConnection.localDescription);
    } catch (err) {
        console.error('doNegotiation ERROR: ', err);
    }
};
*/