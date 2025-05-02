import { mount } from '@vue/test-utils';
import Terminal from '@/components/terminal/Terminal.vue';
import { Terminal as Xterm } from 'xterm';

// Mock xterm
jest.mock('xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => ({
    loadAddon: jest.fn(),
    open: jest.fn(),
    write: jest.fn(),
    dispose: jest.fn(),
  })),
}));

describe('Terminal.vue', () => {
  it('initializes xterm when mounted', () => {
    const wrapper = mount(Terminal, {
      props: {
        challengeId: 1,
      },
    });

    expect(Xterm).toHaveBeenCalled();
  });

  it('connects to WebSocket with correct URL', () => {
    const mockWebSocket = {
      onopen: null,
      onclose: null,
      onerror: null,
    };

    global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket);

    mount(Terminal, {
      props: {
        challengeId: 1,
      },
    });

    expect(global.WebSocket).toHaveBeenCalledWith(
      expect.stringContaining('/api/terminal/1')
    );
  });

  it('cleans up resources when unmounted', () => {
    const wrapper = mount(Terminal, {
      props: {
        challengeId: 1,
      },
    });

    wrapper.unmount();

    const terminal = (Xterm as jest.Mock).mock.results[0].value;
    expect(terminal.dispose).toHaveBeenCalled();
  });
});