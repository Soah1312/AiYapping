import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PERSONALITY_PRESETS } from '../lib/presets';

const defaultPreset = PERSONALITY_PRESETS.theekHaiBoss;

export const useSettingsStore = create(
  persist(
    (set) => ({
      // Global
      turns: 10,

      // AI-1
      ai1PresetId: 'theekHaiBoss',
      ai1Temperature: defaultPreset.temperature,
      ai1TopP: defaultPreset.top_p,
      ai1SystemPrompt: defaultPreset.systemPrompt,

      // AI-2
      ai2PresetId: 'theekHaiBoss',
      ai2Temperature: defaultPreset.temperature,
      ai2TopP: defaultPreset.top_p,
      ai2SystemPrompt: defaultPreset.systemPrompt,

      // Actions
      setTurns: (turns) => set({ turns }),

      applyPresetToAI1: (presetId) => {
        const preset = PERSONALITY_PRESETS[presetId];
        if (!preset) return;
        set({
          ai1PresetId: presetId,
          ai1Temperature: preset.temperature,
          ai1TopP: preset.top_p,
          ai1SystemPrompt: preset.systemPrompt
        });
      },

      applyPresetToAI2: (presetId) => {
        const preset = PERSONALITY_PRESETS[presetId];
        if (!preset) return;
        set({
          ai2PresetId: presetId,
          ai2Temperature: preset.temperature,
          ai2TopP: preset.top_p,
          ai2SystemPrompt: preset.systemPrompt
        });
      },

      applyQuickPairing: (pairing) => {
        const preset1 = PERSONALITY_PRESETS[pairing.ai1];
        const preset2 = PERSONALITY_PRESETS[pairing.ai2];
        if (!preset1 || !preset2) return;
        set({
          ai1PresetId: pairing.ai1,
          ai1Temperature: preset1.temperature,
          ai1TopP: preset1.top_p,
          ai1SystemPrompt: preset1.systemPrompt,
          ai2PresetId: pairing.ai2,
          ai2Temperature: preset2.temperature,
          ai2TopP: preset2.top_p,
          ai2SystemPrompt: preset2.systemPrompt
        });
      },

      setAI1Temperature: (v) => set({ ai1Temperature: v, ai1PresetId: 'custom' }),
      setAI2Temperature: (v) => set({ ai2Temperature: v, ai2PresetId: 'custom' }),
    }),
    {
      name: 'ai-arena-settings'
    }
  )
);
