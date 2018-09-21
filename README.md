# shared-time

A shared redux-like state for multiple users connected by WebRTC. Currently uses [PeerJS](https://peerjs.com/) but any type of WebRTC data connection should work.

# dev

- Install [yarn](https://yarnpkg.com/)
- Run `yarn`
- Run `yarn dev`
- Open 2 browser windows
- Open the dev tools for both windows
- Paste the Peer ID from 1 window into the 2nd text field of the other window and click join
- Type single characters into the first text field of either window and click `Send`
- There's currently a simulated 5 second delay to demonstrate that the states are equal on both sides when near simultaneous or simultaneous actions occur.

# todo

- [ ] Make this list
