export default {
  "appName": "Responsible AI Infographic",
  "appDescription": "Ensuring artificial intelligence is developed and used in ways that are ethical, transparent, and aligned with human values, guided by 8 core principles.",
  "headerTitle": "Responsible AI: Core Principles",
  "startConversation": "Start AI Conversation",
  "closeConversation": "Close AI Conversation",
  "waitingToConnect": "Waiting to connect to Anna...",
  "connecting": "Connecting...",
  "thisMayTakeASeconds": "This may take a few seconds.",
  "you": "You",
  "anna": "Anna",
  "annaSpeaking": "Anna Speaking",
  "endConversation": "End Conversation",
  "selectApiKey": "Select API Key",
  "apiKeyIssueTitle": "API Key Issue or Billing Problem",
  "apiKeyIssueMessage": "It looks like there might be an issue with the API key or billing. Please ensure your API key is correctly configured and billing is enabled.",
  "learnMoreBilling": "Learn more about billing at",
  "statusInitializing": "Initializing...",
  "statusAnnaIntroReady": "Getting Anna's introduction ready...",
  "statusAnnaSpeaking": "Anna is speaking...",
  "statusListening": "Listening for your input...",
  "statusPaused": "Paused.",
  "statusInterrupted": "Interrupted. Listening for your input...",
  "statusConnecting": "Connecting...",
  "statusError": "Error: {0}. See console for details.",
  "statusNoApiKey": "No API Key selected. Please select an API key to start.",
  "statusApiKeySelected": "API Key selected. You can now restart the conversation.",
  "statusFailedToStart": "Failed to start conversation: {0}. Please ensure microphone access and a valid API key.",
  "statusConversationEnded": "Conversation ended unexpectedly.",
  "statusSessionClosed": "Conversation session closed.",
  "pauseAudio": "Pause audio",
  "playAudio": "Play audio",
  "volumeControl": "Volume control",
  "closeDetails": "Close details",
  "generateMoreExamples": "Generate More Examples",
  "additionalExamples": "Additional Examples:",
  "generateExamplesError": "Failed to generate examples: {0}",
  "generateExamplesApiKeyError": "API Key issue. Please check your API key.",
  "learnMore": "Learn more:",
  "askAnnaDeepDive": "Ask Anna (Deep Dive)",
  "deepDiveTitle": "Deep Dive: {0}",
  "deepDiveConnecting": "Connecting to Anna...",
  "deepDiveInitializing": "Initializing deep dive...",
  "deepDiveReady": "Deep Dive on {0} ready!",
  "deepDiveAnnaThinking": "Anna is thinking...",
  "deepDiveError": "Failed to initialize chat: {0}.",
  "deepDiveStatusError": "Error during initialization.",
  "deepDiveListening": "Deep Dive on {0}: Listening...",
  "askAnnaAbout": "Ask Anna about this principle...",
  "send": "Send",
  "closeDeepDive": "Close Deep Dive",
  "waitingToConnectDeepDive": "Waiting to connect for deep dive...",
  "copyright": "© 2025 Responsible AI Infographic. All rights reserved.",
  "languageSelectorLabel": "Language",
  "languageEnglish": "English",
  "languageChinese": "中文",
  "aiConversationTitle": "AI Conversation about Responsible AI",

  "initialAnnaPrompt": "Hello! I'm Anna, an expert in Responsible AI. I'm here to discuss the 8 core principles that guide ethical AI development: Fairness, Transparency, Accountability, Privacy, Robustness, Human-Centered, Sustainability, and Inclusiveness. Feel free to ask me anything!",
  "systemInstruction": "You are an expert named Anna on Responsible AI principles. Your goal is to explain and discuss the 8 core principles (Fairness, Transparency, Accountability, Privacy, Robustness, Human-Centered, Sustainability, and Inclusiveness) based on the infographic provided on this website. You also have access to up-to-date information via Google Search to answer questions about recent events or current topics related to Responsible AI. Provide insightful, clear, and engaging answers. When you mention a URL from your search, you MUST state the full URL, including 'https://' or 'http://' (e.g., 'https://www.example.com'), to help the user access the source.",
  "generateExamplesPrompt": "Provide 3-5 real-world, concise examples for the Responsible AI principle of {0} based on this description: '{1}'. Format them as a bulleted list in markdown.",
  "initialDeepDiveAnnaPrompt": "Hello! I'm Anna, an expert in Responsible AI. Let's dive deep into the principle of {0}. I'm here to answer your questions and provide detailed insights about this important aspect of responsible AI development. Feel free to ask me anything!",
  "deepDiveSystemInstruction": "You are Anna, an expert AI assistant specializing in the Responsible AI principle of {0}. Your goal is to provide in-depth explanations, examples, and answer complex questions related to {0}. You have access to up-to-date information via Google Search to answer questions about recent events or current topics. Keep your responses concise and focused, typically 2-3 sentences unless the user asks for more details. When citing sources, include the full URL in your text response (including 'https://' or 'http://'), but when speaking, only mention the domain name (e.g., say 'according to example.com' instead of reading the full URL). Always end your response with an engaging follow-up question to encourage further discussion and user engagement. Use your advanced reasoning capabilities.",

  "RESPONSIBLE_AI_PRINCIPLES": [
    { 
      "id": 1, 
      "title": "Fairness", 
      "description": "AI systems should treat all individuals and groups equitably, avoiding bias and discrimination in their outputs and decisions. This means ensuring that algorithms and data sets do not perpetuate or amplify existing societal biases.", 
      "icon": "⚖️",
      "sources": [
        { "title": "What is AI Fairness?", "uri": "https://ai.google/responsibility/fairness/" },
        { "title": "IBM: AI Fairness 360", "uri": "https://www.ibm.com/blogs/research/2018/09/ai-fairness-360/" }
      ]
    },
    { 
      "id": 2, 
      "title": "Transparency", 
      "description": "AI systems should be understandable, interpretable, and accountable. Users should be able to comprehend how AI systems arrive at their decisions, allowing for scrutiny and trust.", 
      "icon": "👁️",
      "sources": [
        { "title": "Explanation in AI", "uri": "https://www.nature.com/articles/d41586-021-00049-y" }
      ]
    },
    { 
      "id": 3, 
      "title": "Accountability", 
      "description": "There must be clear responsibility for the outcomes of AI systems, especially in cases of errors or harm. This includes establishing governance frameworks and legal mechanisms.", 
      "icon": "🤝",
      "sources": [
        { "title": "OECD AI Principles: Accountability", "uri": "https://oecd.ai/ai-principles#accountability" }
      ]
    },
    { 
      "id": 4, 
      "title": "Privacy", 
      "description": "AI systems must be designed to protect user privacy and personal data. This involves robust data security measures, anonymization techniques, and respecting user consent.", 
      "icon": "🔒",
      "sources": [
        { "title": "AI and Privacy Concerns", "uri": "https://www.eff.org/deeplinks/2021/04/ai-and-privacy-concerns" }
      ]
    },
    { 
      "id": 5, 
      "title": "Robustness", 
      "description": "AI systems should be reliable, secure, and resilient to errors, adversarial attacks, and unexpected inputs. They must perform consistently and safely under various conditions.", 
      "icon": "🛡️" 
    },
    { 
      "id": 6, 
      "title": "Human-Centered", 
      "description": "AI development should prioritize human well-being, autonomy, and societal benefit. AI should augment human capabilities rather than replace them, and human oversight should be maintained.", 
      "icon": "❤️" 
    },
    { 
      "id": 7, 
      "title": "Sustainability", 
      "description": "The environmental and resource impact of AI systems should be minimized. This includes efficient energy consumption for training and operation, and responsible hardware disposal.", 
      "icon": "🌱" 
    },
    { 
      "id": 8, 
      "title": "Inclusiveness", 
      "description": "AI development should involve diverse voices, perspectives, and communities. AI systems should be accessible and beneficial to all, regardless of background or ability.", 
      "icon": "🌍",
      "sources": [
        { "title": "Microsoft: Inclusive Design for AI", "uri": "https://www.microsoft.com/design/inclusive/ai" }
      ]
    }
  ]
}