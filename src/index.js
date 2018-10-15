const Peer = require('simple-peer');
const cuid = require('cuid');

const log = (...messages) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('tahi:', ...messages);
  }
};

const autoMesh = {
  invitesRequested: new Set(),
  invitesAwaitingAnswer: {},
  answersRequested: new Set(),
};

export function createStore(reducer, preloadedState, enhancer) {
  if (
    (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof arguments[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several store enhancers to ' +
        'createStore(). This is not supported. Instead, compose them ' +
        'together to a single function',
    );
  }

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.');
    }

    return enhancer(createStore)(reducer, preloadedState);
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.');
  }

  const peerId = cuid();
  let initialState = reducer(preloadedState, { type: '@@INIT' });
  let currentState = initialState;
  let currentListeners = [];
  let nextListeners = currentListeners;
  let isDispatching = false;
  let messages = [];
  let currentMessageIndex = -1;
  let peers = {};

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  function asyncDispatch(message) {
    const { timestamp, id, action } = message;

    try {
      isDispatching = true;

      const { timestamp: mostRecent = 0 } = messages[currentMessageIndex] || {};

      if (timestamp > mostRecent) {
        messages.push(message);
        currentState = reducer(Object.assign({}, currentState), action);
      } else {
        let isDuplicate = false;
        const insertIndex = messages.findIndex(({ timestamp: t, id: i }) => {
          if (timestamp < t) {
            return true;
          } else if (timestamp === t) {
            if (id === i) {
              // This is a duplicate action, ignore it
              isDuplicate = true;
              return true;
            } else if (id < i) {
              return true;
            }
          }

          return false;
        });

        if (!isDuplicate) {
          messages.splice(insertIndex, 0, message);
          currentState = messages.reduce(
            (nextState, { action }) => reducer(nextState, action),
            initialState,
          );
        }
      }
    } finally {
      isDispatching = false;
      currentMessageIndex++;
    }

    const listeners = (currentListeners = nextListeners);
    listeners.forEach((listener) => {
      listener();
    });
  }

  function handlePeerConnect(
    peer,
    localPeerId,
    handlePeerRemoved,
    peerConnected,
  ) {
    log('Awaiting peer connect...');
    peer.on('connect', () => {
      peerConnected();
      log('Peer connected');
      const send = (message) => {
        log('Sending message to peer:', message);
        peer.send(JSON.stringify(message));
      };

      peer.on('data', (encodedMessage) => {
        const message = new TextDecoder('utf-8').decode(encodedMessage);
        const parsedMessage = JSON.parse(message);
        log('Peer message:', parsedMessage);

        switch (parsedMessage.type) {
          // Invite to auto-connect new peer
          case 'AUTO_MESH_REQUEST_INVITE': {
            // If "new" peer is already a peer or still waiting for a response, ignore this request
            if (
              peers[parsedMessage.peerInviting] == null &&
              autoMesh.invitesAwaitingAnswer[parsedMessage.peerInviting] == null
            ) {
              invitePeer()
                .then(({ inviteCode, completeInvitation }) => {
                  autoMesh.invitesAwaitingAnswer[
                    parsedMessage.peerInviting
                  ] = completeInvitation;
                  // Reply back with the invite code
                  peers[parsedMessage.bridgePeer].send({
                    type: 'AUTO_MESH_RESPOND_INVITE',
                    inviteCode,
                    respondPeer: peerId,
                    peerInviting: parsedMessage.peerInviting,
                  });
                })
                .catch((err) => {
                  // TODO
                  console.log('tahi:', 'Auto-mesh invite error:', err);
                });
            }
            break;
          }
          case 'AUTO_MESH_RESPOND_INVITE': {
            // Only continue if we requested this invite
            if (
              autoMesh.invitesRequested.has(
                `${parsedMessage.respondPeer}-${parsedMessage.peerInviting}`,
              )
            ) {
              autoMesh.invitesRequested.delete(
                `${parsedMessage.respondPeer}-${parsedMessage.peerInviting}`,
              );
              autoMesh.answersRequested.add(parsedMessage.peerInviting);
              peers[parsedMessage.peerInviting].send({
                type: 'AUTO_MESH_REQUEST_ANSWER',
                invitingPeer: parsedMessage.respondPeer,
                inviteCode: parsedMessage.inviteCode,
                bridgePeer: peerId,
              });
            }
            break;
          }
          case 'AUTO_MESH_REQUEST_ANSWER': {
            // Only continue if not already a peer
            if (peers[parsedMessage.invitingPeer] == null) {
              autoMesh.answersRequested.add(parsedMessage.peerInviting);
              joinPeer(parsedMessage.inviteCode)
                .then((answer) => {
                  peers[parsedMessage.bridgePeer].send({
                    type: 'AUTO_MESH_RESPOND_ANSWER',
                    answer,
                    invitingPeer: parsedMessage.invitingPeer,
                    answeringPeer: peerId,
                  });
                })
                .catch((err) => {
                  // TODO
                  console.log('tahi:', 'Auto-mesh join error:', err);
                });
            }
            break;
          }
          case 'AUTO_MESH_RESPOND_ANSWER': {
            // Only continue if expecting an answer
            if (autoMesh.answersRequested.has(parsedMessage.answeringPeer)) {
              autoMesh.answersRequested.delete(parsedMessage.answeringPeer);
              peers[parsedMessage.invitingPeer].send({
                type: 'AUTO_MESH_COMPLETE_INVITE',
                answeringPeer: parsedMessage.answeringPeer,
                answer: parsedMessage.answer,
              });
            }
            break;
          }
          case 'AUTO_MESH_COMPLETE_INVITE': {
            // Only continue if expecting an answer
            if (autoMesh.invitesAwaitingAnswer[parsedMessage.answeringPeer]) {
              autoMesh.invitesAwaitingAnswer[parsedMessage.answeringPeer](
                parsedMessage.answer,
                () => {
                  // TODO: handle peer remove
                },
              );

              delete autoMesh.invitesAwaitingAnswer[
                parsedMessage.answeringPeer
              ];
            }
            break;
          }
          default:
            asyncDispatch(parsedMessage);
        }
      });

      peer.on('close', () => {
        log('Peer connection closed. PeerId:', localPeerId);
        delete peers[localPeerId];
        handlePeerRemoved(localPeerId);
        peer.destroy();
      });

      peer.on('error', (err) => {
        // TODO
        log('TODO: handle error', err);

        if (/Ice connection failed/.test(err)) {
          delete peers[localPeerId];
          handlePeerRemoved(localPeerId, err);
        }
      });

      // Message all already connected peers asking for invite to connect new peer
      Object.entries(peers).forEach(([id, { send }]) => {
        autoMesh.invitesRequested.add(`${id}-${localPeerId}`);
        send({
          type: 'AUTO_MESH_REQUEST_INVITE',
          bridgePeer: peerId,
          peerInviting: localPeerId,
        });
      });

      peers[localPeerId] = {
        send,
      };

      log('Update new peer with my state');
      messages.forEach(send);
    });
  }

  function invitePeer(callback) {
    log('Inviting...');
    const peer = new Peer({ initiator: true });
    log('Invite peer');
    peer.on('signal', (data) => {
      log('Host peer signal:', data);
      log(
        'Resolving, invite code:',
        btoa(
          JSON.stringify({
            ...data,
            peerId,
          }),
        ),
      );
      callback(null, {
        inviteCode: btoa(
          JSON.stringify({
            ...data,
            peerId,
          }),
        ),
        completeInvitation: (response, handlePeerRemoved, callback) => {
          try {
            const { peerId: localPeerId, ...answer } = JSON.parse(
              atob(response),
            );

            handlePeerConnect(peer, localPeerId, handlePeerRemoved, () => {
              callback(null);
            });
            peer.signal(answer);
          } catch (e) {
            callback(e);
          }
        },
      });
    });
  }

  function joinPeer(response, handlePeerRemoved, callback) {
    const peer = new Peer();

    peer.on('signal', (data) => {
      log('Guest peer signal:', data);
      callback(
        null,
        btoa(
          JSON.stringify({
            ...data,
            peerId,
          }),
        ),
      );
    });

    try {
      const { peerId: localPeerId, ...offer } = JSON.parse(atob(response));

      handlePeerConnect(peer, localPeerId, handlePeerRemoved, () => {
        callback(null, null, true);
      });
      peer.signal(offer);
    } catch (e) {
      callback(e);
    }
  }

  return {
    getState: () => Object.assign({}, currentState),
    subscribe: (listener) => {
      if (typeof listener !== 'function') {
        throw new Error('Expected the listener to be a function.');
      }

      if (isDispatching) {
        throw new Error(
          'You may not call store.subscribe() while the reducer is executing.',
        );
      }

      let isSubscribed = true;

      ensureCanMutateNextListeners();
      nextListeners.push(listener);

      return () => {
        if (!isSubscribed) {
          return;
        }

        if (isDispatching) {
          throw new Error(
            'You may not unsubscribe while the reducer is executing.',
          );
        }

        isSubscribed = false;

        ensureCanMutateNextListeners();
        const index = nextListeners.indexOf(listener);
        nextListeners.splice(index, 1);
      };
    },
    dispatch: (action) => {
      const message = {
        timestamp: Date.now(),
        id: peerId,
        action,
      };
      asyncDispatch(message);

      Object.values(peers).forEach(({ send }) => {
        send(message);
      });

      return action;
    },
    removePeer: (id) => {
      delete peers[id];
    },
    getId: () => peerId,
    invitePeer,
    joinPeer,
  };
}
