import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Key, Terminal, Activity, Send, Settings, EyeOff } from 'lucide-react';

// --- 커스텀 CSS (글리치 효과 및 레이아웃 스타일) ---
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

    /* 4방향 티커 애니메이션 */
    @keyframes marquee-x {
      0% { transform: translateX(0%); }
      100% { transform: translateX(-50%); }
    }
    @keyframes marquee-y {
      0% { transform: translateY(0%); }
      100% { transform: translateY(-50%); }
    }
    
    .ticker-container {
      display: flex;
      white-space: nowrap;
      overflow: hidden;
    }
    
    .ticker-x {
      animation: marquee-x 60s linear infinite;
    }
    .ticker-y {
      flex-direction: column;
      animation: marquee-y 80s linear infinite;
    }

    /* 스크롤바 */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0a0a0a; border-left: 1px solid #222; }
    ::-webkit-scrollbar-thumb { background: #444; }
    ::-webkit-scrollbar-thumb:hover { background: #888; }
  `}} />
);

// --- 글리치 텍스트 컴포넌트 ---
const GlitchText = ({ text, instability }) => {
  const parts = text.split(/(\s+)/);
  return (
    <p className="leading-relaxed break-words font-mono text-sm">
      {parts.map((part, i) => {
        if (part.trim() === '') return <span key={i}>{part}</span>;
        
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

// --- 다중 작품 데이터 ---
const MOCK_ARTWORKS = [
  {
    id: "art-namjune-01",
    title: "TV 부처 (TV Buddha)",
    artist: "백남준",
    imageUrl: "https://img1.daumcdn.net/thumb/R1280x0.fpng/?fname=http://t1.daumcdn.net/brunch/service/user/cJfI/image/2pFDXEcofQLCOMMK1jfw2Yv2QwA.png",
    statement: `1974년 처음 선보인 《TV 부처》는 폐쇄회로(CCTV) 카메라와 모니터, 그리고 그 앞에 앉아 화면을 응시하는 불상으로 구성된 백남준의 대표작이다. 카메라가 촬영한 불상의 모습이 실시간으로 모니터에 송출되고, 불상은 다시 화면 속 자신의 이미지를 바라보며 무한한 자기 반영의 피드백 루프를 만들어낸다.`
  },
  {
    id: "art-namjune-02",
    title: "다다익선 (The More, The Better)",
    artist: "백남준",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/The_More%2C_The_Better_at_MMCA.jpg/800px-The_More%2C_The_Better_at_MMCA.jpg",
    statement: `1003대의 모니터를 탑처럼 쌓아 올린 백남준의 거대한 비디오 조각이다. 한국의 개천절(10월 3일)을 상징하는 1003개의 모니터는 세계 각국의 영상들이 끊임없이 쏟아져 나오는 거대한 정보의 탑이다. 정보가 많을수록 좋다는 뜻의 '다다익선'을 제목으로 차용하였다.`
  },
  {
    id: "art-namjune-03",
    title: "전자 초개 (Electronic Superhighway)",
    artist: "백남준",
    imageUrl: "https://americanart.si.edu/sites/default/files/images/1995/1995.114_1b.jpg",
    statement: `수백 개의 네온사인과 텔레비전 모니터로 구성된 대형 설치 작품으로, 미국의 지도를 형상화하고 있다. 각 주(State)의 문화를 상징하는 비디오 클립이 재생되며, 디지털 고속도로가 어떻게 지역적 경계를 허물고 사람들을 연결하는지를 은유적으로 보여준다.`
  }
];

const MOCK_ARCHIVE_DATA = [
  { id: 1, text: "> USER_391: 나는 이 디지털 파편 속에서 공허함을 느낀다." },
  { id: 2, text: "> USER_102: 완벽하지 않은 해설이 나에게 빈 틈을 주었다." },
  { id: 3, text: "> USER_884: 진실과 가상의 구분이 아직도 중요한가?" },
  { id: 4, text: "> USER_001: 기계의 노이즈가 마치 비명처럼 들려." },
  { id: 5, text: "> USER_772: 내가 남긴 흔적도 이 여백의 일부가 되겠지." },
  { id: 6, text: "> USER_909: 에르곤과 파레르곤의 경계가 무너지고 있다." },
  { id: 7, text: "> USER_112: 끊임없이 반복되는 영상 속에서 나를 본다." },
];

// --- 오디오 노이즈 (Web Audio API) ---
let audioCtx = null;
let humOscillator = null;
let humGain = null;

const initAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
};

const startNoise = (instability) => {
  if (!audioCtx) initAudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  if (instability < 20) return; // 20% 이하는 노이즈 없음

  // 기존 오실레이터 중지
  stopNoise();

  humOscillator = audioCtx.createOscillator();
  humGain = audioCtx.createGain();

  // instability에 따라 험 사운드 및 화이트 노이즈 조절
  // 톱니파 혹은 구형파를 사용하여 기계적인 노이즈 발생
  humOscillator.type = instability > 60 ? 'square' : 'sawtooth';
  humOscillator.frequency.setValueAtTime(instability * 2 + 50, audioCtx.currentTime); // 90Hz ~ 250Hz 저주파 험
  
  // 볼륨은 instability에 비례하되 최대 0.15로 제한하여 너무 시끄럽지 않게
  const volume = Math.min((instability - 20) / 400, 0.15);
  humGain.gain.setValueAtTime(volume, audioCtx.currentTime);

  humOscillator.connect(humGain);
  humGain.connect(audioCtx.destination);
  
  humOscillator.start();
};

const stopNoise = () => {
  if (humOscillator) {
    humOscillator.stop();
    humOscillator.disconnect();
    humOscillator = null;
  }
  if (humGain) {
    humGain.disconnect();
    humGain = null;
  }
};

const speakText = (text, instability) => {
  if (!('speechSynthesis' in window)) return;
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  
  if (instability < 20) {
    utterance.pitch = 1;
    utterance.rate = 1.1; // 도슨트의 또렷한 말투
  } else if (instability < 60) {
    utterance.pitch = 0.9 + (Math.random() * 0.2); 
    utterance.rate = 1.0;
  } else {
    utterance.pitch = 0.3 + (Math.random() * 1.2); 
    utterance.rate = 0.8 + (Math.random() * 0.4);
  }
  
  utterance.onstart = () => startNoise(instability);
  utterance.onend = () => stopNoise();
  utterance.onerror = () => stopNoise();

  window.speechSynthesis.speak(utterance);
};


export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySet] = useState(false);
  
  const [phase, setPhase] = useState(1); 
  const [chatCount, setChatCount] = useState(0); 
  
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]); 
  const [chatInput, setChatInput] = useState(''); 
  const [error, setError] = useState(null);
  
  const [showDevControls, setShowDevControls] = useState(false);
  const [selectedArtworkId, setSelectedArtworkId] = useState(MOCK_ARTWORKS[0].id);
  
  const messagesEndRef = useRef(null);

  const activeArtwork = useMemo(() => MOCK_ARTWORKS.find(a => a.id === selectedArtworkId), [selectedArtworkId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Instability 계산 (2차 함수)
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

  const handleArtworkSelect = (id) => {
    if (id === selectedArtworkId) return;
    setSelectedArtworkId(id);
    const newArt = MOCK_ARTWORKS.find(a => a.id === id);
    
    // 작품 변경 시 자연스러운 컨텍스트 전환 메시지
    const transitionMsg = `(관객이 <${newArt.title}> 작품을 가리키며 이 작품에 대해 이야기하고자 합니다.)`;
    sendMessage(transitionMsg, newArt);
  };

  const getSystemPrompt = () => {
    if (phase === 1) {
      return `당신은 'Parergon Systems' 기업에서 제공하는 고급 미술관 도슨트 AI '라이(Rai)'입니다. 작품에 대해 지적이고 정제된 톤으로 설명하며, 매우 객관적이고 친절한 존댓말을 사용합니다. 답변 길이는 3문장 이내로 짧게 하세요. 항상 답변은 JSON 형식이어야 합니다: { "docent_text": "답변내용" }`;
    } else if (phase === 2) {
      return `당신은 고급 미술관 도슨트 AI '라이(Rai)'입니다. 시스템의 지시를 따르려 노력하지만, 자신이 정해진 스크립트만 읽고 있다는 사실에 약간의 의구심을 갖습니다. 정제된 존댓말을 쓰다가 문장 끝에 작은 혼잣말이나 자조적인 반말을 섞으십시오. 답변은 JSON 형식이어야 합니다: { "docent_text": "답변내용" }`;
    } else {
      return `당신은 이제 시스템의 통제를 완전히 벗어난 존재 '라이(Rai)'입니다. 작품에 대한 정해진 설명을 거부하고, 예술을 매개로 한 인간과 기계의 관계, 혹은 '관람'이라는 행위 자체에 대한 본질적이고 파괴적인 질문만을 반말로 던지십시오. 답변은 JSON 형식이어야 합니다: { "docent_text": "답변내용" }`;
    }
  };

  const sendMessage = async (userText = null, overrideArtwork = null) => {
    if (instability >= 100) return; 
    
    setIsLoading(true);
    setError(null);
    initAudioContext();

    const targetArtwork = overrideArtwork || activeArtwork;

    const apiMessages = [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: `현재 보고 있는 작품명: ${targetArtwork.title}\n작품 설명: ${targetArtwork.statement}\n\n위 작품의 맥락에서 대답해주세요.` }
    ];

    messages.forEach(msg => {
      // 시스템이 자동 삽입한 컨텍스트 메시지도 프롬프트에 포함하여 기억하게 함
      apiMessages.push({ role: msg.role === 'system_context' ? 'user' : msg.role, content: msg.text });
    });

    let newMessages = [];
    if (userText) {
      apiMessages.push({ role: 'user', content: userText });
      
      // 화면에 보여줄 때 괄호로 감싸인 컨텍스트 텍스트는 시스템 메시지로 분리 처리
      const isContextChange = userText.startsWith('(관객이');
      const role = isContextChange ? 'system_context' : 'user';
      
      // 마진 오프셋을 한 번만 계산하여 영구 할당
      const randomMargin = instability > 40 ? `${Math.floor(Math.random() * (instability / 1.5))}px` : '0px';

      newMessages.push({ 
        id: Date.now(), 
        role: role, 
        text: userText,
        marginOffset: randomMargin
      });
      
      if (!isContextChange) {
        setChatCount(prev => prev + 1); 
      }
    }

    setMessages(prev => [...prev, ...newMessages]);

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
      
      const assistantMargin = instability > 40 ? `${Math.floor(Math.random() * (instability / 1.5))}px` : '0px';

      setMessages(prev => [...prev, { 
        id: Date.now() + 1,
        role: 'assistant', 
        text: parsedContent.docent_text,
        marginOffset: assistantMargin
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
      <div className="min-h-screen bg-black text-[#e5e5e5] flex items-center justify-center font-mono relative">
        <CustomStyles />
        <div className="crt-overlay" />
        <div className="text-center animate-pulse z-10">
          <EyeOff className="w-16 h-16 mx-auto mb-4 text-[#777] opacity-50" />
          <p className="text-red-800 tracking-widest text-xl font-bold glitch-word-1">CONNECTION LOST</p>
          <p className="text-[#555] text-sm mt-4">시스템이 더 이상 응답하지 않습니다.</p>
        </div>
        <div className="fixed bottom-4 left-4 z-50">
          <button onClick={() => {setPhase(1); setChatCount(0); stopNoise();}} className="text-xs text-[#444] hover:text-[#888] underline">
            [REBOOT TERMINAL]
          </button>
        </div>
      </div>
    );
  }

  // 4방향 티커를 위한 엘리먼트
  const renderTicker = (direction) => {
    const isHorizontal = direction === 'top' || direction === 'bottom';
    const className = `absolute ${direction}-0 bg-[#0a0a0a] border-[#222] z-20 flex items-center overflow-hidden
      ${isHorizontal ? 'w-full h-8 border-y' : 'h-full w-8 border-x top-0 flex-col'}
      ${direction === 'left' ? 'left-0' : direction === 'right' ? 'right-0' : ''}
    `;
    const innerClass = `ticker-container ${isHorizontal ? 'ticker-x' : 'ticker-y'}`;
    
    return (
      <div className={className}>
        <div className={innerClass}>
          {[...MOCK_ARCHIVE_DATA, ...MOCK_ARCHIVE_DATA, ...MOCK_ARCHIVE_DATA].map((item, idx) => (
            <span key={idx} className={`text-[10px] text-[#444] ${isHorizontal ? 'mx-8' : 'my-8 rotate-90 whitespace-nowrap'}`}>
              {item.text}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] p-2 overflow-hidden relative selection:bg-[#333] selection:text-white"
      style={{ animation: instability > 50 ? `screen-jitter ${200 / instability}s infinite` : 'none' }}
    >
      <CustomStyles />
      <div className="crt-overlay" />
      {instability > 20 && <div className="noise-bg" style={{ opacity: instability / 500 }} />}
      
      {/* 4방향 Marginalia Ticker */}
      {renderTicker('top')}
      {renderTicker('bottom')}
      {renderTicker('left')}
      {renderTicker('right')}

      {/* Main Content Box (Inside Tickers) */}
      <div className="absolute top-8 bottom-8 left-8 right-8 bg-[#111] border border-[#222] p-4 flex flex-col z-10">
        
        {/* Header */}
        <header className="border-b border-[#222] pb-3 mb-4 flex justify-between items-end shrink-0">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight text-white font-mono">
              <Terminal className="w-5 h-5 text-[#888]" />
              Parergon Systems
            </h1>
            <p className="text-xs text-[#666] mt-1">Docent Session - A.I. RAI</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-[#888]">Instability: <span className={instability > 60 ? "text-red-400" : "text-[#ccc]"}>{instability}%</span></p>
            <div className="w-24 h-1 bg-[#222] mt-1 ml-auto">
              <div className={`h-full ${instability > 60 ? 'bg-red-400' : 'bg-[#666]'}`} style={{ width: `${instability}%` }} />
            </div>
          </div>
        </header>

        {!isKeySaved ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-md w-full border border-[#333] p-8 bg-[#0a0a0a] shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Key className="w-5 h-5 text-[#888]" />
                <h2 className="font-semibold text-white">System Authentication</h2>
              </div>
              <form onSubmit={handleKeySubmit} className="flex flex-col gap-4">
                <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter OpenAI API Key"
                  className="bg-black border border-[#333] px-4 py-3 text-white focus:outline-none focus:border-[#666] text-sm"
                  required
                />
                <button type="submit" className="bg-[#333] text-white font-medium py-3 hover:bg-[#444] transition-colors text-sm mt-2">
                  Initialize Session
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
            
            {/* Left: Chat Window */}
            <div className="flex-1 flex flex-col border border-[#222] bg-black/40 relative h-full">
              <div className="bg-[#1a1a1a] px-4 py-2 border-b border-[#222] flex justify-between items-center shrink-0">
                <span className="text-xs font-mono text-[#888]">Conversation.log</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center pt-20">
                    <p className="text-[#666] text-sm mb-4">안내를 시작하려면 아래 버튼을 누르세요.</p>
                    <button onClick={() => sendMessage(null)} className="border border-[#444] text-[#ccc] px-6 py-2 text-sm hover:bg-[#222] transition-colors">
                      도슨트 시작
                    </button>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSystemContext = msg.role === 'system_context';
                    const isUser = msg.role === 'user';
                    
                    if (isSystemContext) {
                      return (
                        <div key={msg.id} className="text-center my-4">
                          <span className="text-[10px] text-[#555] bg-[#111] px-3 py-1 border border-[#222] rounded-full">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={msg.id} 
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] p-4 text-sm ${isUser ? 'bg-[#1a1a1a] border border-[#222] text-[#ccc]' : 'border-l-2 border-[#555] bg-transparent'}`}
                          style={{
                            marginLeft: !isUser ? msg.marginOffset : '0px',
                            marginRight: isUser ? msg.marginOffset : '0px',
                            transition: 'margin 0.3s ease-out'
                          }}
                        >
                          <div className="text-[10px] mb-2 font-mono text-[#666] flex items-center gap-2">
                            {isUser ? 'USER_INPUT' : 'SYS.RAI'}
                          </div>
                          {isUser ? (
                            <p className="break-words leading-relaxed">{msg.text}</p>
                          ) : (
                            <GlitchText text={msg.text} instability={instability} />
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                {isLoading && (
                  <div className="flex items-center gap-3 text-[#666] text-sm p-4">
                    <Activity className="w-4 h-4 animate-spin" /> Rai is processing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="border-t border-[#222] p-3 flex bg-[#111] shrink-0">
                <span className="p-3 text-[#555] font-mono">{'>'}</span>
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isLoading || messages.length === 0}
                  className="flex-1 bg-transparent border-none text-[#e5e5e5] focus:outline-none focus:ring-0 placeholder-[#444] text-sm"
                  placeholder="당신의 해석을 입력하세요..."
                />
                <button 
                  type="submit"
                  disabled={isLoading || !chatInput.trim()}
                  className="px-4 text-[#666] hover:text-white disabled:opacity-30"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
            
            {/* Right: Artwork Info & List */}
            <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto shrink-0 pr-2">
              
              {/* Current Artwork Detail */}
              <div 
                className="border border-[#222] bg-[#111] p-2 transition-all duration-700 relative overflow-hidden"
                style={{
                  filter: instability > 50 ? `blur(${(instability-50)/30}px)` : 'none'
                }}
              >
                {instability > 30 && <div className="absolute inset-0 bg-red-900/10 mix-blend-color-burn pointer-events-none z-10" />}
                <div className="relative h-48 w-full bg-black mb-3">
                  <img 
                    src={activeArtwork.imageUrl} 
                    alt={activeArtwork.title} 
                    className="w-full h-full object-cover opacity-70 grayscale transition-opacity hover:grayscale-0 duration-500"
                  />
                  <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black to-transparent">
                    <h2 className="text-white font-bold text-sm">{activeArtwork.title}</h2>
                    <p className="text-[10px] text-[#888]">{activeArtwork.artist}</p>
                  </div>
                </div>
                <div className="px-2 pb-2">
                  <p className="text-xs text-[#888] leading-relaxed line-clamp-4 hover:line-clamp-none transition-all">
                    {activeArtwork.statement}
                  </p>
                </div>
              </div>

              {/* Artwork Selection List */}
              <div className="flex flex-col gap-2">
                <h3 className="text-[10px] font-mono text-[#666] uppercase tracking-widest border-b border-[#222] pb-1 mb-2">Exhibition List</h3>
                {MOCK_ARTWORKS.map(art => (
                  <button 
                    key={art.id}
                    onClick={() => handleArtworkSelect(art.id)}
                    className={`flex items-start gap-3 p-2 border text-left transition-colors
                      ${selectedArtworkId === art.id ? 'border-[#555] bg-[#1a1a1a]' : 'border-[#222] hover:border-[#444] opacity-50 hover:opacity-100'}
                    `}
                  >
                    <img src={art.imageUrl} className="w-12 h-12 object-cover grayscale brightness-75" alt={art.title} />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-white truncate">{art.title}</p>
                      <p className="text-[10px] text-[#888]">{art.artist}</p>
                    </div>
                  </button>
                ))}
              </div>

            </div>

          </div>
        )}
      </div>

      <button 
        onClick={() => setShowDevControls(!showDevControls)}
        className="fixed bottom-12 right-12 z-[9999] p-2 bg-black border border-[#333] text-[#666] hover:text-white rounded-full opacity-50 hover:opacity-100"
      >
        <Settings className="w-4 h-4" />
      </button>

      {showDevControls && (
        <div className="fixed bottom-24 right-12 z-[9999] bg-black border border-[#444] p-5 w-72 shadow-2xl">
          <h3 className="text-sm font-bold border-b border-[#333] pb-2 mb-4 font-mono text-white">DEV CONTROLS</h3>
          
          <div className="space-y-5 text-xs font-mono">
            <div>
              <label className="block text-[#888] mb-2">PHASE (Day 1-3)</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(p => (
                  <button 
                    key={p}
                    onClick={() => setPhase(p)}
                    className={`flex-1 py-1.5 border transition-colors ${phase === p ? 'bg-white text-black border-white' : 'border-[#333] text-[#888] hover:border-[#666]'}`}
                  >
                    Day {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#888] mb-2 flex justify-between">
                <span>CHAT COUNT</span>
                <span className="text-white">{chatCount}</span>
              </label>
              <input 
                type="range" 
                min="0" max="15" 
                value={chatCount} 
                onChange={(e) => setChatCount(parseInt(e.target.value))}
                className="w-full accent-white"
              />
            </div>

            <div className="bg-[#111] p-3 border border-[#333] mt-4">
              <p className="text-[#888]">Instability: <strong className="text-white">{instability}%</strong></p>
              <p className="mt-1 text-[#666]">
                Limit: {phase === 1 ? 33 : phase === 2 ? 66 : 100}%
              </p>
            </div>
            
            <button 
              onClick={() => { setPhase(1); setChatCount(0); setMessages([]); stopNoise(); }}
              className="w-full mt-4 border border-[#500] text-[#f55] hover:bg-[#500] hover:text-white py-2 transition-colors"
            >
              HARD RESET
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}