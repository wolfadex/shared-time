import React, { Component } from 'react';
import { render } from 'react-dom';
import Peer from 'peerjs';
import { createStore } from './timestore';
import { Provider, connect } from './timestore/components';

const rootEl = document.createElement('div');
document.body.appendChild(rootEl);

const p = new Peer({ key: 'lwjd5qra8257b9' });

const initialState = {
  text: [],
};
const store = createStore({
  reducer: (state = initialState, { type, ...payload }) => {
    switch (type) {
      case 'INSERT':
        return {
          ...state,
          text: [...state.text, payload.char],
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
  connection.on('data', (data) => {
    console.log('connection', data);
    // dispatch(data);
  });
});

const mapStateToProps = ({ text }) => ({
  text,
});

@connect(mapStateToProps)
class Child extends Component {
  state = {
    char: '',
    id: '',
  };

  render() {
    const { text = [], dispatch } = this.props;
    const { char, id } = this.state;

    return (
      <div>
        Text:
        <p>{text.join('')}</p>
        <input
          type="text"
          value={char}
          onChange={({ target: { value } }) => this.setState({ char: value })}
          maxLength="1"
        />
        <button
          type="button"
          disabled={char.length === 0}
          onClick={() => {
            dispatch({
              char,
              type: 'INSERT',
            });
          }}
        >
          Send
        </button>
        <input
          type="text"
          value={id}
          onChange={({ target: { value } }) => this.setState({ id: value })}
        />
        <button
          onClick={() => {
            const connection = p.connect(id);

            connection.on('open', () => {
              console.log('connection', connection);
              store.addPeer(connection.peer, connection);
            });
          }}
        >
          Join
        </button>
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
