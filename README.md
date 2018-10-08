webRTC
===

Video chat tool using webRTC

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
