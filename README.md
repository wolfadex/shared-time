# tahi

A shared peer-to-peer state for multiple users connected by WebRTC.

## demo

[Basic Chat](http://tahi-chat.surge.sh/)

## use

- Install `yarn add tahi` or `npm install --save tahi`

```js
// Using PeerJS
import { createStore } from 'tahi';
import Peer from 'peerjs';

const store = createStore({
  reducer: (state, action) => {
    // Return next state
  },
  preloadedState: {}, // Optional: The initial state of your store
});

const peer = new Peer();

peer.on('open', (id) => {
  store.setId(id); // A unique ID for each connected user
});

peer.on('connection', (connection) => {
  store.addPeer(connection.peer, connection);
});

const connection = peer.connect('<other_users_peerjs_id>');

connection.on('open', () => {
  store.addPeer(connection.peer, connection);
});

const unsubscribe = store.subscribe(() => {
  // Occurs for all connected users when 'SOME_ACTION_TYPE' is dispatched
  const nextState = store.getState(); // The new state
});

store.dispatch({
  payload: 'some data of whatever kind',
  type: 'SOME_ACTION_TYPE',
});
```

## todo

- [x] Make this list
- [x] Make example with PeerJS
- [ ] Make example with Vanilla WebRTC
- [ ] Make documentation
- [ ] Make compatible with redux middleware
- [ ] Support Edge, when it implements the data channel for WebRTC. To help push Edge [please vote](https://wpdev.uservoice.com/forums/257854-microsoft-edge-developer/suggestions/8118837-support-webrtc-datachannels-in-workers).
