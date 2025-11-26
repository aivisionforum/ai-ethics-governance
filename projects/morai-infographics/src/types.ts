export interface Principle {
  id: number;
  title: string;
  description: string;
  icon: string;
  sources?: GroundingLink[]; // Optional array of links for detailed info
}

export interface GroundingLink {
  uri: string;
  title: string;
}

export interface ChatTurn {
  speaker: 'user' | 'Anna'; // Anna (female, expert)
  text: string;
  // groundingLinks?: GroundingLink[]; // Removed as Live API does not provide structured grounding for modelTurn
}

// Define AIStudio interface for the global window.aistudio object.
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
  metadata?: {
    name: string;
    description: string;
    i18n?: {
      [key: string]: {
        name: string;
        description: string;
      };
    };
  };
}

// FIX: Removed the declare global block from this file to avoid "duplicate declaration" errors.
// It is assumed that the global Window interface is augmented with 'aistudio: AIStudio;'
// in another definition file (e.g., at the project root or in a framework-provided declaration).
// The AIStudio interface itself is still exported and can be used for explicit type casting.
/*
declare global {
  interface Window {
    aistudio: AIStudio;
  }
}
*/