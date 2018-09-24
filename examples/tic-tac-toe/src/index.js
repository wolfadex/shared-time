import React, { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'tahi';
import { Provider, connect } from './react-tahi';
import peerConnection, {
  createDataChannel,
  createOffer,
  completeOffer,
  answerOffer,
} from './webrtc-wrapper';

const rootEl = document.createElement('div');
document.body.appendChild(rootEl);

// const p = new Peer({ key: 'lwjd5qra8257b9' });

const initialState = {
  board: [null, null, null, null, null, null, null, null, null],
  turn: 'X',
  users: {},
};
const store = createStore({
  reducer: (state = initialState, { type, ...payload }) => {
    switch (type) {
      case 'RESET_BOARD':
        return {
          ...state,
          board: initialState.board,
        };
      case 'SET_SQUARE': {
        const nextBoard = [...state.board];

        nextBoard[payload.index] = payload.piece;

        return {
          ...state,
          board: nextBoard,
          turn: state.turn === 'X' ? 'O' : 'X',
        };
      }
      case 'ADD_USER':
        return {
          ...state,
          users: { ...state.users, [payload.id]: payload.turn },
        };
      default:
        return state;
    }
  },
});

// peerConnection.onicecandidate = (e) => {
//   if (e.candidate) {
//     console.log('carl', e);
//   } else {
//     console.log('steve', e);
//   }
// };

// !e.candidate ||
// remoteConnection.addIceCandidate(e.candidate).catch(handleAddCandidateError);

// peerConnection.ondatachannel = (e) => {
//   console.log('carl', e.channel);
// };

let dataChannel;

function host() {
  dataChannel = createDataChannel();

  dataChannel.onopen = () => {
    console.log('Host ready');
  };
  dataChannel.onmessage = ({ data }) => {
    store.dispatch(data);
  };

  createOffer().then((offer) => {
    const id = btoa(JSON.stringify(offer));

    store.setId(id);
    store.dispatch({
      id,
      turn: 'X',
      type: 'ADD_USER',
    });
  });
}

function join(offer) {
  const parsedOffer = new RTCSessionDescription(JSON.parse(atob(offer)));

  peerConnection.ondatachannel = () => {
    dataChannel = e.channel || e; // Chrome sends event, FF sends raw channel

    // dataChannel.onopen = (e) => {
    //   // $('#waitForConnection').modal('hide');
    //   // $('#waitForConnection').remove();
    // };
    // dataChannel.onmessage = ({ data }) => {
    //   store.dispatch(data);
    // };
  };

  const onMessage = store.addPeer(offer, dataChannel.send);

  dataChannel.onmessage = ({ data }) => {
    onMessage(data);
  };

  answerOffer(parsedOffer).then((answer) => {
    const id = btoa(JSON.stringify(answer));

    store.setId(id);
    store.dispatch({
      id,
      turn: 'O',
      type: 'ADD_USER',
    });
  });
}

function confirmHost(answer) {
  const parsedAnswer = new RTCSessionDescription(JSON.parse(atob(answer)));
  completeOffer(parsedAnswer);

  const onMessage = store.addPeer(answer, dataChannel.send);

  dataChannel.onmessage = ({ data }) => {
    onMessage(data);
  };
}

// p.on('open', (id) => {
//   console.log('Peer ID:', id);
//   store.setId(id);
// });

// p.on('connection', (connection) => {
//   store.addPeer(connection.peer, connection);
//   // connection.on('data', (data) => {
//   //   console.log('connection', data);
//   //   // dispatch(data);
//   // });
// });

const mapStateToProps = ({ board, turn, users }) => ({
  board,
  turn,
  users,
});

@connect(mapStateToProps)
class Child extends Component {
  state = {
    id: '',
  };

  render() {
    const { board = [], turn, dispatch, getId, users } = this.props;
    const { id } = this.state;

    return (
      <div
        style={{
          alignItems: 'center',
          bottom: '0',
          display: 'flex',
          justifyContent: 'center',
          left: '0',
          position: 'absolute',
          right: '0',
          top: '0',
        }}
      >
        {Object.keys(users).length === 2 && (
          <div
            style={{
              display: 'grid',
            }}
          >
            {board.map((tile, i) => (
              <button
                key={i}
                style={{
                  alignItems: 'center',
                  border: '1px solid black',
                  cursor: 'pointer',
                  display: 'flex',
                  gridColumn: `${(i % 3) + 1}`,
                  gridRow: `${Math.floor(i / 3) + 1}`,
                  height: '6rem',
                  justifyContent: 'center',
                  width: '6rem',
                }}
                onClick={() => {
                  dispatch({});
                }}
              >
                {tile}
              </button>
            ))}
          </div>
        )}
        {Object.keys(users).length < 2 && (
          <form
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
            onSubmit={(e) => {
              e.preventDefault();
              join(id);
              // const connection = p.connect(id);

              // connection.on('open', () => {
              //   store.addPeer(connection.peer, connection);
              //   this.setState({
              //     id: '',
              //   });
              // });
            }}
          >
            <label
              style={{
                alignItems: 'center',
                display: 'flex',
                fontSize: '1.2rem',
                justifyContent: 'center',
                width: '24rem',
              }}
            >
              <b style={{ marginRight: '0.5rem' }}>My Id:</b>
              <input
                type="text"
                value={getId() || 'Click Host or Join'}
                style={{
                  width: '19rem',
                  fontSize: '1.2rem',
                }}
                readOnly
              />
            </label>
            <input
              type="text"
              style={{
                flex: '1',
                fontSize: '1.2rem',
                paddingLeft: '1rem',
              }}
              placeholder="Other User's ID"
              value={id}
              onChange={({ target: { value } }) => this.setState({ id: value })}
            />
            <div
              style={{
                display: 'flex',
              }}
            >
              <button
                type="button"
                style={{
                  width: '8rem',
                }}
                disabled={Object.keys(users).length !== 0}
                onClick={() => {
                  host();
                }}
              >
                Host
              </button>
              <button
                type="button"
                style={{
                  width: '8rem',
                }}
                disabled={Object.keys(users).length !== 1 && id.length === 0}
                onClick={() => {
                  confirmHost(id);
                }}
              >
                Finish
              </button>
              <button
                style={{
                  width: '8rem',
                }}
                disabled={id.length === 0 || getId()}
              >
                Join
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }
}

render(
  <Provider value={store}>
    <Child />
  </Provider>,
  rootEl,
);
