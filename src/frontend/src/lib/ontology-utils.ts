import type { OntologyConcept } from '@/types/ontology';

/**
 * Resolve the best label for a concept based on language preference.
 * 
 * Priority chain:
 * 1. Preferred language (e.g., user's selected language)
 * 2. English ('en')
 * 3. No language tag ('')
 * 4. Any available label
 * 5. IRI local name (after last # or /)
 * 
 * @param concept The ontology concept
 * @param preferredLang The preferred language code (e.g., 'en', 'ja', 'de')
 * @returns The best available label for display
 */
export function resolveLabel(
  concept: OntologyConcept,
  preferredLang: string = 'en'
): string {
  const labels = concept.labels || {};
  
  // Priority: preferred lang > English > no lang tag > any available > IRI local name
  if (labels[preferredLang]) return labels[preferredLang];
  if (labels['en']) return labels['en'];
  if (labels['']) return labels[''];  // No language tag
  
  const anyLabel = Object.values(labels)[0];
  if (anyLabel) return anyLabel;
  
  // Legacy fallback: use the label field if available
  if (concept.label && concept.label !== concept.iri) {
    return concept.label;
  }
  
  // Final fallback: extract local name from IRI (after last # or /)
  return concept.iri.split(/[/#]/).pop() || concept.iri;
}

/**
 * Get all available language codes from a set of concepts.
 * 
 * @param concepts Array of ontology concepts
 * @returns Sorted array of unique language codes (e.g., ['en', 'de', 'ja'])
 */
export function getAvailableLanguages(concepts: OntologyConcept[]): string[] {
  const languages = new Set<string>();
  
  for (const concept of concepts) {
    if (concept.labels) {
      for (const lang of Object.keys(concept.labels)) {
        if (lang) {  // Skip empty string (no language tag)
          languages.add(lang);
        }
      }
    }
  }
  
  // Sort with English first, then alphabetically
  return Array.from(languages).sort((a, b) => {
    if (a === 'en') return -1;
    if (b === 'en') return 1;
    return a.localeCompare(b);
  });
}

/**
 * Language display names for common language codes.
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'de': 'Deutsch',
  'ja': '日本語',
  'fr': 'Français',
  'it': 'Italiano',
  'es': 'Español',
  'nl': 'Nederlands',
  'pt': 'Português',
  'zh': '中文',
  'ko': '한국어',
  'ru': 'Русский',
  'ar': 'العربية',
  'cs': 'Čeština',
  'da': 'Dansk',
  'el': 'Ελληνικά',
  'fi': 'Suomi',
  'hu': 'Magyar',
  'no': 'Norsk',
  'pl': 'Polski',
  'sv': 'Svenska',
  'tr': 'Türkçe',
  'uk': 'Українська',
};

/**
 * Get the display name for a language code.
 * 
 * @param langCode The ISO 639-1 language code
 * @returns The display name or the code itself if unknown
 */
export function getLanguageDisplayName(langCode: string): string {
  return LANGUAGE_NAMES[langCode] || langCode.toUpperCase();
}
