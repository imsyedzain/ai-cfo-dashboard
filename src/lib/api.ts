import type { DashboardSummary, ChatRequest, ChatResponse } from '../types';

const API_BASE = import.meta.env.PROD ? '' : '';

export async function fetchDashboardData(): Promise<DashboardSummary> {
  const response = await fetch(`${API_BASE}/api/dashboard`);
  if (!response.ok) {
    throw new Error(`Dashboard API error: ${response.statusText}`);
  }
  return response.json();
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Chat API error: ${response.statusText} - ${errorBody}`);
  }
  return response.json();
}
