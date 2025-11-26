export default {
  "appName": "负责任人工智能信息图",
  "appDescription": "确保人工智能的开发和使用符合道德、透明、以人为本的价值观，并遵循8个核心原则。",
  "headerTitle": "负责任人工智能：核心原则",
  "startConversation": "开始AI对话",
  "closeConversation": "关闭AI对话",
  "waitingToConnect": "正在连接Anna...",
  "connecting": "连接中...",
  "thisMayTakeASeconds": "这可能需要几秒钟。",
  "you": "您",
  "anna": "Anna",
  "annaSpeaking": "Anna正在说话",
  "endConversation": "结束对话",
  "selectApiKey": "选择API密钥",
  "apiKeyIssueTitle": "API密钥或账单问题",
  "apiKeyIssueMessage": "API密钥或账单可能存在问题。请确保您的API密钥配置正确且账单已启用。",
  "learnMoreBilling": "了解更多关于账单的信息",
  "statusInitializing": "初始化中...",
  "statusAnnaIntroReady": "正在准备Anna的介绍...",
  "statusAnnaSpeaking": "Anna正在说话...",
  "statusListening": "正在聆听您的输入...",
  "statusPaused": "已暂停。",
  "statusInterrupted": "已中断。正在聆听您的输入...",
  "statusConnecting": "连接中...",
  "statusError": "错误：{0}。详情请查看控制台。",
  "statusNoApiKey": "未选择API密钥。请选择API密钥以开始。",
  "statusApiKeySelected": "API密钥已选择。您现在可以重新开始对话。",
  "statusFailedToStart": "无法开始对话：{0}。请确保麦克风访问权限和有效的API密钥。",
  "statusConversationEnded": "对话意外结束。",
  "statusSessionClosed": "对话会话已关闭。",
  "pauseAudio": "暂停音频",
  "playAudio": "播放音频",
  "volumeControl": "音量控制",
  "closeDetails": "关闭详情",
  "generateMoreExamples": "生成更多示例",
  "additionalExamples": "更多示例：",
  "generateExamplesError": "生成示例失败：{0}",
  "generateExamplesApiKeyError": "API密钥问题。请检查您的API密钥。",
  "learnMore": "了解更多：",
  "askAnnaDeepDive": "向Anna提问（深入探讨）",
  "deepDiveTitle": "深入探讨：{0}",
  "deepDiveConnecting": "正在连接Anna...",
  "deepDiveInitializing": "正在初始化深入探讨...",
  "deepDiveReady": "关于{0}的深入探讨已准备就绪！",
  "deepDiveAnnaThinking": "Anna正在思考...",
  "deepDiveError": "初始化聊天失败：{0}。",
  "deepDiveStatusError": "初始化过程中出错。",
  "deepDiveListening": "关于{0}的深入探讨：正在聆听...",
  "askAnnaAbout": "向Anna提问关于此原则...",
  "send": "发送",
  "closeDeepDive": "关闭深入探讨",
  "waitingToConnectDeepDive": "正在等待连接进行深入探讨...",
  "copyright": "© 2025 负责任人工智能信息图。保留所有权利。",
  "languageSelectorLabel": "语言",
  "languageEnglish": "英语",
  "languageChinese": "中文",
  "aiConversationTitle": "AI Conversation about Responsible AI",

  "initialAnnaPrompt": "您好！我是Anna，一位负责任人工智能专家。我在这里和您讨论指导道德AI开发的8个核心原则：公平性、透明度、问责制、隐私、鲁棒性、以人为本、可持续性、包容性。欢迎您随时向我提问！",
  "systemInstruction": "您是名为Anna的负责任人工智能原则专家。您的目标是根据本网站提供的信息图，解释和讨论8个核心原则（公平性、透明度、问责制、隐私、鲁棒性、以人为本、可持续性、可持续性和包容性）。您还可以通过Google搜索获取最新信息，回答与负责任人工智能相关的近期事件或当前话题。提供富有洞察力、清晰且引人入胜的答案。当您提及搜索到的URL时，您必须提供完整的URL，包括'https://'或'http://'（例如，'https://www.example.com'），以帮助用户访问来源。",
  "generateExamplesPrompt": "请根据此描述：'{1}'，为负责任人工智能原则'{0}'提供3-5个真实的、简洁的示例。以Markdown格式的无序列表呈现。",
  "initialDeepDiveAnnaPrompt": "您好！我是Anna，一位负责任人工智能专家。让我们深入探讨{0}这一原则。我在这里回答您的问题，并为您提供关于负责任AI开发这一重要方面的详细见解。欢迎您随时向我提问！",
  "deepDiveSystemInstruction": "您是Anna，一位专注于负责任人工智能原则'{0}'的专家AI助手。您的目标是提供关于'{0}'的深入解释、示例并回答复杂问题。您还可以通过Google搜索获取最新信息，回答与当前话题相关的近期事件或问题。请保持回答简洁明了，通常2-3句话即可，除非用户要求更多细节。引用来源时，请在文本中包含完整的URL（包括'https://'或'http://'），但在语音中只提及域名（例如，说'根据example.com'而不是读出完整URL）。请在每次回答后提出一个引人入胜的后续问题，以鼓励进一步讨论和用户参与。请运用您的高级推理能力。",

  "RESPONSIBLE_AI_PRINCIPLES": [
    { 
      "id": 1, 
      "title": "公平性", 
      "description": "AI系统应公平对待所有个人和群体，避免在其输出和决策中出现偏见和歧视。这意味着要确保算法和数据集不会延续或放大现有的社会偏见。", 
      "icon": "⚖️",
      "sources": [
        { "title": "什么是AI公平性？", "uri": "https://ai.google/responsibility/fairness/" },
        { "title": "IBM：AI公平性360", "uri": "https://www.ibm.com/blogs/research/2018/09/ai-fairness-360/" }
      ]
    },
    { 
      "id": 2, 
      "title": "透明度", 
      "description": "AI系统应易于理解、解释和问责。用户应能理解AI系统如何做出决策，以便进行审查和建立信任。", 
      "icon": "👁️",
      "sources": [
        { "title": "AI中的解释", "uri": "https://www.nature.com/articles/d41586-021-00049-y" }
      ]
    },
    { 
      "id": 3, 
      "title": "问责制", 
      "description": "必须明确AI系统结果的责任，尤其是在出现错误或造成损害的情况下。这包括建立治理框架和法律机制。", 
      "icon": "🤝",
      "sources": [
        { "title": "OECD AI原则：问责制", "uri": "https://oecd.ai/ai-principles#accountability" }
      ]
    },
    { 
      "id": 4, 
      "title": "隐私", 
      "description": "AI系统必须旨在保护用户隐私和个人数据。这涉及强大的数据安全措施、匿名化技术以及尊重用户同意。", 
      "icon": "🔒",
      "sources": [
        { "title": "AI与隐私问题", "uri": "https://www.eff.org/deeplinks/2021/04/ai-and-privacy-concerns" }
      ]
    },
    { 
      "id": 5, 
      "title": "鲁棒性", 
      "description": "AI系统应可靠、安全，并能抵御错误、对抗性攻击和意外输入。它们必须在各种条件下保持一致且安全地运行。", 
      "icon": "🛡️" 
    },
    { 
      "id": 6, 
      "title": "以人为本", 
      "description": "AI开发应优先考虑人类福祉、自主性和社会效益。AI应增强人类能力而非取代，并应保持人工监督。", 
      "icon": "❤️" 
    },
    { 
      "id": 7, 
      "title": "可持续性", 
      "description": "应尽量减少AI系统对环境和资源的 M。这包括在训练和操作过程中高效的能源消耗，以及负责任的硬件处置。", 
      "icon": "🌱" 
    },
    { 
      "id": 8, 
      "title": "包容性", 
      "description": "AI开发应涉及不同的声音、观点和社区。AI系统应易于访问并惠及所有人，无论背景或能力如何。", 
      "icon": "🌍",
      "sources": [
        { "title": "Microsoft：AI的包容性设计", "uri": "https://www.microsoft.com/design/inclusive/ai" }
      ]
    }
  ]
}