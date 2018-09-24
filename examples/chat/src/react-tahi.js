import React, { Component, createElement, createContext } from 'react';

const { Provider: P, Consumer } = createContext({});

const defaultMapStateToProps = (state) => ({});

export const Provider = P;
export const connect = (
  mapStateToProps = defaultMapStateToProps,
  mapDispatchToProps,
) => (WrappedComponent) =>
  class extends Component {
    unsubscribe = null;

    componentWillUnmount() {
      if (unsubscribe != null) {
        unsubscribe();
      }
    }

    render() {
      return (
        <Consumer>
          {({ getState, dispatch, subscribe, getId }) => {
            const additionalProps = mapStateToProps(getState());
            if (this.unsubscribe == null) {
              this.unsubscribe = subscribe(() => {
                this.forceUpdate();
              });
            }
            return createElement(WrappedComponent, {
              ...additionalProps,
              dispatch,
              getId,
            });
          }}
        </Consumer>
      );
    }
  };
