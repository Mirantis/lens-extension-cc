import { Component, Fragment } from 'react';
import propTypes from 'prop-types';

/**
 * Defines an error boundary component that renders the caught error to a
 *  `<div data-testid="{testId}">...</div>` and nothing else if an error is
 *  caught.
 *
 * If the error caught is an instance of `Error`, the `div` will contain
 *  two children:
 *  - <div data-testid={`${testId}-message`}>{error.message}</div>
 *  - <div data-testid={`${testId}-stack`}>{error.stack}</div>
 *
 * If the error caught is NOT an instance of `Error`, the `div` will contain
 *  one child: `<div data-testid={`${testId}-value`}>{error + ''}</div>`
 *  (the value thrown cast to a string).
 *
 * This should help test components in states that cause them to throw errors.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // {Error|*|undefined} The value thrown by the child component; undefined
      //  if none.
      error: undefined,
    };
  }

  /**
   * Called by React if a child component throws an error
   * @param {Error|*} error The value thrown.
   */
  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { testId } = this.props;
    const { error } = this.state;

    if (error !== undefined) {
      return (
        <div data-testid={testId}>
          {error instanceof Error && (
            <Fragment>
              <div data-testid={`${testId}-message`}>{error.message}</div>
              <div data-testid={`${testId}-stack`}>{error.stack}</div>
            </Fragment>
          )}
          {!(error instanceof Error) && (
            <div data-testid={`${testId}-value`}>{error + ''}</div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  /**
   * The value to set in the `data-testid` attribute of the `<div>` rendered
   *  if an error is caught.
   */
  testId: propTypes.string.isRequired,

  /**
   * Child component(s) to render if an error is not caught.
   */
  children: propTypes.oneOfType([
    propTypes.node,
    propTypes.arrayOf(propTypes.node),
  ]),
};

export { ErrorBoundary };
