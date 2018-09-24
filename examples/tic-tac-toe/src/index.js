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

const isWinner = (board) => {
  const line1 =
    board[0] != null && board[0] === board[1] && board[0] === board[2];
  const line2 =
    board[3] != null && board[3] === board[4] && board[3] === board[5];
  const line3 =
    board[6] != null && board[6] === board[7] && board[6] === board[8];
  const line4 =
    board[0] != null && board[0] === board[3] && board[0] === board[6];
  const line5 =
    board[1] != null && board[1] === board[4] && board[1] === board[7];
  const line6 =
    board[2] != null && board[2] === board[5] && board[2] === board[8];
  const diagonal1 =
    board[0] != null && board[0] === board[4] && board[0] === board[8];
  const diagonal2 =
    board[2] != null && board[2] === board[4] && board[2] === board[6];

  return (
    line1 || line2 || line3 || line4 || line5 || line6 || diagonal1 || diagonal2
  );
};

const initialState = {
  board: [null, null, null, null, null, null, null, null, null],
  turn: 'X',
  host: null,
  guest: null,
  winner: null,
};
const store = createStore({
  reducer: (state = initialState, { type, ...payload }) => {
    switch (type) {
      case 'RESET_BOARD':
        return {
          ...state,
          board: initialState.board,
          winner: null,
          turn: 'X',
        };
      case 'SET_SQUARE': {
        const nextBoard = [...state.board];

        nextBoard[payload.index] = payload.symbol;

        return {
          ...state,
          board: nextBoard,
          turn: state.turn === 'X' ? 'O' : 'X',
          winner: nextBoard.includes(null)
            ? isWinner(nextBoard)
              ? state.turn
              : null
            : 'none',
        };
      }
      case 'ADD_HOST':
        return {
          ...state,
          host: payload.id,
        };
      case 'ADD_GUEST':
        return {
          ...state,
          guest: payload.id,
        };
      default:
        return state;
    }
  },
});

peerConnection.oniceconnectionstatechange = () => {
  console.log('ice state change', peerConnection.iceConnectionState);
};

peerConnection.onicecandidate = (e) => {
  if (!e.candidate) {
    console.log('steve no candidate', e);
    return;
  } else {
    console.log('steve candidate', peerConnection.localDescription);
    const id = btoa(JSON.stringify(peerConnection.localDescription));

    store.setId(id);
    store.dispatch({
      id,
      type:
        peerConnection.localDescription.type === 'offer'
          ? 'ADD_HOST'
          : 'ADD_GUEST',
    });
  }
};

let dataChannel;

function hostGame() {
  dataChannel = createDataChannel();

  dataChannel.onopen = () => {
    console.log('Host ready');
    store.forwardMessages((message) => {
      dataChannel.send(JSON.stringify(message));
    });
  };
  dataChannel.onclose = () => {
    console.log('Host closed');
  };
  dataChannel.onmessage = ({ data }) => {
    store.dispatch(data);
  };

  createOffer();
}

function join(offer) {
  const parsedOffer = new RTCSessionDescription(JSON.parse(atob(offer)));

  peerConnection.ondatachannel = (e) => {
    dataChannel = e.channel || e; // Chrome sends event, FF sends raw channel

    const onMessage = store.addPeer(offer, (message) => {
      dataChannel.send(JSON.stringify(message));
    });

    dataChannel.onopen = () => {
      console.log('Guest ready');
      store.forwardMessages((message) => {
        dataChannel.send(JSON.stringify(message));
      });
    };
    dataChannel.onclose = () => {
      console.log('Guest closed');
    };
    dataChannel.onmessage = ({ data }) => {
      onMessage(JSON.parse(data));
    };
  };

  answerOffer(parsedOffer);
}

function confirmHost(answer) {
  const parsedAnswer = new RTCSessionDescription(JSON.parse(atob(answer)));
  completeOffer(parsedAnswer);

  const onMessage = store.addPeer(answer, (message) => {
    dataChannel.send(JSON.stringify(message));
  });

  dataChannel.onmessage = ({ data }) => {
    onMessage(JSON.parse(data));
  };
}

const mapStateToProps = ({ board, turn, host, guest, winner }) => ({
  board,
  turn,
  host,
  guest,
  winner,
});

@connect(mapStateToProps)
class Child extends Component {
  state = {
    id: '',
  };

  render() {
    const {
      board = [],
      turn,
      dispatch,
      getId,
      host,
      guest,
      winner,
    } = this.props;
    const { id } = this.state;
    const userSymbol = getId() === host ? 'X' : 'O';
    const yourTurn = userSymbol === turn;
    console.log('carl', host, guest);
    return (
      <div
        style={{
          alignItems: 'center',
          bottom: '0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          left: '0',
          position: 'absolute',
          right: '0',
          top: '0',
        }}
      >
        {host &&
          guest && (
            <div
              style={{
                fontSize: '4rem',
              }}
            >
              {(() => {
                if (userSymbol === winner) {
                  return 'You Win!';
                } else if (winner === 'none') {
                  return `It's a Draw!`;
                } else if (winner == null) {
                  return yourTurn ? 'Your Turn' : 'Their Turn';
                } else {
                  return 'You Lose';
                }
              })()}
            </div>
          )}
        {host &&
          guest && (
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
                    cursor: yourTurn ? 'pointer' : 'inherit',
                    display: 'flex',
                    fontSize: '4rem',
                    gridColumn: `${(i % 3) + 1}`,
                    gridRow: `${Math.floor(i / 3) + 1}`,
                    height: '6rem',
                    justifyContent: 'center',
                    width: '6rem',
                  }}
                  onClick={() => {
                    if (yourTurn && !tile) {
                      dispatch({
                        symbol: userSymbol,
                        index: i,
                        type: 'SET_SQUARE',
                      });
                    }
                  }}
                >
                  {tile}
                </button>
              ))}
            </div>
          )}
        {winner && (
          <button
            style={{
              cursor: 'pointer',
              fontSize: '2rem',
              marginTop: '1rem',
            }}
            onClick={() => {
              dispatch({
                type: 'RESET_BOARD',
              });
            }}
          >
            New Game
          </button>
        )}
        {!(host && guest) && (
          <form
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
            onSubmit={(e) => {
              e.preventDefault();
              join(id);
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
                disabled={host || guest}
                onClick={() => {
                  hostGame();
                }}
              >
                Host
              </button>
              <button
                type="button"
                style={{
                  width: '8rem',
                }}
                disabled={guest || !host || id.length === 0}
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
                disabled={host || id.length === 0 || getId()}
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
