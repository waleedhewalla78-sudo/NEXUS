/**
 * Feature 004 Phase 7 — Agent mesh registry (all 8 L6 agents).
 */

import type { AgentName, BaseAgent, AgentRunInput } from '@/lib/ai-cmo/agents/types/base';
import { optimizerAgent } from '@/lib/ai-cmo/agents/optimizer-agent';
import { radarAgent } from '@/lib/ai-cmo/agents/radar-agent';
import { quantAgent } from '@/lib/ai-cmo/agents/quant-agent';
import { sentinelAgent } from '@/lib/ai-cmo/agents/sentinel-agent';
import { financeAgent } from '@/lib/ai-cmo/agents/finance-agent';
import { complianceAgent } from '@/lib/ai-cmo/agents/compliance-agent';

export type RegisteredAgent = BaseAgent<AgentRunInput, unknown>;

export const AGENT_MESH: Record<AgentName, RegisteredAgent | 'legacy_module'> = {
  strategic_brain: 'legacy_module',
  creator: 'legacy_module',
  optimizer: optimizerAgent as unknown as RegisteredAgent,
  radar: radarAgent,
  quant: quantAgent,
  sentinel: sentinelAgent,
  finance: financeAgent,
  compliance: complianceAgent,
};

export const MESH_AGENT_NAMES = Object.keys(AGENT_MESH) as AgentName[];

export function getMeshAgent(name: AgentName): RegisteredAgent | null {
  const agent = AGENT_MESH[name];
  return agent === 'legacy_module' ? null : agent;
}

export function listMeshAgents(): AgentName[] {
  return MESH_AGENT_NAMES;
}

export const agentRegistryUtils = {
  AGENT_MESH,
  getMeshAgent,
  listMeshAgents,
};
