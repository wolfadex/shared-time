export const createStore = ({ reducer, preloadedState }) => {
  let initialState = preloadedState || reducer(undefined, { type: '@@INIT' });
  let currentState = initialState;
  let currentListeners = [];
  let nextListeners = currentListeners;
  let isDispatching = false;
  let messages = [];
  let currentMessageIndex = -1;
  let peers = {};
  let peerId;

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
        currentState = reducer({ ...currentState }, action);
      } else {
        const insertIndex = messages.findIndex(({ timestamp: t, id: i }) => {
          return timestamp > t || (timestamp === t && id < i);
        });

        messages.splice(insertIndex + 1, 0, message);
        currentState = messages.reduce(
          (nextState, { action }) => reducer(nextState, action),
          initialState,
        );
      }
    } finally {
      isDispatching = false;
      currentMessageIndex++;
    }

    const listeners = (currentListeners = nextListeners);
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener();
    }
  }

  return {
    getState: () => ({ ...currentState }),
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

      Object.values(peers).forEach((peer) => {
        peer.send(message);
      });

      return action;
    },
    // onMessage: (message) => {
    //   asyncDispatch(message);
    // },
    addPeer: (id, peer) => {
      peers[id] = peer;
      peer.on('data', (message) => {
        asyncDispatch(message);
      });
    },
    removePeer: (id) => {
      delete peers[id];
    },
    setId: (id) => {
      peerId = id;
    },
    // onOpen: () => void;
    // onClose: () => void;
  };
};
