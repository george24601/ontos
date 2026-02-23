import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersonaId } from '@/types/settings';
import { ALL_PERSONA_IDS, PERSONA_MIGRATION_MAP } from '@/types/settings';

interface PersonaState {
  /** Persona IDs the user is allowed to use (from API). */
  allowedPersonas: PersonaId[];
  /** Currently selected persona (persisted). Must be one of allowedPersonas. */
  currentPersona: PersonaId | null;
  isLoading: boolean;
  error: string | null;
  setAllowedPersonas: (personas: string[]) => void;
  setCurrentPersona: (persona: PersonaId | null) => void;
  fetchAllowedPersonas: () => Promise<void>;
  /** Reset current persona if it's no longer in allowed list (call after fetch). */
  ensureCurrentPersonaValid: () => void;
}

const VALID_PERSONA_IDS = new Set<string>(ALL_PERSONA_IDS);

/** Map legacy persona IDs to their consolidated equivalents. */
function migratePersonaId(id: string): string {
  return PERSONA_MIGRATION_MAP[id] ?? id;
}

function sanitizePersonas(personas: string[]): PersonaId[] {
  const migrated = personas.map(migratePersonaId);
  const unique = [...new Set(migrated)];
  return unique.filter((p): p is PersonaId => VALID_PERSONA_IDS.has(p));
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set, get) => ({
      allowedPersonas: [],
      currentPersona: null,
      isLoading: false,
      error: null,

      setAllowedPersonas: (personas) => set({ allowedPersonas: sanitizePersonas(personas) }),

      setCurrentPersona: (persona) => set({ currentPersona: persona }),

      fetchAllowedPersonas: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/user/allowed-personas', { cache: 'no-store' });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`);
          }
          const data = (await res.json()) as { personas: string[] };
          const allowed = sanitizePersonas(data.personas || []);
          set({ allowedPersonas: allowed, isLoading: false, error: null });
          get().ensureCurrentPersonaValid();
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Failed to load allowed personas';
          set({ error: message, isLoading: false, allowedPersonas: [] });
          set({ currentPersona: null });
        }
      },

      ensureCurrentPersonaValid: () => {
        const { currentPersona, allowedPersonas } = get();
        if (currentPersona && allowedPersonas.length > 0 && !allowedPersonas.includes(currentPersona)) {
          set({ currentPersona: allowedPersonas[0] ?? null });
        }
        if (!currentPersona && allowedPersonas.length > 0) {
          set({ currentPersona: allowedPersonas[0] });
        }
      },
    }),
    {
      name: 'persona-storage',
      partialize: (state) => ({ currentPersona: state.currentPersona }),
      onRehydrateStorage: () => (state) => {
        if (state?.currentPersona) {
          const migrated = migratePersonaId(state.currentPersona);
          if (migrated !== state.currentPersona && VALID_PERSONA_IDS.has(migrated)) {
            state.currentPersona = migrated as PersonaId;
          }
        }
      },
    }
  )
);
