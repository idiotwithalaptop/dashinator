import sinon from 'sinon';
import 'sinon-as-promised';
import _ from 'lodash';

import winstonStub from '../winstonStub';
import Monitor from '../../server/monitor';

jest.useFakeTimers();

describe('Monitor', () => {
  let runCheck;
  const broadcasterStub = {
    broadcast: sinon.stub(),
  };

  const actionType = 'updateSomething';
  let monitor;

  beforeEach(() => {
    runCheck = sinon.stub().resolves();
    Monitor.__Rewire__('winston', winstonStub);
    monitor = new Monitor(broadcasterStub, actionType, runCheck);
  });

  describe('monitor', () => {
    beforeEach(() => {
      monitor.updateState = sinon.stub();
    });

    context('runCheck succeeds', () => {
      const state = {
        results: [{ name: 'test', url: 'somewere', status: 'OK' }],
        description: 'sweet',
      };

      beforeEach(() => {
        runCheck.reset().resolves(state);
        return monitor.monitor();
      });

      it('calls runCheck', () => {
        expect(runCheck.callCount).toEqual(1);
      });

      it('updates the state the new state', () => {
        const actual = _.omit(monitor.updateState.firstCall.args[0], ['elapsed']);
        expect(actual).toEqual(_.omit(state, ['elapsed']));
      });

      it('calculates the elapsed time', () => {
        expect(monitor.updateState.firstCall.args[0].elapsed).toBeGreaterThanOrEqual(0);
      });

      it('schedules to call itself', () => {
        jest.runOnlyPendingTimers();
        expect(runCheck.callCount).toEqual(2);
      });
    });

    context('runCheck fails', () => {
      beforeEach(() => {
        runCheck.reset().rejects(new Error('badness'));
        return monitor.monitor();
      });

      it('updates the state with an error', () => {
        expect(monitor.updateState.firstCall.args[0]).toEqual({
          results: [{ name: 'badness', status: 'Exception', url: '#' }],
        });
      });

      it('schedules to call itself', () => {
        jest.runOnlyPendingTimers();
        expect(runCheck.callCount).toEqual(2);
      });
    });
  });

  describe('updateState', () => {
    const serverResults1 = {
      name: 'serverResults1',
      status: 'OK',
    };
    const serverResults2 = {
      name: 'serverResults2',
      status: 'Failure',
    };

    const state = {
      results: [serverResults1, serverResults2],
      description: 'checking things!',
    };

    beforeEach(() => {
      monitor.broadcast = sinon.stub();
      monitor.updateState(state);
    });

    it('sets the failures property to the failed health checks', () => {
      expect(monitor.failures).toEqual([serverResults2]);
    });

    it('sets the description', () => {
      expect(monitor.description).toEqual(state.description);
    });

    it('calls broadcast to broadcast the results', () => {
      expect(monitor.broadcast.called).toEqual(true);
    });
  });

  describe('broadcast', () => {
    const failures = ['badness'];

    beforeEach(() => {
      monitor.failures = failures;
      monitor.broadcast();
    });

    it('broadcasts the update action', () => {
      expect(broadcasterStub.broadcast.firstCall.args).toEqual([{
        type: actionType,
        failures,
      }]);
    });
  });
});
