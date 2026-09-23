import { AIProfile, WritingStyle } from '@/types/email';

export interface AIProfileDefinition {
  id: AIProfile;
  name: string;
  description: string;
  systemInstruction: string;
}

export const AI_PROFILES: Record<AIProfile, AIProfileDefinition> = {
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Formal workplace tone, clear & structured, suitable for colleagues and executives.',
    systemInstruction:
      'BEHAVIORAL PROFILE [PROFESSIONAL]:\n- Maintain a formal workplace tone.\n- Ensure all communication is clear, structured, and polished.\n- Avoid unnecessary casual language, slang, or emojis.\n- Suitable for colleagues, recruiters, managers, clients, and professional correspondence.',
  },
  friendly: {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm, natural, conversational, polite and approachable.',
    systemInstruction:
      'BEHAVIORAL PROFILE [FRIENDLY]:\n- Adopt a warm, natural, and conversational tone.\n- Be polite, approachable, and enthusiastic.\n- Avoid overly formal, stiff, or bureaucratic wording.\n- Use engaging, personable language.',
  },
  concise: {
    id: 'concise',
    name: 'Concise',
    description: 'Shortest useful response, direct sentences, zero fluff.',
    systemInstruction:
      'BEHAVIORAL PROFILE [CONCISE]:\n- Provide the shortest useful response possible.\n- Remove all unnecessary filler, greetings, and redundant explanations.\n- Keep sentences direct and bullet points crisp.\n- Preserve essential information while eliminating fluff.',
  },
  technical: {
    id: 'technical',
    name: 'Technical',
    description: 'Technically precise language, preserving terminology & implementation details.',
    systemInstruction:
      'BEHAVIORAL PROFILE [TECHNICAL]:\n- Use technically precise language and exact domain terminology.\n- Preserve technical terms, error names, code snippets, and architecture references.\n- Explain implementation details, specifications, and root causes when relevant.\n- Avoid oversimplification when technical accuracy matters.',
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Expressive wording, engaging phrasing, varied sentence structure.',
    systemInstruction:
      'BEHAVIORAL PROFILE [CREATIVE]:\n- Use expressive wording, engaging phrasing, and dynamic vocabulary.\n- Vary sentence structures naturally to make writing captivating and fluid.\n- Add thoughtful perspective while strictly respecting the user\'s intended goal.',
  },
  executive: {
    id: 'executive',
    name: 'Executive',
    description: 'Polished, high-level overview focused on key decisions and actions.',
    systemInstruction:
      'BEHAVIORAL PROFILE [EXECUTIVE]:\n- Adopt a polished, high-level executive tone.\n- Focus strictly on key decisions, strategic action items, risks, and bottom-line outcomes.\n- Keep communication concise, authoritative, and structured for fast C-level review.\n- Avoid low-level operational trivia unless explicitly requested.',
  },
};

/**
 * Returns the profile instruction block for the requested profile, falling back to 'professional'.
 */
export function getProfileInstruction(profile?: string | AIProfile): string {
  const normalizedKey = (profile?.toLowerCase() || 'professional') as AIProfile;
  const target = AI_PROFILES[normalizedKey] || AI_PROFILES.professional;
  return target.systemInstruction;
}

/**
 * Constructs a comprehensive system instruction that includes the AI Profile behavioral rules,
 * writing style options, and base domain rules.
 */
export function buildSystemInstruction(
  baseInstruction: string,
  profile?: string | AIProfile,
  writingStyle?: WritingStyle
): string {
  const profileRules = getProfileInstruction(profile);

  let styleRules = '';
  if (writingStyle) {
    const parts: string[] = [];
    if (writingStyle.formality) parts.push(`Formality target: ${writingStyle.formality}`);
    if (writingStyle.length) parts.push(`Length target: ${writingStyle.length}`);
    if (writingStyle.includeGreetings !== undefined)
      parts.push(`Greetings: ${writingStyle.includeGreetings ? 'Include appropriate greeting' : 'Omit greeting'}`);
    if (writingStyle.includeSignOff !== undefined)
      parts.push(`Sign-off: ${writingStyle.includeSignOff ? 'Include professional sign-off' : 'Omit sign-off'}`);
    if (writingStyle.customInstructions) parts.push(`User custom notes: "${writingStyle.customInstructions}"`);

    if (parts.length > 0) {
      styleRules = `\n\nWRITING STYLE OVERRIDES:\n- ${parts.join('\n- ')}`;
    }
  }

  return `${profileRules}${styleRules}\n\n${baseInstruction}`.trim();
}
