/*
    TODO一覧
     ・マウスオーバーでの説明(PCに慣れていない人にもわかりやすいようにボタンの説明等)
     ・チャット:文字の表示欄の長さ(cssがうまくできず固定長になってしまった．文字列の長さに応じて可変長にしたい．)
     ・キャンバスボタン:レーザポインタ(displayPointerで前回表示したポインターを消去するだけ)
     ・画面共有:終了
     ・画面共有：受け手と送り手のチェンジ
*/

/*--------------------------------------------------*/
/*----------------------- 部品 ----------------------*/
/*--------------------------------------------------*/
/*--- 共通 ---*/
const css = document.getElementById('cs');
const returnBtn = document.getElementById('return_btn');
/*--- 接続 ---*/
const roomName = document.getElementById('room_name');
const connectBtn = document.getElementById('connect_btn');
/*--- ビデオ ---*/
const localVideo = document.getElementById('local_video');
const remoteVideo = document.getElementById('remote_video');
/*--- メニューボタン ---*/
const menuBtns = document.getElementsByClassName('menu_btn_container');
const disconnectBtn = document.getElementById('disconnect_btn');
const videoBtn = document.getElementById('video_btn');
const muteBtn = document.getElementById('mute_btn');
// const micBtn = document.getElementById('mic_btn');
// const cameraSwitchBtn = document.getElementById('camera_switch_btn');
const chatBtn = document.getElementById('chat_btn');
const drawingBtn = document.getElementById('drawing_btn');
const whiteBtn = document.getElementById('white_btn');
const screenBtn = document.getElementById('screen_btn');
/*--- チャット ---*/
const chatSendTextarea = document.getElementById('chat_send_textarea');
const chatSendBtn = document.getElementById('chat_send_btn');
const chatTimeline = document.getElementById('chat_timeline');
/*--- ホワイトボード ---*/
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const canvasBtns = document.getElementsByClassName('canvas_btn_container');
const colorBtns = document.getElementsByClassName('color_select_btns');
const colorBtn = document.getElementById('color');
const sizeBtn = document.getElementById('size');
const resize = document.getElementsByClassName('resize');
const shapeBtns = document.getElementsByClassName('shape_select_btns');

/*--------------------------------------------------*/
/*------------------ グローバル変数 ------------------*/
/*--------------------------------------------------*/
/*--- 通信用 ---*/
let peerConnection = null;
let dataChannel = null;
/*--- ビデオ用 ---*/
let localStream = null;
let remoteStream = null;
let captureStream = null;
let isVideo = true;

/*--- 初期配置 ---*/
roomName.focus();
connectBtn.disabled = 'true';
videoBtn.style.background = '#f00';
videoBtn.style.color = '#fff';
muteBtn.style.background = '#bbb';
muteBtn.style.color = '#000';

/*--------------------------------------------------*/
/*---------------------- WebRTC --------------------*/
/*--------------------------------------------------*/
/*--- WebRTCを利用する準備 ---*/
const prepareNewConnection = (isOffer) => {
    const pc_config = {"iceServers":[ {"urls":"stun:stun.webrtc.ecl.ntt.com:3478"} ]};
    const peer = new RTCPeerConnection(pc_config);

    /*-- DataChannelを生成 ---*/
    if (isOffer) {
        dataChannel = peer.createDataChannel("DataChannel", {
            ordered: false,             // 順序を保証しない
            maxRetransmitTime: 3000,    // 再送が失敗するまでの試行回数(ミリ秒)
        });
        addDataChannelListeners(dataChannel);
    }

    // リモートのMediaStreamTrackを受信した時
    peer.ontrack = (evt) => {
        console.log('peer.ontrack()');
        // remoteStreamが2回来たらreturn
        if (remoteStream == evt.streams[0]) {
            return;
        }
        remoteStream = evt.streams[0];
        playVideo(remoteVideo, remoteStream);
    };

    // ICE andidateを収集したときのイベント(Vanila ICE)
    peer.onicecandidate = (evt) => {
        if (evt.candidate) {
            sendIceCandidate(evt.candidate);
        } else {
            console.log('empty ice event');
        }
    };

    // ICEのステータスが変更になった時の処理
    peer.oniceconectionstatechange = () => {
        console.log('ICE connection Status has changed to ' + peer.iceConnectionState);
        switch (peer.iceConnectionState) {
            case 'closed':
            case 'failed':
                if (peerConnection) {
                    hangUp();
                }
                break;
            case 'dissconnected':
                break;
        }
    };

    //answer側ならdoNegotiation()を実行しないのでここで追加
    if (!isOffer && localStream) {
        localStream.getTracks().forEach((track) => {
            peer.addTrack(track, localStream);
        });
    }

    return peer;
}

/*--- SDP交換時の処理を追加 ---*/
const sendSdp = (sessionDescription) => {
    console.log('sending sdp');
    const message = JSON.stringify(sessionDescription);
    ws.send(message);
};

/*--- Connectボタンが押されたらWebRTCのOffer処理を開始 ---*/
const connect = async () => {
    if (!peerConnection) {
        console.log('make offer');
        await startVideo(true);
        peerConnection = prepareNewConnection(true);
        doLocalNegotiation();
    } else {
        console.warn('peer already exist.');
    }
};

/*--- Answer SDPを生成 ---*/
const makeAnswer = async () => {
    console.log('sending Answer. Creating remote session description' );

    if (!peerConnection) {
        console.error('peerConnection NOT exist!');
        return;
    }

    // Answer SDPを生成，送信
    try {
        const answer = await peerConnection.createAnswer();
        console.log('createAnswer() succsess in promise');
        await peerConnection.setLocalDescription(answer);
        console.log('setLocalDescription() succsess in promise');
        sendSdp(peerConnection.localDescription);
    } catch (err) {
        console.error('makeAnswer() ERROR: ', err);
    }

    /*--- DataChannelの接続を監視 ---*/
    peerConnection.ondatachannel = (evt) => {
        console.log('peer ondatachannel()');
        dataChannel = evt.channel;
        addDataChannelListeners(dataChannel);
    }
}

/*--- Offer側のSDPをセットする処理(Answer側の処理)---*/
const setOffer = async (sessionDescription) => {
    if (peerConnection) {
        console.log('peerConnection is reset');
    } else {
        peerConnection = prepareNewConnection(false);
    }
    
    try {
        await peerConnection.setRemoteDescription(sessionDescription);
        console.log('setRemoteDescription(answer) succsess in promise');
        makeAnswer();
    } catch(err) {
        console.error('setRemoteDescription(offer) ERROR: ', err);
    }
}

/*--- Answer側のSDPをセットする場合(Offer側の処理) ---*/
const setAnswer = async (sessionDescription) => {
    if (!peerConnection) {
        console.warn('peerConnection NOT exist!');
        return;
    }

    try {
        await peerConnection.setRemoteDescription(sessionDescription);
        console.log('setRemoteDescription(answer) succsess in promise');
    } catch(err) {
        console.error('setRemoteDescription(answer) ERROR: ', err);
    }
}

/*--- localStreamの交渉 ---*/
const doLocalNegotiation =  () => {
    switchStream(localStream, captureStream);
    doNegotiation();
};

/*--- captureStreamの交渉 ---*/
const doCaptureNegotiation =  () => {
    switchStream(captureStream, localStream);
    doNegotiation();
};

/*--- 片方があるなら取り除き，もう一方を追加---*/
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

/*--- offerSDPを作成，送信 ---*/
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


/*--- データチャンネル ---*/
const addDataChannelListeners = (channel) => {
    channel.onopen = (evt) => {
        console.log('DataChannel open()');
        css.href = 'css/style_connect.css';
    };
    channel.onerror = (err) => {
        console.error('DataChannel onerror() ERR:', err);
    };
    channel.onmessage = (evt) => {
        console.log('DataChannel onmessage() data');
        // 画像をバイナリデータで
        drawCanvas(evt.data);
    };
    channel.onclose = () => {
        console.log("DataChannel close()");
        hangUp();
        css.href = 'css/style_index.css';
    };
};

/*--- P2P通信を切断する ---*/
const hangUp = () => {
    if (peerConnection) {
        if (peerConnection.iceConnectionState !== 'closed') {
            peerConnection.close();
            peerConnection = null;
            const message = JSON.stringify({ type: 'close' });
            console.log('sending close message');
            ws.send(message);
            if (isVideo) {
                cleanupVideoElement(remoteVideo);
                isVideo = false;
            }

            return;
        }
    }
    console.log('peerConnection is closed.');
};

/*--------------------------------------------------*/
/*-------------------- WebSocket -------------------*/
/*--------------------------------------------------*/
const wsUrl = 'ws://localhost:3001/';
const ws = new WebSocket(wsUrl);

ws.onopen = (evt) => {
    console.log('ws open()');
};
ws.onerror = (err) => {
    console.error('ws onerror() ERR:', err);
};
ws.onmessage = async (evt) => {
    console.log('ws onmessage() data');
    const message = JSON.parse(evt.data);
    switch (message.type) {
        case 'server': {
            wsOnMessageServer(message.data);
            break;
        }
        case 'offer': {
            console.log('received offer');
            await startVideo(false);
            setOffer(message);
            break;
        }
        case 'answer': {
            console.log('received answer');
            setAnswer(message);
            break;
        }
        case 'candidate': {
            console.log('received ICE candidate');
            const candidate = new RTCIceCandidate(message.ice);
            addIceCandidate(candidate);
            break;
        }
        case 'video': {
            console.log('received tag: video');
            stopRemoteVideo();
            break;
        }
        case 'audio': {
            if (message.data == 'stop') {
                alert('audio track of remoteStream is not enabled');
            } else {
                alert('audio track of remoteStream is enabled');                
            }
        }
        case 'chat': {
            console.log('received chat');
            isReceiveChat = true;
            setChat(message.text);
            isReceiveChat = false;
            break;
        }
        case 'mode': {
            console.log('received signal of mode chage')
            clearCanvas();    
            wsOnMessageMode(message.mode);
            break;
        }
        case 'canvas': {
            console.log('received signal of canvas');
            wsOnMessageCanvas(message.data);
            break;
        }
        case 'canvas_pointer': {
            console.log('received signal of canvas pointer');
            displayPointer(message.x, message.y);
            break;
        }
        case 'close': {
            console.log('peer is closed');
            hangUp();
            css.href =  'css/style_index.css'; 
            break;
        }
        default: { 
            console.log("invalid message"); 
            break;              
         }         
    }
};

const wsOnMessageServer = (msgData) => {
    switch (msgData) { 
        case 'success': {
            connect();
            break;
        }
        case 'createroom': {
            alert('create room. Please wait.');
            break;
        }
        case 'notsetting': {
            alert('The room name is not setting. Please input other room name.');
            roomName.value = '';
            roomName.focus();
            break;
        }
    }
};

const wsOnMessageMode = (msgMode) => {
    switch (msgMode) {
        case 'connect': {
            css.href = 'css/style_connect.css';
            break;
        }
        case 'chat': {
            css.href = 'css/style_chat.css';
            break; 
        }
        case 'drawing': {
            css.href = 'css/style_drawing_answer.css';
            break; 
        }
        case 'whiteboard': {
            css.href = 'css/style_whiteboard.css';
            break; 
        }
        case 'screen': {
            css.href = 'css/style_screen_answer.css'; 
            break; 
        }
        default: {
            console.log('invalid mode chnege');
            break;
        }
    }
};

const wsOnMessageCanvas = (msgData) => {
    switch (msgData) {
        case 'clear': {
            clearCanvas();
            break;
        }
        case 'switch': {
            switchCSS('drawing');
            break;
        }
        default: {
            console.log('invalid signal of canvas');
            break;
        }
    }
};

const switchCSS = (type) => {
    if (type == 'drawing' ) {
        if (css.href.indexOf('css/style_drawing_answer.css') != -1) {
            css.href = 'css/style_drawing_offer.css'
        } else {
            css.href = 'css/style_drawing_answer.css'
        }
    } else if (type == 'screenshare') {
        if (css.href.indexOf('css/style_screen_answer.css') != -1) {
            css.href = 'css/style_screen_offer.css'
        } else {
            css.href = 'css/style_screen_answer.css'
        }
    } else {
        console.error('error');
    }
};

/*--------------------------------------------------*/
/*------------------------ ICE ---------------------*/
/*--------------------------------------------------*/
/*--- ICE candaidate受信時にセット ---*/
const addIceCandidate = (candidate) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(candidate);
    } else {
        console.error('PeerConnection not exist!');
        return;
    }
};

/*--- ICE candidate生成時に送信 ---*/
const sendIceCandidate = (candidate) => {
    console.log('sending ICE candidate');
    const message = JSON.stringify({ type: 'candidate', ice: candidate });
    ws.send(message);
};

/*--------------------------------------------------*/
/*---------------------- メディア -------------------*/
/*--------------------------------------------------*/
/*--- ビデオをスタート ---*/
const startVideo = async (isOffer) => {
    console.log('start video');
    try {
        // getUserMediaでカメラ，マイクにアクセス
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {aspectRatio: 1.778},
            audio: false
        });
        // 接続が確立&offerなら交渉
        if (peerConnection && isOffer) {
            doLocalNegotiation();
        }
        playVideo(localVideo, localStream);
        // 自分の音声をミュートに
        localVideo.muted = true;
        isVideo = true;
    } catch (err) {
        console.error('mediaDevice.getUserMedia() error: ', err);
    }
};

/*--- ストリームをストップ ---*/
const stopStream = (stream) => {
    if (stream) {
        console.log('stream is not');    
        // track 毎に停止
        for (const track of stream.getVideoTracks()) {
            track.stop();
            stream.removeTrack(track);
        }
    } else {
        console.log('stream is null');
    }
};
/*--- LocalVideoの再生を停止 ---*/
const stopLocalVideo = () => {   
    stopStream(localStream);
    // videoタグを停止
    localVideo.pause();
    // 相手に通知
    if (peerConnection) {
        const message = JSON.stringify({ type: 'video', data: 'stop' });
        ws.send(message);
    }
    isVideo = false;
};
/*--- RemoteVideoの再生を停止 ---*/
const stopRemoteVideo = () => {
    stopStream(remoteStream);
    // videoタグを停止
    remoteVideo.pause();
};
/*--- Videoの再生を開始 ---*/
const playVideo = async (ele, stream) => {
    ele.srcObject = stream;
    try {
        await ele.play();
    } catch (err) {
        console.error('play media error: ', err);
    }   
}

/*--- ビデオエレメントを初期化 ---*/
const cleanupVideoElement = (ele) => {
    ele.pause();
    ele.srcObject = null;
}


/*--------------------------------------------------*/
/*------------------------- UI ---------------------*/
/*--------------------------------------------------*/
/*--- ルーム名 ---*/
roomName.addEventListener('input', (() => {
    if (roomName.value != "") {
        connectBtn.style.background = '#f00';
        connectBtn.disabled = '';
    } else {
        connectBtn.style.background = '#ddd';
        connectBtn.disabled = 'true';
    }
}));
/*--- 戻るボタン ---*/
returnBtn.addEventListener('click', () => {
    clearCanvas();
    const message = JSON.stringify({ type: 'mode', mode: 'connect' });
    ws.send(message);
    console.log('changed index mode');
    css.href = 'css/style_connect.css';
})
/*--- 接続ボタン ---*/
connectBtn.addEventListener('click', () => {
    if (!peerConnection) {
        const room = roomName.value;
        const message = JSON.stringify({
            type: 'connect', room: room
        });
        ws.send(message);
    } else {
        console.error('error');      
    }
});
disconnectBtn.addEventListener('click', (() => {
    if (peerConnection) {
        hangUp();
    } else {
        console.error('error');
    }
}));
/*--- メニューボタン ---*/
// micBtn.addEventListener('click', () => {
//     console.log('mic_btn is clicked');
// });
// caneraSwitchBtn.addEventListener('click', () => {
//     console.log('camera_switch_btn is clicked');
// });
videoBtn.addEventListener('click', () => {
    if (!isVideo) {
        startVideo(true);
        videoBtn.style.background = '#f00';
        videoBtn.style.color = '#fff';
    } else {
        stopLocalVideo();
        videoBtn.style.background = '#bbb';
        videoBtn.style.color = '#000';
    }
});
muteBtn.addEventListener('mouseover', function() {
    this.style.background = '#13178E';
    this.style.color = '#fff';
});
muteBtn.addEventListener('mouseout', function() {
    if (this.style.background.indexOf('255') == -1) {
        this.style.background = '#bbb';
        this.style.color = '#000';
    }
});
muteBtn.addEventListener('click', (() => {
    // localStreamの有無によって判断
    // localStream有 → 相手のremoteVideoに再生されている
    if (localStream) {
        if (!localStream.getAudioTracks()[0]) {
                console.log('audio tracks are null');
        } else {
            //track.enabledを反転
            localStream.getAudioTracks().forEach((track) => {
                changeTrackEnabled(track.enabled)
            });
        }
    } else {
        console.warn('can not mute because locaStream is null.');
    }
}));
const changeTrackEnabled = (isEnabled) => {
    if (isEnabled) {
        isEnabled = false;
        muteBtn.style.background = '#f00';
        muteBtn.style.color = '#fff';
        console.log('muted');
        const message = JSON.stringify({ type: 'audio', data: 'stop' });
        ws.send(message);
    } else {
        isEnabled = true;
        muteBtn.style.background ='#bbb';
        muteBtn.style.color = '#000';
        console.log('not muted');
        const message = JSON.stringify({ type: 'audio', data: 'start' });
        ws.send(message);
    }
};
/*--- モードボタン ---*/
chatBtn.addEventListener('click', () => {
    const message = JSON.stringify({ type: 'mode', mode: 'chat' });
    ws.send(message);
    console.log('changed chat mode');
    css.href = 'css/style_chat.css'; 
});
drawingBtn.addEventListener('click', () => {
    const message = JSON.stringify({ type: 'mode', mode: 'drawing' });
    ws.send(message);
    console.log('changed drawing mode');
    css.href = 'css/style_drawing_offer.css';    
});
whiteBtn.addEventListener('click', () => {
    const message = JSON.stringify({ type: 'mode', mode: 'whiteboard' });
    ws.send(message);
    console.log('changed whiteboard mode');
    css.href = 'css/style_whiteboard.css';
});
screenBtn.addEventListener('click', () => {
    const message = JSON.stringify({ type: 'mode', mode: 'screen' });
    ws.send(message);
    console.log('changed screen mode');
    css.href = 'css/style_screen_offer.css'; 
    startScreenshare();
});


/*--------------------------------------------------*/
/*---------------------- チャット -------------------*/
/*--------------------------------------------------*/
let isReceiveChat = false;

chatSendBtn.addEventListener('click', (() => {
    if (peerConnection) {
        const sendText = chatSendTextarea.value;
        setChat(sendText);
        const message = JSON.stringify({ type: 'chat', text: sendText });
        ws.send(message);
        chatSendTextarea.value = '';
        chatSendTextarea.focus();
        console.log('sending chat');
    } else {
        console.log('disconnect');
    }
}));

const setChat = (text) => {
    const boxEle = document.createElement('div');
    const textEle = document.createElement('div');
    if (isReceiveChat) {
        boxEle.className = 'chat_left';
    } else {
        boxEle.className = 'chat_right';
    }
    textEle.className = 'chat_text';
    textEle.innerHTML = text;
    boxEle.appendChild(textEle);
    chatTimeline.appendChild(boxEle);
    
    const clearEle = document.createElement('div');
    clearEle.className = 'chat_clear';
    chatTimeline.appendChild(clearEle);
};

/*--------------------------------------------------*/
/*---------------------- お絵かき -------------------*/
/*--------------------------------------------------*/
/*--- 初期値 ---*/
// サイズ，色，アルファ値)
let defoSize = 5;
let defoColor = '#000';
let defoAlpha = 1;
// マウス
let mouseX = '';
let mouseY = '';
let mousePos = null;
// フラグ
let whichSelectShape = 0; //0:普通，1:四角，2:三角，3:丸
let isPointer = false;
// 図形
let startX = '';
let startY = ''
let endX = '';
let endY = '';

/*--- 継続値を初期値に戻す ---*/
const drawEnd = (e) => {
    if (whichSelectShape) {
        if (startX == '') {
            return;
        }
        mousePos = getAdjustedPosition(e, canvas)
        endX = mousePos.x;
        endY = mousePos.y;
        drawShape(startX, startY, endX, endY);
        whichSelectShape = 0;
        startX = '';
        startY = '';
        endX = '';
        endY = '';
    } else {
        mouseX = '';
        mouseY = '';
    }
}

/*--- 各イベントに紐付け ---*/
canvas.addEventListener('mousedown', ((e) => {
    // 左クリック時
    if (e.buttons === 1 || e.witch === 1) {
        mousePos = getAdjustedPosition(e, canvas)
        if (isPointer) {
            displayPointer(mousePos.x, mousePos.y);
            const message = JSON.stringify({ 
                type: 'canvas_pointer', 
                x: mousePos.x,
                y: mousePos.y
             });
            ws.send(message);
        } else if (whichSelectShape) {
            startX = mousePos.x;
            startY = mousePos.y;
        } else {
            draw(mousePos.x, mousePos.y);
        }
    }
}));
canvas.addEventListener('mousemove', ((e) => {
    // 左クリック時
    if (e.buttons === 1 || e.witch === 1) {
        mousePos = getAdjustedPosition(e, canvas)
        if (isPointer) {
            displayPointer(mousePos.x, mousePos.y);
            const message = JSON.stringify({ 
                type: 'canvas_pointer', 
                x: mousePos.x,
                y: mousePos.y
             });
            ws.send(message);
        } else if (!whichSelectShape) {
            draw(mousePos.x, mousePos.y);
        }
    }
}));
canvas.addEventListener('mouseup', drawEnd);
canvas.addEventListener('mouseout', drawEnd);


const getAdjustedPosition = (evt, elm) => {
    let rect = evt.target.getBoundingClientRect();
    let x = Math.round(elm.width * (evt.clientX - rect.left) / elm.clientWidth);
    let y = Math.round(elm.height * (evt.clientY - rect.top) / elm.clientHeight);
    return {x, y};
};

/*--- 描画関数 ---*/
/*--- Canvas に表示すると共にデータを送信 ---*/
const draw = (X, Y) => {
    // 現在のパスをリセット
    ctx.beginPath();

    // マウス継続値によって場合分け，直線のスタート地点を決定
    if (mouseX === '') {
        ctx.moveTo(X, Y);
    } else {
        ctx.moveTo(mouseX, mouseY);
    }

    
    //ゴール地点の決定，現在のマウス位置をゴール地点とする
    ctx.lineTo(X, Y);
    
    // 直線の角を「丸」、サイズと色を決める
    ctx.lineCap = 'round';
    ctx.lineWidth = defoSize;
    ctx.globalAlpha = defoAlpha;
    ctx.strokeStyle = defoColor;
    ctx.stroke();

    // マウス継続値に現在のマウス位置を代入
    mouseX = X;
    mouseY = Y;
    
    // 送信
    sendCanvas();
};

/*--- 描画関数(図形) ---*/
/*--- Canvas に表示すると共にデータを送信 ---*/
const drawShape = (X1, Y1, X2, Y2)=> {
    let diffX = X2 - X1;
    let diffY = Y2 - Y1;
    
    // 現在のパスをリセット
    ctx.beginPath();
    // 直線の角を「丸」、サイズと色を決める
    ctx.lineCap = 'round';
    ctx.lineWidth = defoSize;
    ctx.globalAlpha = defoAlpha;
    ctx.strokeStyle = defoColor;

    switch(whichSelectShape) {
        case 1: {
            ctx.strokeRect(X1, Y1, diffX, diffY);      
            break;
        }
        case 2: {
            ctx.moveTo(X1, Y1)
            ctx.lineTo(X2, Y2);
            ctx.lineTo(X1 - diffX * 2, Y2);
            ctx.closePath();
            ctx.stroke();
            break;
        }
        case 3: {
            let r = Math.sqrt(diffX * diffX + diffY * diffY);
            ctx.arc(X1, Y1, r, 0, Math.PI*2, false);
            ctx.stroke();
            break;
        }
        default: {
            console.error('error');
        }
    }
    
    // 送信
    sendCanvas();
};

/*--- ele.style.visibilityがvisibleならtrue ---*/
const isVisibility = (ele) => {
    if (ele.style.visibility == 'visible') {
        return true;
    } else {
        return false;   
    }
}
/*-- 表示非表示切り替え ---*/
const changeUIDisplay = (ele) => {
    if (isVisibility(ele)) {
        ele.style.visibility = 'hidden';
    } else {
        ele.style.visibility = 'visible';        
    }
}
/*--- まとめて表示非表示の切り替え ---*/
const changeCanvasMenu = (type) => {
    let ele = null;
    
    // eleにtypeの要素を代入
    if (type == 'color') {
        ele = colorBtns[0];
    } else if (type =='size') {
        ele = resize[0];
    } else if (type == 'shape') {
        ele = shapeBtns[0];
    } else {
        console.error('error');
    }

    // eleの表示を切り替え，他の要素を非表示
    if (isVisibility(ele)) {
        ele.style.visibility = 'hidden';
    } else {
        ele.style.visibility = 'visible';
        if (type == 'color') {
            resize[0].style.visibility = 'hidden';
            shapeBtns[0].style.visibility = 'hidden';
        } else if (type =='size') {
            colorBtns[0].style.visibility = 'hidden';
            shapeBtns[0].style.visibility = 'hidden';
        } else if (type == 'shape') {
            colorBtns[0].style.visibility = 'hidden';
            resize[0].style.visibility = 'hidden';
        } else {
            console.error('error');
        }
    }
}



/*--- ボタンにイベントを追加 ---*/
for (var i = 0; i < canvasBtns[0].childElementCount; i++) {
    const id = canvasBtns[0].children[i].id;
    canvasBtns[0].children[i].addEventListener('click', function doEvent() {
        switch (id) {
            case 'color': {
                changeCanvasMenu(id);
                break;
            }
            case 'size': {
                changeCanvasMenu(id);
                break;
            }
            case 'shape': {
                changeCanvasMenu(id);
                whichSelectShape = 0;
                break;
            }
            case 'pointer': {
                isPointer = !isPointer;
                break;
            }
            case 'eraser': {
                if (ctx.globalCompositeOperation == 'source-over') {
                    ctx.globalCompositeOperation = 'destination-out';
                    this.style.background = '#f00';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    this.style.background = '#bbb';                    
                }
                break;
            }
            case 'clear': {
                // ダイアログで確認
                if (confirm('全て削除しますか？')) {
                    clearCanvas();
                    const message = JSON.stringify({ type: 'canvas', data: 'clear' });
                    ws.send(message);
                }
                break;
            }
            case 'camera_stop': {
                if (this.innerHTML == '始') {
                    this.innerHTML = '停';
                    remoteVideo.style.visibility = 'visible';                
                } else {
                    this.innerHTML = '始';
                    remoteVideo.style.visibility = 'hidden';                
                }
                break;
            }
            case 'camera_switch': {
                // ダイアログで確認
                if (confirm('カメラを切り替えますか？')) {
                    switchCSS('drawing');
                    const message = JSON.stringify({ type: 'canvas', data: 'switch' });
                    ws.send(message);
                }
                break;
            }
            default: {
                console.error('no button');
            }
        }
    });
}

/*--- ボタンにイベントを追加 ---*/
for (var i = 0; i < colorBtns[0].childElementCount; i++) {
    const id = colorBtns[0].children[i].id;
    colorBtns[0].children[i].addEventListener('click', (() => {
        switch (id) {
            case 'gray': {
                defoColor = '#ccc';
                break;
            }
            case 'black': {
                defoColor = '#000';
                break;
            }
            case 'red': {
                defoColor = '#f00';
                break;
            }
            case 'yellow': {
                defoColor = '#ff0';
                break;
            }
            case 'green': {
                defoColor = '#0f0';
                break;
            }
            case 'blue': {
                defoColor = '#00f';
                break;
            }
            default: {
                console.error('no color');
            }
        }
        changeUIDisplay(colorBtns[0]);
        colorBtn.style.background = defoColor;
    }));
}


/*--- ポインタを表示 ---*/
const displayPointer = (X, Y) => {
    // 現在のパスをリセット
    ctx.beginPath();
    // 直線の角を「丸」、サイズと色を決める
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#f11';
    ctx.arc(X, Y, 2, 0, Math.PI*2, false);
    ctx.stroke();
};

/*--- サイズバー ---*/
resize[0].children[0].addEventListener('input', (() => {
    defoSize = resize[0].children[0].value;
    resize[0].children[1].innerHTML = Math.ceil(defoSize);
}));
resize[0].children[0].addEventListener('mouseup', (() => {
    changeUIDisplay(resize[0]);
}));

/*--- 形選択 ---*/
for (var i = 0; i < shapeBtns[0].childElementCount; i++) {
    const id = shapeBtns[0].children[i].id;
    shapeBtns[0].children[i].addEventListener('click', (() => {
        switch (id) {
            case 'square':{
                whichSelectShape = 1;
                break;
            }
            case 'triangle':{
                whichSelectShape = 2;
                break;
            }
            case 'circle':{
                whichSelectShape = 3;
                break;
            }
            default:{
                console.error('shape is not found');
            }
        }
        changeUIDisplay(shapeBtns[0]);
    }));
}

/*--- 画像を消去 ---*/
clearCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

/*-- 描画を送信(バイナリ) ---*/
sendCanvas = () => {
    if (peerConnection) {
        // Base64へ変換
        const base64 = canvas.toDataURL('image/png');
        // Base64からバイナリへ変換
        const bin = atob(base64.split(',')[1]);
        const buffer = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            buffer[i] = bin.charCodeAt(i);
        }
        // 送信
        dataChannel.send(buffer);
        console.log('sending draw data');
    } else {
        console.log('disconnect');
    }
}


/*-- 受信したデータをもとに描画 ---*/
const drawCanvas = (msg) => {
    /* バイナリデ-タ */
    const blob = new Blob([msg]);
    const url = window.URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
    };
    img.src = url;
}


/*
JSON形式の場合
sendCanvas = (x, y, size, color, alpha) => {
    var colorData = [x, y, size, color, alpha];

    // 送信
    const message = JSON.stringify({
        type: 'draw',
        data: colorData
    });
    console.log('sending draw message: ' + message);
    dataChannel.send(message);
};
drawCanvas = () => {
    // 現在のパスをリセット
    ctx.beginPath();

    // マウス継続値によって場合分け，直線のスタート地点を決定
    ctx.moveTo(msg[0], msg[1]);
    //ゴール地点の決定，現在のマウス位置をゴール地点とする
    ctx.lineTo(msg[0], msg[1]);
    // 直線の角を「丸」、サイズと色を決める
    ctx.lineCap = "round";
    ctx.lineWidth = msg[2];
    ctx.globalAlpha = msg[3];
    ctx.strokeStyle = msg[4];
    ctx.stroke();
};
*/

/*--------------------------------------------------*/
/*---------------------- 画面共有 -------------------*/
/*--------------------------------------------------*/
const startScreenshare = () => {
    const ss = ScreenShare.create({debug: true});

    if (!ss.isScreenShareAvailable()) {
      alert('Screen Share cannot be used. Please install the Chrome extension.');
      return;
    }

    ss.start({
        width:     $('#Width').val(),
        height:    $('#Height').val(),
        frameRate: $('#FrameRate').val(),
    })
    .then(stream => {
        captureStream = stream;
        doCaptureNegotiation();
        css.href = 'css/style_screen_offer.css';
        const message = JSON.stringify({ type: 'mode', data: 'screen' });
        ws.send(message);
    })
    .catch(err => {
        console.error('screenshare error: ' + err);
    });
};
