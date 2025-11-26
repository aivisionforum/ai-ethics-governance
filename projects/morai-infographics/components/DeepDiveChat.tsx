import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat, Modality } from '@google/genai';
import { Principle, ChatTurn } from '../types';

// Helper functions for audio decoding (copied from LiveChat.tsx for self-containment)
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface DeepDiveChatProps {
  principle: Principle;
  onClose: () => void; // To close this deep dive chat and return to 'none' mode
}

const initialDeepDiveAnnaPrompt = (principleTitle: string) =>
  `Hello! I'm Anna, your guide for a deep dive into the Responsible AI principle of ${principleTitle}. Ask me anything, and I'll provide comprehensive insights and examples. Let's begin!`;

const DeepDiveChat: React.FC<DeepDiveChatProps> = ({ principle, onClose }) => {
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyPromptVisible, setApiKeyPromptVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing deep dive...');

  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs for audio playback of Anna's introduction
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputGainNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const scheduleAudioPlayback = useCallback((audioBuffer: AudioBuffer) => {
    if (!outputAudioContextRef.current || !outputGainNodeRef.current) return;

    const outputAudioCtx = outputAudioContextRef.current;
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtx.currentTime);

    const sourceNode = outputAudioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(outputGainNodeRef.current);
    sourceNode.addEventListener('ended', () => {
      outputSourcesRef.current.delete(sourceNode);
      if (outputSourcesRef.current.size === 0) {
        setStatusMessage(`Deep Dive on ${principle.title} ready!`);
      }
    });

    sourceNode.start(nextStartTimeRef.current);
    nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
    outputSourcesRef.current.add(sourceNode);
    setStatusMessage('Anna is speaking her introduction...');
  }, [principle.title]);

  const initializeChat = useCallback(async () => {
    setError(null);
    setApiKeyPromptVisible(false);
    setStatusMessage('Connecting to Anna...');

    // Cleanup any previous audio contexts
    outputSourcesRef.current.forEach(source => source.stop());
    outputSourcesRef.current.clear();
    outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;
    nextStartTimeRef.current = 0;

    try {
      // Pre-flight check for API key selection
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setApiKeyPromptVisible(true);
          setError('No API Key selected. Please select an API key to start this chat.');
          setStatusMessage('API Key required.');
          return;
        }
      }

      // Always create a new GoogleGenAI instance for the most up-to-date API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioContextRef.current = outputAudioCtx;

      if (outputAudioCtx.state === 'suspended') {
        await outputAudioCtx.resume();
      }

      const outputGainNode = outputAudioCtx.createGain();
      outputGainNodeRef.current = outputGainNode;
      outputGainNode.connect(outputAudioCtx.destination);
      outputGainNode.gain.value = 0.8; // Default volume

      // Generate Anna's voice introduction
      setStatusMessage('Generating Anna\'s voice introduction...');
      const introText = initialDeepDiveAnnaPrompt(principle.title);
      const initialResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts", // Use TTS model for voice intro
          contents: [{ parts: [{ text: introText }] }],
          config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
              },
          },
      });

      const base64InitialAudio = initialResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64InitialAudio && outputAudioContextRef.current) {
          const initialAudioBuffer = await decodeAudioData(
              decode(base64InitialAudio),
              outputAudioContextRef.current,
              24000,
              1,
          );
          scheduleAudioPlayback(initialAudioBuffer);
          setChatHistory([
            { speaker: 'Anna', text: introText }
          ]);
      } else {
          throw new Error("No audio data received for Anna's introduction.");
      }


      chatRef.current = ai.chats.create({
        model: 'gemini-2.5-pro', // Use Pro for complex text tasks
        config: {
          systemInstruction: `You are Anna, an expert AI assistant specializing in the Responsible AI principle of ${principle.title}. Your goal is to provide in-depth explanations, examples, and answer complex questions related to ${principle.title}. Keep your responses thorough and informative. Use your advanced reasoning capabilities. Do not offer to search the web, focus purely on this principle.`,
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
        },
      });
      setStatusMessage(`Deep Dive on ${principle.title} ready!`);

    } catch (e: any) {
      console.error("Failed to initialize Deep Dive Chat:", e);
      setError(`Failed to initialize chat: ${e.message || 'Unknown error'}.`);
      setApiKeyPromptVisible(true);
      setStatusMessage('Error during initialization.');
    }
  }, [principle.title, scheduleAudioPlayback]); // Dependency on principle.title ensures re-init if principle changes

  useEffect(() => {
    initializeChat();
    // Cleanup chat session and audio on unmount
    return () => {
      chatRef.current = null; // Clear chat instance
      outputSourcesRef.current.forEach(source => source.stop());
      outputSourcesRef.current.clear();
      outputAudioContextRef.current?.close().catch(console.error);
      outputAudioContextRef.current = null;
      nextStartTimeRef.current = 0;
    };
  }, [initializeChat]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentInput.trim() || !chatRef.current || isLoading) return;

    const userMessage = currentInput.trim();
    setChatHistory(prev => [...prev, { speaker: 'user', text: userMessage }]);
    setCurrentInput('');
    setIsLoading(true);
    setError(null);
    setStatusMessage('Anna is thinking...');

    try {
      const response = await chatRef.current.sendMessageStream({ message: userMessage });
      let fullAnnaResponse = '';
      setChatHistory(prev => [...prev, { speaker: 'Anna', text: '' }]); // Add empty Anna turn for streaming

      for await (const chunk of response) {
        if (chunk.text) {
          fullAnnaResponse += chunk.text;
          setChatHistory(prev => {
            const lastTurn = prev[prev.length - 1];
            if (lastTurn && lastTurn.speaker === 'Anna') {
              // Only update if the last turn is Anna's.
              const updatedPrev = [...prev];
              updatedPrev[prev.length - 1] = { ...lastTurn, text: fullAnnaResponse };
              return updatedPrev;
            }
            return [...prev, { speaker: 'Anna', text: fullAnnaResponse }];
          });
        }
      }
      setStatusMessage(`Deep Dive on ${principle.title} ready!`);
    } catch (e: any) {
      console.error("Error sending message to Deep Dive Chat:", e);
      if (e.message.includes("API key")) {
        setError("API Key issue. Please check your API key.");
      } else {
        setError(`Failed to get response: ${e.message || 'Unknown error'}`);
      }
      setApiKeyPromptVisible(true);
      setStatusMessage('Error getting response.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeySelection = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success after opening the dialog, re-initialize chat to pick up new key
      setApiKeyPromptVisible(false);
      initializeChat();
    } else {
      setError('API Key selection tool not available.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 w-full max-w-2xl mx-auto border border-indigo-200 relative">
      <h2 className="text-2xl font-bold text-indigo-700 mb-4 text-center">Deep Dive: {principle.title}</h2>

      {error && (
        <div role="alert" className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg border border-red-300 text-center text-sm mb-4">
          <p className="mb-2">{error}</p>
          {apiKeyPromptVisible && (
            <button
              onClick={handleApiKeySelection}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-full transition duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-red-300 text-sm"
            >
              Select API Key
            </button>
          )}
           {apiKeyPromptVisible && (
            <p className="mt-2 text-xs">
              Learn more about billing at{' '}
              <a
                href="https://ai.google.dev/gemini-api/docs/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-800 underline hover:text-red-900"
              >
                ai.google.dev/gemini-api/docs/billing
              </a>
            </p>
          )}
        </div>
      )}

      <div ref={scrollRef} className="h-80 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 text-left">
        {chatHistory.map((turn, index) => (
          <div key={index} className={`mb-2 ${turn.speaker === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg max-w-[80%] ${
              turn.speaker === 'user' ? 'bg-indigo-100 text-indigo-800' :
              'bg-green-100 text-green-800' // For 'Anna'
            }`}>
              <strong className="font-semibold">{turn.speaker === 'user' ? 'You' : 'Anna'}:</strong> {turn.text}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="mb-2 text-left animate-pulse">
            <span className="inline-block p-2 rounded-lg bg-gray-200 text-gray-800 opacity-75 max-w-[80%]">
              <strong className="font-semibold">Anna Thinking:</strong> ...
            </span>
          </div>
        )}
      </div>

      <div className="text-center mb-4">
        <p className="text-sm text-gray-600 italic" role="status" aria-live="polite">{statusMessage}</p>
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <textarea
          className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={2}
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder="Ask Anna about this principle..."
          disabled={isLoading || apiKeyPromptVisible}
          aria-label={`Ask Anna about ${principle.title}`}
        ></textarea>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || !currentInput.trim() || apiKeyPromptVisible}
          aria-label="Send message"
        >
          Send
        </button>
      </form>

      <div className="flex justify-center mt-4 space-x-4">
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-full shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-red-300"
          aria-label="Close Deep Dive Chat"
          disabled={isLoading}
        >
          Close Deep Dive
        </button>
      </div>
    </div>
  );
};

export default DeepDiveChat;