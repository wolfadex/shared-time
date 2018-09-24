import React, { Component } from 'react';
import { render } from 'react-dom';
import Peer from 'peerjs';
import { createStore } from 'tahi';
import { Provider, connect } from './react-tahi';

const rootEl = document.createElement('div');
document.body.appendChild(rootEl);

const p = new Peer({ key: 'lwjd5qra8257b9' });

const initialState = {
  messages: [],
  users: {},
};
const store = createStore({
  reducer: (state = initialState, { type, ...payload }) => {
    switch (type) {
      case 'INSERT':
        return {
          ...state,
          messages: [
            ...state.messages,
            { text: payload.text, time: payload.time, id: payload.id },
          ],
        };
      default:
        return state;
    }
  },
});

p.on('open', (id) => {
  console.log('Peer ID:', id);
  store.setId(id);
});

p.on('connection', (connection) => {
  store.addPeer(connection.peer, connection);
  // connection.on('data', (data) => {
  //   console.log('connection', data);
  //   // dispatch(data);
  // });
});

const mapStateToProps = ({ messages }) => ({
  messages,
});

@connect(mapStateToProps)
class Child extends Component {
  state = {
    text: '',
    id: '',
  };

  render() {
    const { messages = [], dispatch, getId } = this.props;
    const { text, id } = this.state;

    return (
      <div
        style={{
          position: 'absolute',
          top: '0',
          bottom: '0',
          right: '0',
          left: '0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ul
          style={{
            flex: '1',
            overflow: 'auto',
          }}
        >
          {messages.map(({ text, time, id }) => {
            const date = new Date(time);
            return (
              <li key={`${id}-${time}`}>
                {date.toLocaleString()}: {text}
              </li>
            );
          })}
        </ul>
        <form
          style={{
            width: '100%',
            height: '3rem',
            margin: 'auto 0',
            display: 'flex',
          }}
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({
              text,
              time: Date.now(),
              id: peerId,
              type: 'INSERT',
            });
            this.setState({
              text: '',
            });
          }}
        >
          <input
            type="text"
            style={{
              flex: '1',
              fontSize: '1.2rem',
              paddingLeft: '1rem',
            }}
            placeholder="Message To Send"
            value={text}
            onChange={({ target: { value } }) => this.setState({ text: value })}
          />
          <button
            style={{
              width: '8rem',
            }}
            disabled={text.length === 0}
          >
            Send
          </button>
        </form>
        <form
          style={{
            width: '100%',
            height: '3rem',
            margin: 'auto 0',
            display: 'flex',
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const connection = p.connect(id);

            connection.on('open', () => {
              store.addPeer(connection.peer, connection);
              this.setState({
                id: '',
              });
            });
          }}
        >
          <label
            style={{
              alignItems: 'center',
              display: 'flex',
              fontSize: '1.2rem',
              justifyContent: 'center',
              width: '15rem',
            }}
          >
            <b style={{ marginRight: '0.5rem' }}>My Id:</b>
            {getId() || 'Loading...'}
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
          <button
            style={{
              width: '8rem',
            }}
            disabled={id.length === 0}
          >
            Join
          </button>
        </form>
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
