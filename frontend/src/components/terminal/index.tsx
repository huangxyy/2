import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import './Terminal.css';

interface Props {
  sessionId: string;
}

export const Terminal: React.FC<Props> = ({ sessionId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dispatch = useDispatch();
  const session = useSelector((state: RootState) => 
    state.terminal.sessions[sessionId]
  );

  useEffect(() => {
    if (!terminalRef.current) return;

    // 初始化xterm
    const xterm = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());

    xterm.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = xterm;

    // 连接WebSocket
    const ws = new WebSocket(
      `${process.env.VITE_WS_URL}/terminal/${sessionId}`
    );

    ws.onopen = () => {
      xterm.write('\r\n🚀 Connected to terminal.\r\n');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'output':
          xterm.write(data.data);
          break;
        case 'error':
          xterm.write(`\r\n❌ Error: ${data.message}\r\n`);
          break;
      }
    };

    ws.onclose = () => {
      xterm.write('\r\n🔌 Connection closed.\r\n');
    };

    // 处理终端输入
    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // 处理窗口大小变化
    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows,
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    wsRef.current = ws;

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      xterm.dispose();
    };
  }, [sessionId]);

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <span>Terminal Session: {sessionId}</span>
        <span className="terminal-status">
          Status: {session?.status || 'connecting...'}
        </span>
      </div>
      <div className="terminal-wrapper" ref={terminalRef} />
      <div className="terminal-footer">
        <span>Commands: {session?.metadata.commandCount || 0}</span>
        <span>Last activity: {
          session?.metadata.lastActivity 
            ? new Date(session.metadata.lastActivity).toLocaleString()
            : 'N/A'
        }</span>
      </div>
    </div>
  );
};