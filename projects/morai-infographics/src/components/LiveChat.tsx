import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { ChatTurn } from '../types';
import { useLanguage } from '../context/LanguageContext'; // Import useLanguage

// Helper functions for audio encoding/decoding as per guidelines
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

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helper function to render text with clickable links
const renderTextWithClickableLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}\b(?:\/[^\s]*)?)/gi;
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;

  text.replace(urlRegex, (match, p1, p2, p3, offset) => {
    if (offset > lastIndex) {
      parts.push(text.substring(lastIndex, offset));
    }

    let href = match;
    if (p1) {
      href = p1;
    } else if (p2) {
      href = `https://${p2}`;
    } else if (p3) {
      href = `https://${p3}`;
    }

    parts.push(
      <a 
        key={offset}
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-600 hover:underline break-all"
        style={{ pointerEvents: 'auto' }}
      >
        {match}
      </a>
    );
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
};

interface LiveChatProps {
  onCloseChat: () => void;
}

const LiveChat: React.FC<LiveChatProps> = ({ onCloseChat }) => {
  const { t, getInitialAnnaPrompt, getSystemInstruction } = useLanguage(); // Use useLanguage hook

  const [isChatActive, setIsChatActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState(t('statusInitializing'));
  const [currentInputTranscription, setCurrentInputTranscription] = useState('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ChatTurn[]>([]);
  const [apiKeyPromptVisible, setApiKeyPromptVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef(0);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const outputGainNodeRef = useRef<GainNode | null>(null);
  const pendingAudioQueueRef = useRef<AudioBuffer[]>([]);


  const transcriptionHistoryRef = useRef<ChatTurn[]>([]);
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, currentInputTranscription, currentOutputTranscription]);

  const closeSession = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then((session) => {
        if (session && typeof session.close === 'function') {
          session.close();
        }
      }).catch(console.error);
      sessionPromiseRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close().catch(console.error);
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close().catch(console.error);
      outputAudioContextRef.current = null;
    }
    outputSourcesRef.current.forEach(source => source.stop());
    outputSourcesRef.current.clear();
    pendingAudioQueueRef.current = [];

    nextStartTimeRef.current = 0;
    setCurrentInputTranscription('');
    setCurrentOutputTranscription('');
    setConversationHistory([]);
    transcriptionHistoryRef.current = [];
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    setStatusMessage(t('statusInitializing'));
    setIsPlaying(true);
  }, [t]);

  // Auto-start chat when component mounts
  useEffect(() => {
    if (!isChatActive) {
      startChat();
    }

    return () => {
      stopChat();
    };
  }, []); // Empty dependency array ensures this runs once on mount and once on unmount


  const handleApiKeySelection = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setApiKeyPromptVisible(false);
      setStatusMessage(t('statusApiKeySelected'));
    } else {
      setStatusMessage(t('statusFailedToStart', 'API Key selection tool not available.'));
    }
  };

  const scheduleAudioPlayback = useCallback((audioBuffer: AudioBuffer) => {
    if (!outputAudioContextRef.current || !outputGainNodeRef.current) return;

    const outputAudioCtx = outputAudioContextRef.current;
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtx.currentTime);

    const sourceNode = outputAudioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(outputGainNodeRef.current);
    sourceNode.addEventListener('ended', () => {
      outputSourcesRef.current.delete(sourceNode);
      if (outputSourcesRef.current.size === 0 && pendingAudioQueueRef.current.length === 0 && isPlaying) {
        setStatusMessage(t('statusListening'));
      }
    });

    sourceNode.start(nextStartTimeRef.current);
    nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
    outputSourcesRef.current.add(sourceNode);
    setStatusMessage(t('statusAnnaSpeaking'));
  }, [isPlaying, t]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prevIsPlaying => {
      const newIsPlaying = !prevIsPlaying;
      if (!outputAudioContextRef.current) return newIsPlaying;

      if (!newIsPlaying) {
        outputSourcesRef.current.forEach(sourceNode => {
          sourceNode.stop();
          outputSourcesRef.current.delete(sourceNode);
        });
        setStatusMessage(t('statusPaused'));
        outputAudioContextRef.current.suspend().catch(console.error);
      } else {
        outputAudioContextRef.current.resume().catch(console.error);
        nextStartTimeRef.current = outputAudioContextRef.current.currentTime;

        while (pendingAudioQueueRef.current.length > 0) {
          const audioBuffer = pendingAudioQueueRef.current.shift();
          if (audioBuffer) {
            scheduleAudioPlayback(audioBuffer);
          }
        }
        if (currentOutputTranscriptionRef.current || outputSourcesRef.current.size > 0) {
          setStatusMessage(t('statusAnnaSpeaking'));
        } else {
          setStatusMessage(t('statusListening'));
        }
      }
      return newIsPlaying;
    });
  }, [scheduleAudioPlayback, t]);

  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (outputGainNodeRef.current) {
      outputGainNodeRef.current.gain.value = newVolume;
    }
  }, []);

  const stopChat = useCallback(() => {
    setIsChatActive(false);
    closeSession();
  }, [closeSession]);

  const startChat = async () => {
    closeSession();

    setIsChatActive(true);
    setIsPlaying(true);
    setStatusMessage(t('statusConnecting'));
    setApiKeyPromptVisible(false);

    try {
      // Check if API key is available (either from env or AI Studio)
      const apiKey = import.meta.env.VITE_API_KEY;

      if (!apiKey) {
        // Only check AI Studio if environment variable is not available
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) {
            setStatusMessage(t('statusNoApiKey'));
            setApiKeyPromptVisible(true);
            setIsChatActive(false);
            return;
          }
        } else {
          // No API key available from either source
          setStatusMessage(t('statusNoApiKey'));
          setApiKeyPromptVisible(true);
          setIsChatActive(false);
          return;
        }
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioContextRef.current = inputAudioCtx;
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioContextRef.current = outputAudioCtx;

      if (inputAudioCtx.state === 'suspended') {
        await inputAudioCtx.resume();
      }
      if (outputAudioCtx.state === 'suspended') {
        await outputAudioCtx.resume();
      }

      const outputGainNode = outputAudioCtx.createGain();
      outputGainNodeRef.current = outputGainNode;
      outputGainNode.connect(outputAudioCtx.destination);
      outputGainNode.gain.value = volume;

      const initialAnnaPrompt = getInitialAnnaPrompt(); // Use localized prompt
      setStatusMessage(t('statusAnnaIntroReady'));
      try {
        const initialResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: initialAnnaPrompt }] }],
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
            
            if (isPlaying) {
              setConversationHistory([{ speaker: 'Anna', text: initialAnnaPrompt }]);
              transcriptionHistoryRef.current = [{ speaker: 'Anna', text: initialAnnaPrompt }];
              scheduleAudioPlayback(initialAudioBuffer);
            } else {
              setConversationHistory([{ speaker: 'Anna', text: initialAnnaPrompt }]);
              transcriptionHistoryRef.current = [{ speaker: 'Anna', text: initialAnnaPrompt }];
              pendingAudioQueueRef.current.push(initialAudioBuffer);
            }
            console.log("Anna's introduction audio scheduled.");
        } else {
            throw new Error("No audio data received for Anna's introduction.");
        }
      } catch (error) {
          console.error("Error generating or processing Anna's introduction via TTS:", error);
          setStatusMessage(t('statusFailedToStart', 'Could not play introduction audio. Displaying text instead.'));
          setConversationHistory([{ speaker: 'Anna', text: initialAnnaPrompt }]);
          transcriptionHistoryRef.current = [{ speaker: 'Anna', text: initialAnnaPrompt }];
      }

      const source = inputAudioCtx.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;
      const scriptProcessor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const pcmBlob = createBlob(inputData);
        sessionPromiseRef.current?.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
        }).catch((e: any) => {
          console.error("Error sending input:", e);
          setStatusMessage(t('apiKeyIssueTitle'));
          setApiKeyPromptVisible(true);
          stopChat();
        });
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(inputAudioCtx.destination);

      const systemInstruction = getSystemInstruction(); // Use localized system instruction

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.debug('Live API session opened.');
            if (!currentOutputTranscriptionRef.current && isPlaying) {
              setStatusMessage(t('statusListening'));
            } else if (!isPlaying) {
              setStatusMessage(t('statusPaused'));
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
              setCurrentOutputTranscription(currentOutputTranscriptionRef.current);
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
              setCurrentInputTranscription(currentInputTranscriptionRef.current);
            }

            if (message.serverContent?.turnComplete) {
              const fullInputTranscription = currentInputTranscriptionRef.current.trim();
              const fullOutputTranscription = currentOutputTranscriptionRef.current.trim();

              if (fullInputTranscription) {
                transcriptionHistoryRef.current.push({ speaker: 'user', text: fullInputTranscription });
              }
              if (fullOutputTranscription) {
                transcriptionHistoryRef.current.push({ 
                  speaker: 'Anna', 
                  text: fullOutputTranscription, 
                });
              }

              setConversationHistory([...transcriptionHistoryRef.current]);

              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
              setCurrentInputTranscription('');
              setCurrentInputTranscription('');

              if (isPlaying) {
                setStatusMessage(t('statusListening'));
              } else {
                setStatusMessage(t('statusPaused'));
              }
            }

            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString && outputAudioContextRef.current) {
              try {
                const audioBuffer = await decodeAudioData(
                  decode(base64EncodedAudioString),
                  outputAudioContextRef.current,
                  24000,
                  1,
                );

                if (isPlaying) {
                  scheduleAudioPlayback(audioBuffer);
                } else {
                  pendingAudioQueueRef.current.push(audioBuffer);
                }
              } catch (audioDecodeError) {
                console.error("Error decoding audio data:", audioDecodeError);
                setStatusMessage(t('statusError', 'Error processing audio response.'));
              }
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              outputSourcesRef.current.forEach(sourceNode => {
                sourceNode.stop();
                outputSourcesRef.current.delete(sourceNode);
              });
              pendingAudioQueueRef.current = [];
              nextStartTimeRef.current = 0;
              setStatusMessage(t('statusInterrupted'));
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live API Error:', e);
            setStatusMessage(t('statusError', e.message));
            setIsChatActive(false);
            setApiKeyPromptVisible(true);
            stopChat();
          },
          onclose: (e: CloseEvent) => {
            console.debug('Live API Closed:', e);
            if (isChatActive) {
              setStatusMessage(t('statusConversationEnded'));
            } else {
              setStatusMessage(t('statusSessionClosed'));
            }
            setIsChatActive(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Kore'}},
          },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{googleSearch: {}}],
        },
      });

    } catch (error: any) {
      console.error("Failed to start Live API session:", error);
      setStatusMessage(t('statusFailedToStart', error.message || 'Unknown error'));
      setIsChatActive(false);
      setApiKeyPromptVisible(true);
      stopChat();
    }
  };


  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-2xl mx-auto border border-indigo-200">
      <h2 className="text-2xl font-bold text-indigo-700 mb-4 text-center">{t('aiConversationTitle')}</h2>

      <div ref={scrollRef} className="h-80 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 text-left">
        {conversationHistory.length === 0 && !isChatActive && !apiKeyPromptVisible && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center italic">{t('waitingToConnect')}</p>
          </div>
        )}
        {isChatActive && conversationHistory.length === 0 && !apiKeyPromptVisible ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="animate-spin h-8 w-8 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            <p className="text-lg font-semibold text-indigo-700">{statusMessage}</p>
            <p className="text-gray-500 text-sm mt-1">{t('thisMayTakeASeconds')}</p>
          </div>
        ) : null}
        {conversationHistory.map((turn, index) => (
          <div key={index} className={`mb-2 ${turn.speaker === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg max-w-[80%] ${
              turn.speaker === 'user' ? 'bg-indigo-100 text-indigo-800' :
              'bg-green-100 text-green-800'
            }`}>
              <strong className="font-semibold">{turn.speaker === 'user' ? t('you') : t('anna')}:</strong> {renderTextWithClickableLinks(turn.text)}
            </span>
          </div>
        ))}
        {currentInputTranscription && (
          <div className="mb-2 text-right animate-pulse">
            <span className="inline-block p-2 rounded-lg bg-indigo-100 text-indigo-800 opacity-75 max-w-[80%]">
              <strong className="font-semibold">{t('you')}:</strong> {currentInputTranscription}
            </span>
          </div>
        )}
        {currentOutputTranscription && (
          <div className="mb-2 text-left animate-pulse">
            <span className="inline-block p-2 rounded-lg bg-gray-200 text-gray-800 opacity-75 max-w-[80%]">
              <strong className="font-semibold">{t('annaSpeaking')}:</strong> {currentOutputTranscription}
            </span>
          </div>
        )}
      </div>

      <div className="text-center mb-4">
        <p className="text-sm text-gray-600 italic" role="status" aria-live="polite">{statusMessage}</p>
      </div>

      <div className="flex justify-center gap-4 items-center mb-4">
        <button
          onClick={togglePlayPause}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-gray-300"
          aria-label={isPlaying ? t('pauseAudio') : t('playAudio')}
          disabled={!isChatActive}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        <div className="flex items-center gap-2">
          <label htmlFor="volume-slider" className="sr-only">{t('volumeControl')}</label>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.616 5.06a1 1 0 01.121 1.403A6.974 6.974 0 0016 10c0 2.378-.85 4.54-2.264 6.257a1 1 0 01-1.48-1.304A4.978 4.978 0 0114 10c0-1.577-.53-3.003-1.404-4.184a1 1 0 011.291-1.556zM16.924 3.08a1 1 0 01.12 1.412A9.002 9.002 0 0019 10c0 3.25-.978 6.208-2.656 8.006a1 1 0 01-1.536-1.298A7.003 7.003 0 0117 10c0-2.697-.837-5.174-2.273-7.258a1 1 0 011.203-1.522z" clipRule="evenodd" />
          </svg>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer range-sm"
            aria-label={t('volumeControl')}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={volume}
            disabled={!isChatActive}
          />
        </div>
      </div>

      <div className="flex justify-center gap-4">
        {isChatActive ? (
          <button
            onClick={() => { stopChat(); onCloseChat(); }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-full shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-red-300"
            aria-label={t('endConversation')}
          >
            {t('endConversation')}
          </button>
        ) : (
          apiKeyPromptVisible && (
            <button
              onClick={handleApiKeySelection}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-yellow-300"
            >
              {t('selectApiKey')}
            </button>
          )
        )}
      </div>

      {apiKeyPromptVisible && (
        <div role="alert" className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded-lg border border-yellow-300 text-center">
          <p className="mb-2">{t('apiKeyIssueMessage')}</p>
          <p className="mt-2 text-sm">
            {t('learnMoreBilling')}{' '}
            <a
              href="https://ai.google.dev/gemini-api/docs/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-800 underline hover:text-yellow-900"
            >
              ai.google.dev/gemini-api/docs/billing
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveChat;