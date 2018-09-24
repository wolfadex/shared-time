const peerConnection = new RTCPeerConnection({
  iceServers: [{ url: 'stun:23.21.150.121' }],
});

// $('#showLocalOffer').modal('hide');
// $('#getRemoteAnswer').modal('hide');
// $('#waitForConnection').modal('hide');
// $('#createOrJoin').modal('show');

// $('#createBtn').click(function() {
//   $('#showLocalOffer').modal('show');
//   createLocalOffer();
// });

// $('#joinBtn').click(function() {
//   navigator.getUserMedia =
//     navigator.getUserMedia ||
//     navigator.webkitGetUserMedia ||
//     navigator.mozGetUserMedia ||
//     navigator.msGetUserMedia;
//   navigator.getUserMedia(
//     { video: true, audio: true },
//     function(stream) {
//       var video = document.getElementById('localVideo');
//       video.src = window.URL.createObjectURL(stream);
//       video.play();
//       peerConnection.addStream(stream);
//     },
//     function(error) {
//       console.log('Error adding stream to pc2: ' + error);
//     },
//   );
//   $('#getRemoteOffer').modal('show');
// });

// $('#offerSentBtn').click(function() {
//   $('#getRemoteAnswer').modal('show');
// });

// $('#offerRecdBtn').click(function() {
//   var offer = $('#remoteOffer').val();
//   var offerDesc = new RTCSessionDescription(JSON.parse(offer));
//   console.log('Received remote offer', offerDesc);
//   writeToChatLog('Received remote offer', 'text-success');
//   handleOfferFromPC1(offerDesc);
//   $('#showLocalAnswer').modal('show');
// });

// $('#answerSentBtn').click(function() {
//   $('#waitForConnection').modal('show');
// });

// $('#answerRecdBtn').click(function() {
//   var answer = $('#remoteAnswer').val();
//   var answerDesc = new RTCSessionDescription(JSON.parse(answer));
//   handleAnswerFromPC2(answerDesc);
//   $('#waitForConnection').modal('show');
// });

// function sendMessage() {
//   if ($('#messageTextBox').val()) {
//     var channel = new RTCMultiSession();
//     writeToChatLog($('#messageTextBox').val(), 'text-success');
//     channel.send({ message: $('#messageTextBox').val() });
//     $('#messageTextBox').val('');

//     // Scroll chat text area to the bottom on new input.
//     $('#chatlog').scrollTop($('#chatlog')[0].scrollHeight);
//   }

//   return false;
// }

export const createDataChannel = () => {
  return peerConnection.createDataChannel('test', {
    reliable: true,
  });
};

export const createOffer = () => {
  return new Promise((resolve, reject) => {
    peerConnection.createOffer().then((description) => {
      peerConnection.setLocalDescription(description);
      resolve(description);
    });
  });
};

peerConnection.onicecandidate = (e) => {
  if (e.candidate == null) {
    // $('#localOffer').html(JSON.stringify(peerConnection.localDescription));
  }
};

peerConnection.onconnection = () => {
  // console.log('Datachannel connected');
  // writeToChatLog('Datachannel connected', 'text-success');
  // $('#waitForConnection').modal('hide');
  // // If we didn't call remove() here, there would be a race on pc2:
  // //   - first onconnection() hides the dialog, then someone clicks
  // //     on answerSentBtn which shows it, and it stays shown forever.
  // $('#waitForConnection').remove();
  // $('#showLocalAnswer').modal('hide');
  // $('#messageTextBox').focus();
};

peerConnection.onsignalingstatechange = (state) => {
  console.info('signaling state change:', state);
};
peerConnection.oniceconnectionstatechange = (state) => {
  console.info('ice connection state change:', state);
};
peerConnection.onicegatheringstatechange = (state) => {
  console.info('ice gathering state change:', state);
};

export const completeOffer = (answer) => {
  peerConnection.setRemoteDescription(answer);
};

// function handleCandidateFromPC2(iceCandidate) {
//   peerConnection.addIceCandidate(iceCandidate);
// }

/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */
/* THIS IS BOB, THE ANSWERER/RECEIVER */

// peerConnection.ondatachannel = (e) => {
//   const datachannel = e.channel || e; // Chrome sends event, FF sends raw channel

//   datachannel.onopen = (e) => {
//     // $('#waitForConnection').modal('hide');
//     // $('#waitForConnection').remove();
//   };
//   datachannel.onmessage = (e) => {
//     // e.data
//   };
// };

export const answerOffer = (offer) => {
  return new Promise((resolve, reject) => {
    peerConnection.setRemoteDescription(offer);
    peerConnection.createAnswer().then((answer) => {
      peerConnection.setLocalDescription(answer);
      resolve(answer);
    });
  });
};

peerConnection.onicecandidate = (e) => {
  if (e.candidate == null) {
    // $('#localAnswer').html(JSON.stringify(peerConnection.localDescription));
  }
};

export default peerConnection;
