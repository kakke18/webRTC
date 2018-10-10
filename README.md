webRTC
===

Video chat application using webRTC

## Description
WebRTC is a technology for exchanging real-time communication on the web as is name.
Because webRTC requires a lot of technology, many protocols are used.

It is video chat application using webRTC.

This application has the following functions.
* video and audio calls
* chat
* whiteboard
* draw on screen
* screen sharing

Screen sharing requires extensions of Chrome.


## Reference
* [webRTC ハンズオン](https://github.com/yusuke84/webrtc-handson-2016)
* [SkyWay ScreenShare Library](https://github.com/skyway/skyway-screenshare/blob/master/README_ja.md)

## Prepare
```
npm install ws express
```

## Usage
```
node server/signaling.js
cd client
(python3.x)
python -m http.server 8000
(python2.x)
python -m SimpleHTTPServer 8000
```
Access to [http://localhost:8000](http://localhost:8000)

※Every browser supports webRTC 1.0, but I am developing it for Chrome or Firefox

## Environment
### Languages
* html
* css
* JavaScript
### Library
* nodeJS

## Author
[kakke18](https://github.com/kakke18)
