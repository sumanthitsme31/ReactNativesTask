import { useCallback, useEffect, useRef } from 'react';
import { getReconnectDelay } from '../utils/transit';

export function useTransitWebSocket(url, onVehiclesUpdate) {
  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState < WebSocket.CLOSING) {
      socketRef.current.close();
    }

    socketRef.current = new WebSocket(url);

    socketRef.current.onopen = () => {
      reconnectAttemptsRef.current = 0;
    };

    socketRef.current.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (Array.isArray(parsed)) {
          onVehiclesUpdate(parsed);
        }
      } catch (error) {
        console.warn('Invalid websocket message', error);
      }
    };

    socketRef.current.onerror = () => {
      socketRef.current?.close();
    };

    socketRef.current.onclose = () => {
      const attempt = reconnectAttemptsRef.current;
      const delay = getReconnectDelay(attempt);
      reconnectAttemptsRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [onVehiclesUpdate, url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, [connect]);
}
