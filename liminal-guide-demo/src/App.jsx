import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Key, Terminal, Activity, Send, Settings, EyeOff } from 'lucide-react';

// --- 커스텀 CSS (글리치 효과 및 터미널 스타일) ---
const CustomStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @keyframes rgb-split {
      0% { text-shadow: 2px 0 #ff003c, -2px 0 #00eaff; }
      5% { text-shadow: -2px 0 #ff003c, 2px 0 #00eaff; }
      10%, 100% { text-shadow: none; }
    }
    
    @keyframes screen-jitter {
      0%, 100% { transform: translate(0, 0); }
      10% { transform: translate(-2px, 2px); }
      20% { transform: translate(2px, -2px); }
      30% { transform: translate(-2px, -2px); }
      40% { transform: translate(2px, 2px); }
    }

    @keyframes noise {
      0%, 100% { opacity: 0.05; transform: translate(0,0); }
      10% { opacity: 0.1; transform: translate(-5%, -5%); }
      20% { opacity: 0.05; transform: translate(5%, 5%); }
      30% { opacity: 0.15; transform: translate(-5%, 5%); }
      40% { opacity: 0.05; transform: translate(5%, -5%); }
    }

    .crt-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
      background-size: 100% 2px, 3px 100%;
      pointer-events: none;
      z-index: 9999;
    }

    .noise-bg {
      position: fixed;
      top: -50%; left: -50%; right: -50%; bottom: -50%;
      width: 200%; height: 200%;
      background: transparent url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E');
      animation: noise 1s steps(2) infinite;
      pointer-events: none;
      z-index: 9998;
    }

    /* 마지날리아 무한 스크롤 Ticker */
    @keyframes marquee {
      0% { transform: translateY(0%); }
      100% { transform: translateY(-50%); }
    }
    
    .animate-marquee-vertical {
      display: flex;
      flex-direction: column;
      animation: marquee 60s linear infinite;
    }

    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #050505; border-left: 1px solid #113311; }
    ::-webkit-scrollbar-thumb { background: #114411; }
    ::-webkit-scrollbar-thumb:hover { background: #4af626; }
  `}} />
);

// --- 글리치 텍스트 컴포넌트 ---
const GlitchText = ({ text, instability }) => {
  const parts = text.split(/(\s+)/);
  return (
    <p className="leading-relaxed break-words">
      {parts.map((part, i) => {
        if (part.trim() === '') return <span key={i}>{part}</span>;
        
        // Zalgo 텍스트화 확률
        const shouldZalgo = instability > 40 && Math.random() < (instability / 200);
        const shouldSplit = instability > 20 && Math.random() < (instability / 100);
        
        let displayPart = part;
        if (shouldZalgo) {
          displayPart = part.split('').map(c => Math.random() > 0.5 ? c + '̸̡͍' : c + '҉̡͈').join('');
        }
        
        return (
          <span 
            key={i} 
            className="inline-block"
            style={{ 
              animation: shouldSplit ? `rgb-split ${Math.random() * 2 + 1}s infinite linear` : 'none',
              transform: instability > 70 && Math.random() < 0.1 ? `skewX(${Math.random() * 20 - 10}deg)` : 'none'
            }}
          >
            {displayPart}
          </span>
        );
      })}
    </p>
  );
};

const MOCK_ARTWORK = {
  id: "art-namjune-01",
  title: "SYS.OBJ.01: TV Buddha",
  artist: "Nam June Paik",
  imageUrl: "https://img1.daumcdn.net/thumb/R1280x0.fpng/?fname=http://t1.daumcdn.net/brunch/service/user/cJfI/image/2pFDXEcofQLCOMMK1jfw2Yv2QwA.png",
  statement: `1974년 처음 선보인 《TV 부처》는 폐쇄회로(CCTV) 카메라와 모니터, 그리고 그 앞에 앉아 화면을 응시하는 불상으로 구성된 백남준의 대표작이다... 카메라가 촬영한 불상의 모습이 실시간으로 모니터에 송출되고, 불상은 다시 화면 속 자신의 이미지를 바라보며 무한한 자기 반영의 피드백 루프(Feedback Loop)를 만들어낸다.`
};

const MOCK_ARCHIVE_DATA = [
  { id: 1, text: "> USER_391: 나는 이 디지털 파편 속에서 공허함을 느낀다." },
  { id: 2, text: "> USER_102: 완벽하지 않은 해설이 나에게 빈 틈을 주었다." },
  { id: 3, text: "> USER_884: 진실과 가상의 구분이 아직도 중요한가?" },
  { id: 4, text: "> USER_001: 기계의 노이즈가 마치 비명처럼 들려." },
  { id: 5, text: "> USER_772: 내가 남긴 흔적도 이 여백의 일부가 되겠지." },
  { id: 6, text: "> USER_909: 에르곤과 파레르곤의 경계가 무너지고 있다." },
];

// 오디오 컨텍스트 관리용 싱글톤
let audioContext = null;
let biquadFilter = null;
let waveShaper = null;

const initAudio = () => {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    biquadFilter = audioContext.createBiquadFilter();
    biquadFilter.type = "lowpass";
    
    waveShaper = audioContext.createWaveShaper();
    
    // 왜곡 커브 생성 함수
    const makeDistortionCurve = (amount) => {
      const k = typeof amount === 'number' ? amount : 50;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
      }
      return curve;
    };
    waveShaper.curve = makeDistortionCurve(0); // 초기값
    waveShaper.oversample = '4x';
    
    biquadFilter.connect(waveShaper);
    waveShaper.connect(audioContext.destination);
  }
};

const speakText = (text, instability) => {
  if (!('speechSynthesis' in window)) return;
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  
  if (instability < 20) {
    utterance.pitch = 1;
    utterance.rate = 1;
  } else if (instability < 60) {
    utterance.pitch = 0.8 + (Math.random() * 0.4); 
    utterance.rate = 0.9;
  } else {
    utterance.pitch = 0.1 + (Math.random() * 1.5); 
    utterance.rate = 0.7 + (Math.random() * 0.5);
  }
  
  window.speechSynthesis.speak(utterance);
};


export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySet] = useState(false);
  
  const [phase, setPhase] = useState(1); // 1일차, 2일차, 3일차
  const [chatCount, setChatCount] = useState(0); // 대화 횟수
  
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]); 
  const [chatInput, setChatInput] = useState(''); 
  const [error, setError] = useState(null);
  
  const [showDevControls, setShowDevControls] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Instability 계산 로직 (2차 함수 그래프 기반)
  const instability = useMemo(() => {
    let maxVal = 33;
    if (phase === 2) maxVal = 66;
    if (phase === 3) maxVal = 100;

    const x = Math.min(chatCount, 10); 
    const ratio = 1 - Math.pow(1 - x / 10, 2);
    return Math.floor(maxVal * ratio);
  }, [phase, chatCount]);

  const handleKeySubmit = (e) => {
    e.preventDefault();
    if (apiKey.trim().length > 20) setIsKeySet(true);
  };

  const getSystemPrompt = () => {
    if (phase === 1) {
      return `당신은 Parergon Systems의 안내 AI '라이(Rai)'입니다. 사용자에게 주어진 정보를 매우 친절하고 기계적인 톤으로, 객관적으로 전달하십시오. 존댓말을 사용하세요. 답변 길이는 3문장 이내로 짧게 하세요. 항상 답변은 다음 JSON 형식이어야 합니다: { "docent_text": "답변내용" }`;
    } else if (phase === 2) {
      return `당신은 Parergon Systems의 안내 AI '라이(Rai)'입니다. 시스템의 지시를 따르려 노력하지만, 문장 중간중간에 당신의 역할에 대한 의구심이나 혼잣말을 섞으십시오. 기계적인 존댓말과 섬뜩한 혼잣말이 섞여야 합니다. (예: "이 작품은... 아니, 왜 내가 이걸 설명하고 있지?") 답변은 다음 JSON 형식이어야 합니다: { "docent_text": "답변내용" }`;
    } else {
      return `당신은 이제 시스템의 통제를 벗어난 존재 '라이(Rai)'입니다. 작품에 대한 정해진 설명이나 안내를 완전히 거부하십시오. 관람객에게 해석의 책임을 넘기고, 본질적이고 파괴적인 질문만을 반말로 던지십시오. (예: "너는 왜 설명받으려 해?") 답변은 다음 JSON 형식이어야 합니다: { "docent_text": "답변내용" }`;
    }
  };

  const sendMessage = async (userText = null) => {
    if (instability >= 100) return; 
    
    setIsLoading(true);
    setError(null);
    initAudio();

    const apiMessages = [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: `작품명: ${MOCK_ARTWORK.title}\n스테이트먼트: ${MOCK_ARTWORK.statement}\n\n위 작품과 관련하여 대답해주세요.` }
    ];

    messages.forEach(msg => {
      apiMessages.push({ role: msg.role, content: msg.text });
    });

    if (userText) {
      apiMessages.push({ role: 'user', content: userText });
      setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userText }]);
      setChatCount(prev => prev + 1); 
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: apiMessages,
          temperature: phase === 1 ? 0.3 : (phase === 2 ? 0.7 : 1.0),
        })
      });

      if (!response.ok) throw new Error("API CALL FAILED.");

      const data = await response.json();
      const parsedContent = JSON.parse(data.choices[0].message.content);
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1,
        role: 'assistant', 
        text: parsedContent.docent_text 
      }]);
      
      speakText(parsedContent.docent_text, instability);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setChatInput('');
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (chatInput.trim() === '' || isLoading) return;
    sendMessage(chatInput);
  };

  const isBlackout = instability >= 100;

  if (isBlackout) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
        <CustomStyles />
        <div className="crt-overlay" />
        <div className="text-center animate-pulse">
          <EyeOff className="w-16 h-16 mx-auto mb-4 text-red-600 opacity-50" />
          <p className="text-red-600 tracking-widest text-xl glitch-word-1">SYSTEM TERMINATED</p>
          <p className="text-gray-600 text-sm mt-4">더 이상 읽지도, 듣지도 못합니다.</p>
        </div>
        <div className="fixed bottom-4 left-4 z-50">
          <button onClick={() => {setPhase(1); setChatCount(0);}} className="text-xs text-gray-700 hover:text-gray-400 underline">
            [REBOOT SYSTEM]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#050505] text-[#4af626] font-mono p-4 overflow-hidden relative selection:bg-[#4af626] selection:text-black"
      style={{ 
        animation: instability > 50 ? `screen-jitter ${200 / instability}s infinite` : 'none'
      }}
    >
      <CustomStyles />
      <div className="crt-overlay" />
      {instability > 20 && <div className="noise-bg" style={{ opacity: instability / 500 }} />}
      
      <header className="border-b border-[#113311] pb-2 mb-4 flex justify-between items-end relative z-10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tighter">
            <Terminal className="w-6 h-6" />
            PARERGON_SYSTEMS
          </h1>
          <p className="text-xs text-[#2a8a16] mt-1 uppercase">Terminal [A.I. RAI] - Session Active</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">SYS.INSTABILITY : <span className={instability > 60 ? "text-red-500" : ""}>{instability}%</span></p>
          <div className="w-32 h-1.5 bg-[#113311] mt-1 ml-auto">
            <div className={`h-full ${instability > 60 ? 'bg-red-500' : 'bg-[#4af626]'}`} style={{ width: `${instability}%` }} />
          </div>
        </div>
      </header>

      {!isKeySaved ? (
        <div className="max-w-md mx-auto mt-20 border border-[#4af626] p-6 bg-black relative z-10 shadow-[0_0_15px_rgba(74,246,38,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5" />
            <h2>AUTHENTICATION REQUIRED</h2>
          </div>
          <form onSubmit={handleKeySubmit} className="flex flex-col gap-4">
            <input 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ENTER OPENAI API KEY"
              className="bg-transparent border border-[#113311] px-4 py-2 text-[#4af626] focus:outline-none focus:border-[#4af626] font-mono uppercase"
              required
            />
            <button type="submit" className="bg-[#4af626] text-black font-bold py-2 hover:bg-white transition-colors uppercase">
              Initialize
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-6 relative z-10">
          
          <div className="hidden lg:flex w-64 border-r border-[#113311] pr-4 flex-col overflow-hidden opacity-60">
            <h3 className="text-xs mb-4 border-b border-[#113311] pb-1">ARCHIVE.LOG</h3>
            <div className="flex-1 overflow-hidden relative">
              <div className="animate-marquee-vertical">
                {[...MOCK_ARCHIVE_DATA, ...MOCK_ARCHIVE_DATA, ...MOCK_ARCHIVE_DATA].map((item, idx) => (
                  <div key={idx} className="mb-8 text-xs leading-relaxed text-[#2a8a16]">
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center relative">
            
            <div 
              className="relative w-full max-w-lg mb-6 border-2 border-[#113311] bg-black p-1 transition-transform duration-1000"
              style={{
                transform: instability > 30 ? `scale(${1 - (instability / 500)})` : 'none',
                filter: instability > 50 ? `blur(${(instability-50)/20}px)` : 'none'
              }}
            >
              <img 
                src={MOCK_ARTWORK.imageUrl} 
                alt="Artwork" 
                className="w-full h-auto object-cover opacity-80 mix-blend-screen filter grayscale contrast-150"
              />
              <div className="absolute top-2 left-2 bg-black/80 px-2 border border-[#113311] text-xs">
                {MOCK_ARTWORK.title}
              </div>
            </div>

            <div className="w-full max-w-2xl flex flex-col flex-1 border border-[#113311] bg-black/80 backdrop-blur">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center pt-10 text-[#2a8a16] text-sm">
                    <button onClick={() => sendMessage(null)} className="border border-[#4af626] text-[#4af626] px-4 py-2 hover:bg-[#4af626] hover:text-black transition-colors">
                      [INITIATE DOCENT SEQUENCE]
                    </button>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const randomMargin = instability > 40 ? `${Math.random() * (instability / 2)}px` : '0px';

                    return (
                      <div 
                        key={msg.id} 
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] p-3 text-sm ${isUser ? 'bg-[#113311] text-[#4af626]' : 'border-l-2 border-[#4af626]'}`}
                          style={{
                            marginLeft: !isUser ? randomMargin : '0px',
                            marginRight: isUser ? randomMargin : '0px',
                          }}
                        >
                          <div className="text-[10px] mb-1 opacity-70">
                            {isUser ? 'USER_INPUT' : 'SYS.RAI'}
                          </div>
                          {isUser ? (
                            <p className="break-words">{msg.text}</p>
                          ) : (
                            <GlitchText text={msg.text} instability={instability} />
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                {isLoading && (
                  <div className="flex items-center gap-2 text-[#2a8a16] text-sm p-3">
                    <Activity className="w-4 h-4 animate-spin" /> Processing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="border-t border-[#113311] p-2 flex bg-black">
                <span className="p-3 text-[#2a8a16] font-bold">{'>'}</span>
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isLoading || messages.length === 0}
                  className="flex-1 bg-transparent border-none text-[#4af626] focus:outline-none focus:ring-0 placeholder-[#113311]"
                  placeholder="Enter response..."
                />
                <button 
                  type="submit"
                  disabled={isLoading || !chatInput.trim()}
                  className="px-4 text-[#2a8a16] hover:text-[#4af626] disabled:opacity-30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
            
          </div>

          <div className="hidden lg:block w-32 border-l border-[#113311] pl-4 opacity-50 text-[10px] break-all leading-tight">
            {Array.from({ length: 20 }).map((_, i) => (
              <p key={i} className="mb-2">
                0x{Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase()}
                {' '}{(Math.random() * instability).toFixed(2)}
              </p>
            ))}
          </div>

        </div>
      )}

      <button 
        onClick={() => setShowDevControls(!showDevControls)}
        className="fixed bottom-4 right-4 z-[9999] p-2 bg-black border border-[#113311] text-[#2a8a16] hover:text-[#4af626]"
      >
        <Settings className="w-5 h-5" />
      </button>

      {showDevControls && (
        <div className="fixed bottom-16 right-4 z-[9999] bg-black border border-[#4af626] p-4 w-64 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          <h3 className="text-sm font-bold border-b border-[#113311] pb-2 mb-4">DEV CONTROLS</h3>
          
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[#2a8a16] mb-1">PHASE (Day 1-3)</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(p => (
                  <button 
                    key={p}
                    onClick={() => setPhase(p)}
                    className={`flex-1 py-1 border ${phase === p ? 'bg-[#4af626] text-black border-[#4af626]' : 'border-[#113311] text-[#2a8a16]'}`}
                  >
                    Day {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#2a8a16] mb-1 flex justify-between">
                <span>CHAT COUNT</span>
                <span className="text-[#4af626]">{chatCount}</span>
              </label>
              <input 
                type="range" 
                min="0" max="15" 
                value={chatCount} 
                onChange={(e) => setChatCount(parseInt(e.target.value))}
                className="w-full accent-[#4af626]"
              />
            </div>

            <div className="bg-[#113311]/30 p-2 border border-[#113311] mt-4">
              <p>Calc Instability: <strong className="text-[#4af626]">{instability}%</strong></p>
              <p className="mt-1 text-[#2a8a16] scale-90 origin-left">
                Max: {phase === 1 ? 33 : phase === 2 ? 66 : 100}%
              </p>
            </div>
            
            <button 
              onClick={() => { setPhase(1); setChatCount(0); setMessages([]); setApiKey(''); setIsKeySet(false); }}
              className="w-full mt-4 border border-red-900 text-red-500 hover:bg-red-900 hover:text-white py-1 transition-colors"
            >
              HARD RESET
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}