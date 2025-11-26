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