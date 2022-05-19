import * as eventBus from '../eventBus';

describe('/common/eventBus', () => {
  const type = 'my-type';
  const state = 'my-state';

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('addExtEventHandler()', () => {
    it('accepts a type without a state', () => {
      const handler = jest.fn();
      eventBus.addExtEventHandler(type, handler);

      eventBus.dispatchExtEvent({ type });
      jest.advanceTimersToNextTimer();

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type }));
    });

    it('accepts a type with a state', () => {
      const handler = jest.fn();
      eventBus.addExtEventHandler(type, handler, state);

      eventBus.dispatchExtEvent({ type, state });
      jest.advanceTimersToNextTimer();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type, state })
      );
    });

    it('does not result in handler being called for type+state if event only has type', () => {
      const handler = jest.fn();
      eventBus.addExtEventHandler(type, handler, state);

      eventBus.dispatchExtEvent({ type });
      jest.advanceTimersToNextTimer();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('removeExtEventHandler()', () => {
    it('does not remove type+state handler if only type given', () => {
      const handlerTypeOnly = jest.fn();
      const handlerTypeAndState = jest.fn();
      eventBus.addExtEventHandler(type, handlerTypeOnly);
      eventBus.addExtEventHandler(type, handlerTypeAndState, state);

      eventBus.removeExtEventHandler(type, handlerTypeOnly);

      eventBus.dispatchExtEvent({ type, state });
      jest.advanceTimersToNextTimer();

      expect(handlerTypeAndState).toHaveBeenCalledWith(
        expect.objectContaining({ type, state })
      );
      expect(handlerTypeOnly).not.toHaveBeenCalledWith();
    });

    it('does nothing if no match for existing handler', () => {
      const handler = jest.fn();
      eventBus.addExtEventHandler(type, handler);

      eventBus.removeExtEventHandler(type, handler, state);

      eventBus.dispatchExtEvent({ type });
      jest.advanceTimersToNextTimer();

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type }));
    });

    it('does nothing if handler not found', () => {
      const handler = jest.fn();
      eventBus.addExtEventHandler(type, handler);

      eventBus.removeExtEventHandler(type, () => {});

      eventBus.dispatchExtEvent({ type });
      jest.advanceTimersToNextTimer();

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type }));
    });

    it('removes the last handler', () => {
      const handler = jest.fn();
      eventBus.addExtEventHandler(type, handler);

      eventBus.removeExtEventHandler(type, handler);

      eventBus.dispatchExtEvent({ type });
      jest.advanceTimersToNextTimer();

      expect(handler).not.toHaveBeenCalledWith();
    });
  });

  describe('scheduleDispatch()', () => {
    it('calls only handlers for specific event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      eventBus.addExtEventHandler(type, handler1);
      eventBus.addExtEventHandler(type, handler2);
      eventBus.addExtEventHandler(type, handler3, state);

      eventBus.dispatchExtEvent({ type });
      jest.advanceTimersToNextTimer();

      expect(handler1).toHaveBeenCalledWith(expect.objectContaining({ type }));
      expect(handler2).toHaveBeenCalledWith(expect.objectContaining({ type }));
      expect(handler3).not.toHaveBeenCalled();
    });
  });
});
