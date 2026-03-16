/**
 * Shared API functions for LLM Search / Copilot features.
 */

import type {
  ChatResponse,
  LLMSearchStatus,
  SessionSummary,
} from '@/types/llm-search';

export async function fetchLLMStatus(): Promise<LLMSearchStatus> {
  const response = await fetch('/api/llm-search/status');
  if (!response.ok) throw new Error('Failed to fetch LLM status');
  return response.json();
}

export async function fetchSessions(): Promise<SessionSummary[]> {
  const response = await fetch('/api/llm-search/sessions');
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json();
}

export async function sendMessage(content: string, sessionId?: string, debug?: boolean): Promise<ChatResponse> {
  const response = await fetch('/api/llm-search/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, session_id: sessionId, debug: debug || false }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Chat request failed' }));
    throw new Error(error.detail || 'Chat request failed');
  }
  return response.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`/api/llm-search/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    throw new Error('Failed to delete session');
  }
}
