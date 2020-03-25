// Webcam WebRTC stream handling

// WebRTC
function httpGetAsync(theUrl, callback) {
    try {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                callback(xmlHttp.responseText);
            }
        };
        xmlHttp.open("GET", theUrl, true); // true for asynchronous
        xmlHttp.send(null);
    } catch (e) {
        console.error(e);
    }
}

var signalling_server_hostname = location.hostname || "127.0.0.1";
// var signalling_server_address = signalling_server_hostname + ':' + (location.port || (location.protocol === 'https:' ? 443 : 80));
var signalling_server_address = signalling_server_hostname + ':5004';
var isFirefox = typeof InstallTrigger !== 'undefined';// Firefox 1.0+

addEventListener("DOMContentLoaded", function () {
    document.getElementById('signalling_server').value = signalling_server_address;
});

var ws = null;
var pc;
var gn;
var datachannel, localdatachannel;
var audio_video_stream;
var recordedBlobs;
var pcConfig = {/*sdpSemantics : "plan-b"*,*/ "iceServers": [
        {"urls": ["stun:stun.l.google.com:19302", "stun:" + signalling_server_hostname + ":3478"]}
    ]};
var pcOptions = {
    optional: [
        // Deprecated:
        //{RtpDataChannels: false},
        //{DtlsSrtpKeyAgreement: true}
    ]
};
var mediaConstraints = {
    optional: [],
    mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
    }
};
var keys = [];
var trickle_ice = true;
var remoteDesc = false;
var iceCandidates = [];

RTCPeerConnection = window.RTCPeerConnection || /*window.mozRTCPeerConnection ||*/ window.webkitRTCPeerConnection;
RTCSessionDescription = /*window.mozRTCSessionDescription ||*/ window.RTCSessionDescription;
RTCIceCandidate = /*window.mozRTCIceCandidate ||*/ window.RTCIceCandidate;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia;
var URL = window.URL || window.webkitURL;

function createPeerConnection() {
    try {
        var pcConfig_ = pcConfig;
        try {
            ice_servers = document.getElementById('ice_servers').value;
            if (ice_servers) {
                pcConfig_.iceServers = JSON.parse(ice_servers);
            }
        } catch (e) {
            alert(e + "\nExample: "
                    + '\n[ {"urls": "stun:stun1.example.net"}, {"urls": "turn:turn.example.org", "username": "user", "credential": "myPassword"} ]'
                    + "\nContinuing with built-in RTCIceServer array");
        }
        console.log(JSON.stringify(pcConfig_));
        pc = new RTCPeerConnection(pcConfig_, pcOptions);
        pc.onicecandidate = onIceCandidate;
        if ('ontrack' in pc) {
            pc.ontrack = onTrack;
        } else {
            pc.onaddstream = onRemoteStreamAdded; // deprecated
        }
        pc.onremovestream = onRemoteStreamRemoved;
        pc.ondatachannel = onDataChannel;
        console.log("peer connection successfully created!");
    } catch (e) {
        console.error("createPeerConnection() failed");
    }
}

function onDataChannel(event) {
    console.log("onDataChannel()");
    datachannel = event.channel;

    event.channel.onopen = function () {
        console.log("Data Channel is open!");
    };

    event.channel.onerror = function (error) {
        console.error("Data Channel Error:", error);
    };

    event.channel.onmessage = function (event) {
        console.log("Got Data Channel Message:", event.data);
    };

    event.channel.onclose = function () {
        datachannel = null;
        console.log("The Data Channel is Closed");
    };
}

function onIceCandidate(event) {
    if (event.candidate) {
        var candidate = {
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        };
        var request = {
            what: "addIceCandidate",
            data: JSON.stringify(candidate)
        };
        ws.send(JSON.stringify(request));
    } else {
        console.log("End of candidates.");
    }
}

function addIceCandidates() {
    iceCandidates.forEach(function (candidate) {
        pc.addIceCandidate(candidate,
            function () {
                console.log("IceCandidate added: " + JSON.stringify(candidate));
            },
            function (error) {
                console.error("addIceCandidate error: " + error);
            }
        );
    });
    iceCandidates = [];
}

function onRemoteStreamAdded(event) {
    console.log("Remote stream added:", event.stream);
    var remoteVideoElement = document.getElementById('remote-video');
    remoteVideoElement.srcObect = event.stream;
    //remoteVideoElement.play();
}

function onTrack(event) {
    console.log("Remote track!");
    var remoteVideoElement = document.getElementById('remote-video');
    remoteVideoElement.srcObject = event.streams[0];
    //remoteVideoElement.play();
}

function onRemoteStreamRemoved(event) {
    var remoteVideoElement = document.getElementById('remote-video');
    remoteVideoElement.srcObject = null;
    remoteVideoElement.src = ''; // TODO: remove
}

function start() {
    if ("WebSocket" in window) {
        document.getElementById("stop").disabled = false;
        document.getElementById("start").disabled = true;
        document.documentElement.style.cursor = 'wait';
        var server = document.getElementById("signalling_server").value.toLowerCase();

        var protocol = location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(protocol + '//' + server + '/stream/webrtc');

        function call(stream) {
            iceCandidates = [];
            remoteDesc = false;
            createPeerConnection();
            if (stream) {
                pc.addStream(stream);
            }
            var request = {
                what: "call",
                options: {
                    force_hw_vcodec: document.getElementById("remote_hw_vcodec").checked,
                    vformat: document.getElementById("remote_vformat").value,
                    trickle_ice: trickleice_selection()
                }
            };
            ws.send(JSON.stringify(request));
            console.log("call(), request=" + JSON.stringify(request));
        }

        ws.onopen = function () {
            console.log("onopen()");

            audio_video_stream = null;

            call();
        };

        ws.onmessage = function (evt) {
            var msg = JSON.parse(evt.data);
            if (msg.what !== 'undefined') {
                var what = msg.what;
                var data = msg.data;
            }
            //console.log("message=" + msg);
            console.log("message =" + what);

            switch (what) {
                case "offer":
                    pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data)),
                            function onRemoteSdpSuccess() {
                                remoteDesc = true;
                                addIceCandidates();
                                console.log('onRemoteSdpSucces()');
                                pc.createAnswer(function (sessionDescription) {
                                    pc.setLocalDescription(sessionDescription);
                                    var request = {
                                        what: "answer",
                                        data: JSON.stringify(sessionDescription)
                                    };
                                    ws.send(JSON.stringify(request));
                                    console.log(request);

                                }, function (error) {
                                    alert("Failed to createAnswer: " + error);

                                }, mediaConstraints);
                            },
                            function onRemoteSdpError(event) {
                                alert('Failed to set remote description (unsupported codec on this browser?): ' + event);
                                stop();
                            }
                    );

                    /*
                     * No longer needed, it's implicit in "call"
                    var request = {
                        what: "generateIceCandidates"
                    };
                    console.log(request);
                    ws.send(JSON.stringify(request));
                    */
                    break;

                case "answer":
                    break;

                case "message":
                    alert(msg.data);
                    break;

                case "iceCandidate": // when trickle is enabled
                    if (!msg.data) {
                        console.log("Ice Gathering Complete");
                        break;
                    }
                    var elt = JSON.parse(msg.data);
                    let candidate = new RTCIceCandidate({sdpMLineIndex: elt.sdpMLineIndex, candidate: elt.candidate});
                    iceCandidates.push(candidate);
                    if (remoteDesc)
                        addIceCandidates();
                    document.documentElement.style.cursor = 'default';
                    break;

                case "iceCandidates": // when trickle ice is not enabled
                    var candidates = JSON.parse(msg.data);
                    for (var i = 0; candidates && i < candidates.length; i++) {
                        var elt = candidates[i];
                        let candidate = new RTCIceCandidate({sdpMLineIndex: elt.sdpMLineIndex, candidate: elt.candidate});
                        iceCandidates.push(candidate);
                    }
                    if (remoteDesc)
                        addIceCandidates();
                    document.documentElement.style.cursor = 'default';
                    break;
            }
        };

        ws.onclose = function (evt) {
            if (pc) {
                pc.close();
                pc = null;
            }
            document.getElementById("stop").disabled = true;
            document.getElementById("start").disabled = false;
            document.documentElement.style.cursor = 'default';
        };

        ws.onerror = function (evt) {
            alert("An error has occurred!");
            ws.close();
        };

    } else {
        alert("Sorry, this browser does not support WebSockets.");
    }
}

function stop() {
    if (datachannel) {
        console.log("closing data channels");
        datachannel.close();
        datachannel = null;
    }
    if (localdatachannel) {
        console.log("closing local data channels");
        localdatachannel.close();
        localdatachannel = null;
    }
    if (audio_video_stream) {
        try {
            if (audio_video_stream.getVideoTracks().length)
                audio_video_stream.getVideoTracks()[0].stop();
            if (audio_video_stream.getAudioTracks().length)
                audio_video_stream.getAudioTracks()[0].stop();
            audio_video_stream.stop(); // deprecated
        } catch (e) {
            for (var i = 0; i < audio_video_stream.getTracks().length; i++)
                audio_video_stream.getTracks()[i].stop();
        }
        audio_video_stream = null;
    }
    document.getElementById('remote-video').srcObject = null;
    document.getElementById('remote-video').src = ''; // TODO; remove
    if (pc) {
        pc.close();
        pc = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
    document.getElementById("stop").disabled = true;
    document.getElementById("start").disabled = false;
    document.documentElement.style.cursor = 'default';
}

function mute() {
    var remoteVideo = document.getElementById("remote-video");
    remoteVideo.muted = !remoteVideo.muted;
}

function pause() {
    var remoteVideo = document.getElementById("remote-video");
    if (remoteVideo.paused)
        remoteVideo.play();
    else
        remoteVideo.pause();
}

function fullscreen() {
    var remoteVideo = document.getElementById("remote-video");
    if (remoteVideo.requestFullScreen) {
        remoteVideo.requestFullScreen();
    } else if (remoteVideo.webkitRequestFullScreen) {
        remoteVideo.webkitRequestFullScreen();
    } else if (remoteVideo.mozRequestFullScreen) {
        remoteVideo.mozRequestFullScreen();
    }
}

function handleDataAvailable(event) {
    //console.log(event);
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

function handleStop(event) {
    recorder = null;
    var superBuffer = new Blob(recordedBlobs, {type: 'video/webm'});
}

function remote_hw_vcodec_selection() {
    if (!document.getElementById('remote_hw_vcodec').checked)
        unselect_remote_hw_vcodec();
    else
        select_remote_hw_vcodec();
}

function remote_hw_vcodec_format_selection() {
    if (document.getElementById('remote_hw_vcodec').checked)
        remote_hw_vcodec_selection();
}

function select_remote_hw_vcodec() {
    document.getElementById('remote_hw_vcodec').checked = true;
    var vformat = document.getElementById('remote_vformat').value;
    switch (vformat) {
        case '5':
            document.getElementById('remote-video').style.width = "320px";
            document.getElementById('remote-video').style.height = "240px";
            break;
        case '10':
            document.getElementById('remote-video').style.width = "320px";
            document.getElementById('remote-video').style.height = "240px";
            break;
        case '20':
            document.getElementById('remote-video').style.width = "352px";
            document.getElementById('remote-video').style.height = "288px";
            break;
        case '25':
            document.getElementById('remote-video').style.width = "640px";
            document.getElementById('remote-video').style.height = "480px";
            break;
        case '30':
            document.getElementById('remote-video').style.width = "640px";
            document.getElementById('remote-video').style.height = "480px";
            break;
        case '35':
            document.getElementById('remote-video').style.width = "800px";
            document.getElementById('remote-video').style.height = "480px";
            break;
        case '40':
            document.getElementById('remote-video').style.width = "960px";
            document.getElementById('remote-video').style.height = "720px";
            break;
        case '50':
            document.getElementById('remote-video').style.width = "1024px";
            document.getElementById('remote-video').style.height = "768px";
            break;
        case '55':
            document.getElementById('remote-video').style.width = "1280px";
            document.getElementById('remote-video').style.height = "720px";
            break;
        case '60':
            document.getElementById('remote-video').style.width = "1280px";
            document.getElementById('remote-video').style.height = "720px";
            break;
        case '63':
            document.getElementById('remote-video').style.width = "1280px";
            document.getElementById('remote-video').style.height = "720px";
            break;
        case '65':
            document.getElementById('remote-video').style.width = "1280px";
            document.getElementById('remote-video').style.height = "768px";
            break;
        case '70':
            document.getElementById('remote-video').style.width = "1280px";
            document.getElementById('remote-video').style.height = "768px";
            break;
        case '75':
            document.getElementById('remote-video').style.width = "1536px";
            document.getElementById('remote-video').style.height = "768px";
            break;
        case '80':
            document.getElementById('remote-video').style.width = "1280px";
            document.getElementById('remote-video').style.height = "960px";
            break;
        case '90':
            document.getElementById('remote-video').style.width = "1600px";
            document.getElementById('remote-video').style.height = "768px";
            break;
        case '95':
            document.getElementById('remote-video').style.width = "1640px";
            document.getElementById('remote-video').style.height = "1232px";
            break;
        case '97':
            document.getElementById('remote-video').style.width = "1640px";
            document.getElementById('remote-video').style.height = "1232px";
            break;
        case '98':
            document.getElementById('remote-video').style.width = "1792px";
            document.getElementById('remote-video').style.height = "896px";
            break;
        case '99':
            document.getElementById('remote-video').style.width = "1792px";
            document.getElementById('remote-video').style.height = "896px";
            break;
        case '100':
            document.getElementById('remote-video').style.width = "1920px";
            document.getElementById('remote-video').style.height = "1080px";
            break;
        case '105':
            document.getElementById('remote-video').style.width = "1920px";
            document.getElementById('remote-video').style.height = "1080px";
            break;
        default:
            document.getElementById('remote-video').style.width = "1280px";
            document.getElementById('remote-video').style.height = "720px";
    }
    /*
     // Disable video casting. Not supported at the moment with hw codecs.
     var elements = document.getElementsByName('video_cast');
     for(var i = 0; i < elements.length; i++) {
     elements[i].checked = false;
     }
     */
}

function unselect_remote_hw_vcodec() {
    document.getElementById('remote_hw_vcodec').checked = false;
    document.getElementById('remote-video').style.width = "640px";
    document.getElementById('remote-video').style.height = "480px";
}

function trickleice_selection() {
    if (document.getElementById('trickleice').value === "false") {
        trickle_ice = false;
    } else if (document.getElementById('trickleice').value === "true") {
        trickle_ice = true;
    } else {
        trickle_ice = null;
    }
    return trickle_ice;
}

window.onload = function () {
    if (false) {
        start();
    }
};

window.onbeforeunload = function () {
    if (ws) {
        ws.onclose = function () {}; // disable onclose handler first
        stop();
    }
};
