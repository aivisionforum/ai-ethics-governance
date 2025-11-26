import { Principle } from './types';

export const RESPONSIBLE_AI_PRINCIPLES: Principle[] = [
  { 
    id: 1, 
    title: "Fairness", 
    description: "AI systems should treat all individuals and groups equitably, avoiding bias and discrimination in their outputs and decisions. This means ensuring that algorithms and data sets do not perpetuate or amplify existing societal biases.", 
    icon: "⚖️",
    sources: [
      { title: "What is AI Fairness?", uri: "https://ai.google/responsibility/fairness/" },
      { title: "IBM: AI Fairness 360", uri: "https://www.ibm.com/blogs/research/2018/09/ai-fairness-360/" }
    ]
  },
  { 
    id: 2, 
    title: "Transparency", 
    description: "AI systems should be understandable, interpretable, and accountable. Users should be able to comprehend how AI systems arrive at their decisions, allowing for scrutiny and trust.", 
    icon: "👁️",
    sources: [
      { title: "Explanation in AI", uri: "https://www.nature.com/articles/d41586-021-00049-y" }
    ]
  },
  { 
    id: 3, 
    title: "Accountability", 
    description: "There must be clear responsibility for the outcomes of AI systems, especially in cases of errors or harm. This includes establishing governance frameworks and legal mechanisms.", 
    icon: "🤝",
    sources: [
      { title: "OECD AI Principles: Accountability", uri: "https://oecd.ai/ai-principles#accountability" }
    ]
  },
  // FIX: Added 'id:' property to correctly define the Principle object.
  { id: 4, 
    title: "Privacy", 
    description: "AI systems must be designed to protect user privacy and personal data. This involves robust data security measures, anonymization techniques, and respecting user consent.", 
    icon: "🔒",
    sources: [
      { title: "AI and Privacy Concerns", uri: "https://www.eff.org/deeplinks/2021/04/ai-and-privacy-concerns" }
    ]
  },
  { 
    id: 5, 
    title: "Robustness", 
    description: "AI systems should be reliable, secure, and resilient to errors, adversarial attacks, and unexpected inputs. They must perform consistently and safely under various conditions.", 
    icon: "🛡️" 
  },
  { 
    id: 6, 
    title: "Human-Centered", 
    description: "AI development should prioritize human well-being, autonomy, and societal benefit. AI should augment human capabilities rather than replace them, and human oversight should be maintained.", 
    icon: "❤️" 
  },
  { 
    id: 7, 
    title: "Sustainability", 
    description: "The environmental and resource impact of AI systems should be minimized. This includes efficient energy consumption for training and operation, and responsible hardware disposal.", 
    icon: "🌱" 
  },
  { 
    id: 8, 
    title: "Inclusiveness", 
    description: "AI development should involve diverse voices, perspectives, and communities. AI systems should be accessible and beneficial to all, regardless of background or ability.", 
    icon: "🌍",
    sources: [
      { title: "Microsoft: Inclusive Design for AI", uri: "https://www.microsoft.com/design/inclusive/ai" }
    ]
  },
];