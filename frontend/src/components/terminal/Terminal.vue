<template>
  <div
    ref="terminalContainer"
    class="w-full h-full bg-gray-900 rounded-lg overflow-hidden"
  >
    <!-- Terminal will be mounted here -->
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { AttachAddon } from 'xterm-addon-attach';
import 'xterm/css/xterm.css';

export default defineComponent({
  name: 'Terminal',

  props: {
    challengeId: {
      type: Number,
      required: true,
    },
  },

  setup(props) {
    const terminalContainer = ref<HTMLElement | null>(null);
    const terminal = ref<Xterm | null>(null);
    const websocket = ref<WebSocket | null>(null);

    const initializeTerminal = () => {
      if (!terminalContainer.value) return;

      terminal.value = new Xterm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1a1b26',
          foreground: '#c0caf5',
        },
      });

      const fitAddon = new FitAddon();
      terminal.value.loadAddon(fitAddon);
      terminal.value.loadAddon(new WebLinksAddon());

      terminal.value.open(terminalContainer.value);
      fitAddon.fit();

      // Handle window resize
      const handleResize = () => fitAddon.fit();
      window.addEventListener('resize', handleResize);

      // Connect WebSocket
      connectWebSocket();

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    const connectWebSocket = () => {
      if (!terminal.value) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(
        `${protocol}//${window.location.host}/api/terminal/${props.challengeId}`
      );

      websocket.value = ws;

      ws.onopen = () => {
        if (terminal.value) {
          terminal.value.write('\r\n🚀 Connected to challenge environment\r\n');
          
          // Attach WebSocket to terminal
          terminal.value.loadAddon(new AttachAddon(ws));
        }
      };

      ws.onclose = () => {
        if (terminal.value) {
          terminal.value.write('\r\n❌ Connection closed\r\n');
        }
      };

      ws.onerror = () => {
        if (terminal.value) {
          terminal.value.write('\r\n⚠️ Connection error\r\n');
        }
      };
    };

    onMounted(() => {
      initializeTerminal();
    });

    onUnmounted(() => {
      if (websocket.value) {
        websocket.value.close();
      }
      if (terminal.value) {
        terminal.value.dispose();
      }
    });

    return {
      terminalContainer,
    };
  },
});
</script>

<style>
.xterm {
  height: 100%;
}
</style>