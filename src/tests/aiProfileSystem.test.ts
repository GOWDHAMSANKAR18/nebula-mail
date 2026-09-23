import { describe, test, expect, vi } from 'vitest';
import { getProfileInstruction, buildSystemInstruction, AI_PROFILES } from '../lib/ai/profiles';
import { AIProfile } from '../types/email';

describe('NEBULA MAIL — AI Profile Behavioral System Tests', () => {
  test('1. Each profile has distinct, unique system-level instructions', () => {
    const professional = getProfileInstruction('professional');
    const friendly = getProfileInstruction('friendly');
    const concise = getProfileInstruction('concise');
    const technical = getProfileInstruction('technical');
    const creative = getProfileInstruction('creative');
    const executive = getProfileInstruction('executive');

    // Verify all 3 mandatory comparison pairs from requirements
    expect(professional).not.toEqual(friendly);
    expect(friendly).not.toEqual(concise);
    expect(technical).not.toEqual(creative);

    // Verify additional executive comparison
    expect(executive).not.toEqual(concise);
    expect(professional).not.toEqual(technical);
  });

  test('2. Profile rules reflect target tone & behavioral characteristics', () => {
    expect(AI_PROFILES.professional.systemInstruction).toContain('formal workplace tone');
    expect(AI_PROFILES.friendly.systemInstruction).toContain('warm, natural, and conversational');
    expect(AI_PROFILES.concise.systemInstruction).toContain('shortest useful response');
    expect(AI_PROFILES.technical.systemInstruction).toContain('technically precise language');
    expect(AI_PROFILES.creative.systemInstruction).toContain('expressive wording');
    expect(AI_PROFILES.executive.systemInstruction).toContain('high-level executive tone');
  });

  test('3. Unrecognized or missing profile gracefully falls back to Professional profile', () => {
    const fallbackInstruction = getProfileInstruction('unknown_profile');
    const professionalInstruction = getProfileInstruction('professional');

    expect(fallbackInstruction).toEqual(professionalInstruction);
    expect(fallbackInstruction).toContain('BEHAVIORAL PROFILE [PROFESSIONAL]');
  });

  test('4. buildSystemInstruction prepends profile rules to base system instruction', () => {
    const basePrompt = 'You are an AI Email Assistant drafting an email reply.';
    const systemInstrTechnical = buildSystemInstruction(basePrompt, 'technical');
    const systemInstrFriendly = buildSystemInstruction(basePrompt, 'friendly');

    expect(systemInstrTechnical).toContain('BEHAVIORAL PROFILE [TECHNICAL]');
    expect(systemInstrTechnical).toContain(basePrompt);

    expect(systemInstrFriendly).toContain('BEHAVIORAL PROFILE [FRIENDLY]');
    expect(systemInstrFriendly).toContain(basePrompt);

    expect(systemInstrTechnical).not.toEqual(systemInstrFriendly);
  });

  test('5. buildSystemInstruction incorporates WritingStyle overrides', () => {
    const basePrompt = 'Generate a new email.';
    const systemInstr = buildSystemInstruction(basePrompt, 'executive', {
      formality: 'formal',
      length: 'concise',
      includeGreetings: true,
      includeSignOff: true,
      customInstructions: 'Include reference to Q3 roadmap.',
    });

    expect(systemInstr).toContain('BEHAVIORAL PROFILE [EXECUTIVE]');
    expect(systemInstr).toContain('WRITING STYLE OVERRIDES:');
    expect(systemInstr).toContain('Include reference to Q3 roadmap.');
  });
});
