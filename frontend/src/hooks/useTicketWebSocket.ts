import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message } from '../types';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected' | 'simulated';

export interface UseTicketWebSocketOptions {
  ticketId?: string;
  onNewMessage?: (message: Message) => void;
  onStatusChange?: (status: string) => void;
  onTypingChange?: (isTyping: boolean, sender: string) => void;
}

export function useTicketWebSocket({
  ticketId,
  onNewMessage,
  onStatusChange,
  onTypingChange,
}: UseTicketWebSocketOptions) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeTypist, setActiveTypist] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop simulation stream
  const cancelSimulation = useCallback(() => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setIsStreaming(false);
    setStreamingContent('');
    setActiveTypist(null);
  }, []);

  // Connect to backend WebSocket or fallback gracefully
  useEffect(() => {
    if (!ticketId) return;

    let isMounted = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/api/v1/ws/tickets/${ticketId}`;

    const connect = () => {
      if (!isMounted) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setConnectionStatus('connected');
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'message.new' && onNewMessage) {
              onNewMessage(data.payload);
            } else if (data.type === 'status.change' && onStatusChange) {
              onStatusChange(data.payload.status);
            } else if (data.type === 'typing') {
              setActiveTypist(data.payload.sender);
              if (onTypingChange) onTypingChange(true, data.payload.sender);
            } else if (data.type === 'stream_chunk') {
              setIsStreaming(true);
              setStreamingContent((prev) => prev + data.payload.token);
            } else if (data.type === 'stream_end') {
              setIsStreaming(false);
              setStreamingContent('');
            }
          } catch (err) {
            console.warn('WebSocket message parse error:', err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setConnectionStatus('reconnecting');
          // Retry after delay
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) connect();
          }, 5000);
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setConnectionStatus('disconnected');
          ws.close();
        };
      } catch (err) {
        if (isMounted) {
          setConnectionStatus('disconnected');
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      cancelSimulation();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [ticketId, onNewMessage, onStatusChange, onTypingChange, cancelSimulation]);

  // Interactive Live Stream Simulator for demonstrations & offline testing
  const simulateAIStream = useCallback((
    targetMessage?: string,
    onComplete?: (finalText: string) => void
  ) => {
    cancelSimulation();
    const fullText = targetMessage || 
      "Hello! I have reviewed your tracking history with carrier FedEx. Parcel #FX-88914 was scanned at the regional depot 2 hours ago. Delivery is scheduled for tomorrow by 4:00 PM. Would you like me to enable SMS delivery alerts?";
    
    const words = fullText.split(' ');
    let currentIdx = 0;
    setIsStreaming(true);
    setActiveTypist('AI Agent Core (Claude 3.7 / Gemini)');
    setStreamingContent('');

    streamIntervalRef.current = setInterval(() => {
      if (currentIdx < words.length) {
        const nextWord = words[currentIdx] + ' ';
        setStreamingContent((prev) => prev + nextWord);
        currentIdx++;
      } else {
        if (streamIntervalRef.current) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
        setIsStreaming(false);
        setActiveTypist(null);
        if (onComplete) {
          onComplete(fullText);
        }
      }
    }, 70);
  }, [cancelSimulation]);

  return {
    connectionStatus,
    isStreaming,
    streamingContent,
    activeTypist,
    simulateAIStream,
    cancelSimulation,
  };
}
