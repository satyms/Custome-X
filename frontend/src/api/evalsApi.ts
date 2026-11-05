import apiClient from './client';

export interface EvalScenarioItem {
  id: string;
  suite: 'rag' | 'tool_calling' | 'guardrails' | 'empathy';
  name: string;
  user_prompt: string;
  expected_tool_or_output: string;
  actual_output: string;
  judge_score: number;
  status: 'passed' | 'failed' | 'flagged';
  latency_ms: number;
  judge_rationale: string;
}

export interface EvalBenchmarkResponse {
  suite: string;
  total_scenarios: number;
  passed_scenarios: number;
  accuracy_percent: number;
  tool_validity_percent: number;
  hallucination_rate_percent: number;
  avg_latency_ms: number;
  scenarios: EvalScenarioItem[];
}

export const evalsApi = {
  getScenarios: async (suite: string = 'all'): Promise<EvalScenarioItem[]> => {
    const response = await apiClient.get<EvalScenarioItem[]>('/evals/scenarios', {
      params: { suite },
    });
    return response.data;
  },

  runBenchmark: async (suite: string = 'all'): Promise<EvalBenchmarkResponse> => {
    const response = await apiClient.post<EvalBenchmarkResponse>('/evals/run', {
      suite: suite || 'all',
    });
    return response.data;
  },
};

export default evalsApi;
