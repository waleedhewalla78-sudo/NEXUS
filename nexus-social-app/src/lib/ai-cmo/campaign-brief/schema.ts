import { z } from 'zod';

export const campaignBriefSchema = z.object({
  role: z.string().min(1).max(120),
  seniority: z.enum(['Junior', 'Mid', 'Senior', 'Lead', 'Executive']),
  domain: z.string().min(1).max(120),
  context: z.string().min(10).max(8000),
  coreObjective: z.string().min(3).max(500),
  secondaryObjectives: z
    .tuple([
      z.string().max(300).optional(),
      z.string().max(300).optional(),
      z.string().max(300).optional(),
    ])
    .optional(),
  targetRole: z.string().min(1).max(80),
  experienceLevel: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  market: z.string().min(1).max(80),
  artifactType: z.string().min(1).max(120),
  locale: z.string().default('en-US'),
  brandId: z.string().uuid().optional(),
  brandName: z.string().max(120).optional(),
  persona: z.string().max(120).optional(),
  targetAccountId: z.string().min(1).optional(),
});

export type CampaignBriefInput = z.infer<typeof campaignBriefSchema>;

export const campaignBriefPresets = {
  roles: [
    'Strategy Consultant',
    'Business Analyst',
    'Marketing Director',
    'Growth Lead',
    'CMO Advisor',
  ],
  domains: [
    'Business Strategy',
    'Finance',
    'Technology',
    'Marketing',
    'Operations',
  ],
  targetRoles: ['CEO', 'CMO', 'Founder', 'VP Marketing', 'Brand Manager'],
  markets: ['Global', 'MENA', 'UAE', 'Egypt', 'KSA', 'US', 'EU'],
  artifactTypes: [
    'Strategic Document',
    'SOP',
    'Playbook',
    'Business Plan',
    'Campaign Brief',
    'JSON Output',
  ],
} as const;
