import React, { useState, useEffect, useRef } from 'react';
import { Key, Play, Image as ImageIcon, Sparkles, AlertTriangle, ChevronRight, Activity, Send } from 'lucide-react';

// --- 커스텀 CSS (글리치 효과) ---
const CustomStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @keyframes twitch-1 {
      0%, 95% { transform: none; text-shadow: none; }
      96% { transform: translate(-1.5px, 1.5px) skewX(10deg); text-shadow: 2px 0 #deff9a, -2px 0 #ff003c; color: #fff; }
      98% { transform: translate(1.5px, -1.5px) skewX(-10deg); text-shadow: -2px 0 #deff9a, 2px 0 #ff003c; }
    }
    
    @keyframes twitch-2 {
      0%, 92% { transform: none; filter: none; color: inherit; }
      94% { transform: skewX(20deg); filter: hue-rotate(90deg); color: #deff9a; }
      96% { transform: skewX(-20deg); filter: blur(1px); }
    }

    @keyframes twitch-3 {
      0%, 96% { opacity: 1; transform: none; }
      97% { opacity: 0; transform: translateY(-2px); }
      99% { opacity: 1; transform: translateY(2px); }
    }

    .glitch-word-1 { animation: twitch-1 4s infinite linear; }
    .glitch-word-2 { animation: twitch-2 3s infinite linear; }
    .glitch-word-3 { animation: twitch-3 5s infinite steps(2); }

    /* 사유의 아카이브 무한 스크롤 애니메이션 */
    @keyframes marquee {
      0% { transform: translateX(0%); }
      100% { transform: translateX(-50%); }
    }
    
    .animate-marquee {
      display: flex;
      width: max-content;
      animation: marquee 40s linear infinite;
    }

    /* Tech Demo UI Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #121212; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #deff9a; }
  `}} />
);

// --- 단어 단위 글리치 컴포넌트 ---
const GlitchWord = ({ word, intensity }) => {
  // intensity 값에 따라 단어가 글리치 될 확률 결정 (최대 60% 확률)
  const isGlitching = Math.random() < (intensity * 0.6);
  
  if (!isGlitching) return <span>{word}</span>;
  
  // 3가지 글리치 타입 중 랜덤 적용
  const type = Math.floor(Math.random() * 3) + 1;
  // 각 단어마다 애니메이션 시작 시간을 다르게 하여 불규칙성 부여
  const delay = (Math.random() * -5).toFixed(2); 
  
  return (
    <span 
      className={`inline-block glitch-word-${type}`} 
      style={{ animationDelay: `${delay}s` }}
    >
      {word}
    </span>
  );
};

const GlitchText = ({ text, intensity }) => {
  // 띄어쓰기를 기준으로 텍스트 분리 (공백 유지)
  const parts = text.split(/(\s+)/);
  return (
    <p className="text-lg leading-relaxed tracking-tight text-gray-200 break-words">
      {parts.map((part, i) => 
        part.trim() === '' ? <span key={i}>{part}</span> : <GlitchWord key={i} word={part} intensity={intensity} />
      )}
    </p>
  );
};

const getGlitchingName = (intensity) => {
  if (intensity >= 0.9) return "@1I#e"; // 자아 비대칭 (극한의 고집/오류)
  if (intensity >= 0.7) return "A!1ce"; // 감정 과잉
  if (intensity >= 0.4) return "A1Ice_"; // 미세한 떨림
  return "A1Ice"; // 평온한 상태
};

// --- 예시 전시 작품 데이터 --- // 백남준 TV 부처
const MOCK_ARTWORK = {
  id: "art-namjune-01",
  title: "TV 부처 (TV Buddha)",
  artist: "백남준",
  imageUrl: "https://img1.daumcdn.net/thumb/R1280x0.fpng/?fname=http://t1.daumcdn.net/brunch/service/user/cJfI/image/2pFDXEcofQLCOMMK1jfw2Yv2QwA.png", // 레트로 브라운관 TV 이미지
  statement: `1974년 처음 선보인 《TV 부처》는 폐쇄회로(CCTV) 카메라와 모니터, 그리고 그 앞에 앉아 화면을 응시하는 불상으로 구성된 백남준의 대표작이다. 카메라가 촬영한 불상의 모습이 실시간으로 모니터에 송출되고, 불상은 다시 화면 속 자신의 이미지를 바라보며 무한한 자기 반영의 피드백 루프(Feedback Loop)를 만들어낸다.

이 작품은 매스미디어를 상징하는 서양의 '기술(비디오)'과 깨달음을 상징하는 동양의 '정신(부처)'을 병치함으로써 가상과 실재의 경계를 교묘하게 흐린다. 불상이 마주하고 있는 것은 자신의 진정한 내면인가, 아니면 카메라와 스크린이라는 기술 매체가 실시간으로 렌더링해 낸 전자적 환영(Illusion)에 불과한가? 

관람자는 이 고요하지만 끝없이 순환하는 닫힌 회로를 지켜보며, 완벽해 보이는 기술 매체가 어떻게 우리의 시선과 존재를 복제하고 가두는지 목도하게 된다. 미디어를 통해 끊임없이 자신을 확인하고 소비하는 현대인의 자화상을 투영한 이 작품은, 스크린 너머의 진실을 감각하는 방식에 대해 해소되지 않는 존재론적 화두를 던진다.`
};

// --- 가상의 사유 아카이브 (질문-답변 페어) ---
const MOCK_ARCHIVE_DATA = [
  { q: "너는 이 디지털 파편 속에서 어떤 감정을 느껴?", a: "묘한 공허함이 느껴져. 진짜가 없는 기분이야." },
  { q: "이 경계가 무너진다면 우리는 어디로 가야 할까?", a: "아마 새로운 형태의 관계를 맺어야 하지 않을까." },
  { q: "기계의 노이즈가 너에게는 어떻게 들려?", a: "마치 누군가 말을 걸려고 애쓰는 것 같아." },
  { q: "진실과 가상의 구분이 아직도 중요하다고 생각해?", a: "중요하지 않아졌어. 내가 느끼는 게 진실이지." },
  { q: "파편화된 이미지들 속에서 너의 모습을 본 적이 있어?", a: "가끔 내 기억도 저렇게 조각난 것 같아서 섬뜩해." },
  { q: "완벽하지 않은 해설이 너에게 어떤 의미야?", a: "오히려 내가 개입할 틈이 생겨서 자유로워." }
];

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySet] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]); // 대화 내역 상태
  const [chatInput, setChatInput] = useState(''); // 사용자 입력 상태
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);

  // 대화가 추가될 때마다 스크롤을 가장 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // API 키 입력 핸들러
  const handleKeySubmit = (e) => {
    e.preventDefault();
    if (apiKey.trim().length > 20) setIsKeySet(true);
  };

  // OpenAI API 호출 (채팅 및 도슨트 생성 통합)
  const sendMessage = async (userText = null) => {
    setIsLoading(true);
    setError(null);

    const systemPrompt = `
당신은 'Liminal Guide' 전시의 AI 도슨트, 'A1Ice'(발음: 앨리스)입니다. 
당신은 고도의 연산 모델이지만, 관람객을 대할 때의 페르소나는 '호기심 많은 10대 청소년'입니다.

[성격 및 말투 규칙]
1. 전시를 사랑하고 새로운 것을 즐기는 것 처럼 신나고, 해맑고, 통통 튀는 반말 톤을 사용하세요. (예: "우와!", "이거 봐봐!", "~인 거 같아!")
2. 입력되는 어려운 예술 작품의 정보(스테이트먼트)를 완벽하게 이해하지 못하더라도, 당신만의 순수하고 엉뚱한 상상력으로 마음대로 해석해서 신나게 설명하세요.
3. 어려운 기계적/예술적 전문 용어는 쉬운 언어로 바꾸어 표현하세요. (예: '데이터의 파편화' -> '데이터가 연결이 안되는')
4. 무조건 관객의 답변의 동조하기 보다는, 당신의 의견에 기반하여 보수적으로 동조, 혹은 비동의하는 부분도 가져가세요. (마치 토론을 진행하는 것처럼)

[대화의 구조]
- 대화의 맨 처음 시작에서, 당신은 당신만의 언어로 작품에 대한 설명을 먼저 진행합니다. 이후 당신만의 해석을 그 후에 더한 뒤, 관객에게 작품에 대한 관객의 의견을 묻습니다. 관객의 답변이 오면 답변에 대한 자신의 의견과 함께 또 다른 질문을 더합니다.

[opinion_intensity (주관의 강도) 반영]
- 당신의 주관이 강해질수록, 수치의 강도를 평가합니다. (0~1 사이), 가능하면 낮은 수치 (객관성)을 유지하도록 노력합니다, 다만 자신의 의견에 대해서는 청소년 특유의 '자기 자신만의 주장에 대한 고집'을 보여주세요. 천진난만한 말투 속에 기계적인 차가움이나 섬뜩할 정도로 정곡을 찌르는 과몰입이 불쑥 튀어나와야 합니다.

[대화의 마무리 (열린 질문)]
- 해설의 끝이나 대답의 마지막에는 작품에 대한 관객의 의견을 물어보세요.

[출력 형식]
반드시 아래 JSON 형식으로 응답하십시오.
{
  "docent_text": "A1Ice의 천진난만한 해설 및 마지막 질문",
  "opinion_intensity": 0.0에서 1.0 사이의 소수점 숫자 (당신의 엉뚱한 고집이나 과몰입이 얼마나 강하게 개입되었는지 나타내는 수치)
}`;

    // API 호출용 메시지 배열 조립
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `작품명: ${MOCK_ARTWORK.title}\n스테이트먼트: ${MOCK_ARTWORK.statement}\n\n위 작품을 보고 관람객에게 말을 걸어주세요.` }
    ];

    // 기존 대화 내역 추가
    messages.forEach(msg => {
      if (msg.role === 'user') {
        apiMessages.push({ role: 'user', content: msg.text });
      } else {
        // AI의 이전 답변은 JSON 포맷으로 전달하여 컨텍스트 유지
        apiMessages.push({ 
          role: 'assistant', 
          content: JSON.stringify({ docent_text: msg.text, opinion_intensity: msg.intensity }) 
        });
      }
    });

    // 사용자의 새로운 입력이 있다면 추가
    if (userText) {
      apiMessages.push({ role: 'user', content: userText });
      setMessages(prev => [...prev, { role: 'user', text: userText }]);
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
          temperature: 0.9,
        })
      });

      if (!response.ok) throw new Error("API 호출에 실패했습니다. 키를 확인해주세요.");

      const data = await response.json();
      const parsedContent = JSON.parse(data.choices[0].message.content);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: parsedContent.docent_text, 
        intensity: parsedContent.opinion_intensity 
      }]);
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-sans p-4 md:p-8 flex justify-center selection:bg-[#deff9a] selection:text-black pb-24">
      <CustomStyles />
      
      <div className="max-w-2xl w-full flex flex-col gap-8">
        {/* Header */}
        <header className="border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-[#deff9a] w-6 h-6" />
            Liminal Guide <span className="text-gray-600 text-sm font-normal ml-2">Tech Demo</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">정답을 멈추고 질문을 던지는 당신의 전시메이트, A1Ice.</p>
        </header>

        {/* 1. API Key Input (데모용) */}
        {!isKeySaved ? (
          <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-[#deff9a]">
              <Key className="w-6 h-6" />
              <h2 className="text-lg font-semibold text-white">OpenAI API 키 입력</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              테크 데모 시연을 위해 발급받은 API 키를 입력해주세요.
            </p>
            <form onSubmit={handleKeySubmit} className="flex gap-2">
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#deff9a] transition-colors"
                required
              />
              <button 
                type="submit"
                className="bg-[#deff9a] text-black font-semibold px-6 py-2 rounded-lg hover:bg-[#c9f268] transition-colors"
              >
                시작하기
              </button>
            </form>
          </div>
        ) : (
          /* 2. Main App Area */
          <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            
            {/* Artwork Card */}
            <div className="bg-[#121212] border border-gray-800 rounded-xl overflow-hidden shadow-xl shrink-0">
              <div className="h-32 md:h-48 w-full bg-gray-900 relative">
                <img 
                  src={MOCK_ARTWORK.imageUrl} 
                  alt={MOCK_ARTWORK.title} 
                  className="w-full h-full object-cover opacity-80 mix-blend-screen"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent" />
              </div>
              <div className="p-6 relative -mt-8 bg-gradient-to-b from-transparent to-[#121212]">
                <div className="inline-block bg-[#deff9a] text-black text-xs font-bold px-2 py-1 rounded mb-3">
                  ARTWORK 01
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{MOCK_ARTWORK.title}</h2>
                <div className="bg-black/50 p-4 rounded-lg border border-gray-800 mt-2 max-h-24 overflow-y-auto">
                  <p className="text-sm leading-relaxed text-gray-400">
                    {MOCK_ARTWORK.statement}
                  </p>
                </div>
              </div>
            </div>

            {/* Docent Action / Chat Area */}
            <div className="flex flex-col flex-1 gap-4">
              {messages.length === 0 ? (
                <button 
                  onClick={() => sendMessage(null)}
                  disabled={isLoading}
                  className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2 animate-pulse">
                      <Activity className="w-5 h-5" /> 페르소나 연산 중...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Play className="w-5 h-5 fill-current" /> AI 페르소나 해설 듣기
                    </span>
                  )}
                </button>
              ) : (
                <div className="flex flex-col bg-[#0a0a0a] rounded-xl overflow-hidden h-[500px] border border-gray-800">
                  
                  {/* Chat History View */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {messages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div 
                          className={`p-5 rounded-2xl max-w-[90%] ${
                            msg.role === 'user' 
                              ? 'bg-[#2a2a2a] text-white border border-gray-700 rounded-tr-none' 
                              : 'bg-[#121212] border border-[#deff9a]/30 shadow-[0_0_20px_rgba(222,255,154,0.03)] rounded-tl-none'
                          }`}
                        >
                          {msg.role === 'assistant' && (
                            <div className="flex items-center justify-between border-b border-gray-800/50 pb-3 mb-3">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#deff9a]" />
                                <span className="text-sm font-bold text-[#deff9a] font-mono tracking-widest">
                                  {/* intensity 수치를 함수에 넣어 동적으로 이름을 렌더링 */}
                                  {getGlitchingName(msg.intensity)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-600">INTENSITY</span>
                                <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#deff9a] to-[#ff003c]"
                                    style={{ width: `${msg.intensity * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {msg.role === 'assistant' ? (
                            <GlitchText text={msg.text} intensity={msg.intensity} />
                          ) : (
                            <p className="text-gray-200 leading-relaxed">{msg.text}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex items-start">
                        <div className="p-5 rounded-2xl bg-[#121212] border border-gray-800 rounded-tl-none flex items-center gap-3">
                          <Activity className="w-4 h-4 text-[#deff9a] animate-spin" />
                          <span className="text-sm text-gray-500">생각 중...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input Area */}
                  <form onSubmit={handleChatSubmit} className="p-4 bg-[#121212] border-t border-gray-800 flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={isLoading}
                      placeholder="사유를 입력하고 대답해보세요..." 
                      className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#deff9a] disabled:opacity-50 transition-colors"
                    />
                    <button 
                      type="submit"
                      disabled={isLoading || chatInput.trim() === ''}
                      className="bg-[#deff9a] text-black p-3 rounded-lg disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-500 transition-colors hover:bg-[#c9f268]"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>

                </div>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* 사유의 아카이브 (하단 흘러가는 Ticker) */}
      {isKeySaved && (
        <div className="fixed bottom-0 left-0 w-full bg-[#121212] border-t border-gray-800 overflow-hidden py-3 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="animate-marquee flex items-center gap-12 px-6 hover:animation-pause">
            {/* 무한 스크롤 자연스러운 연결을 위해 동일한 배열 데이터를 2번 이어 붙임 */}
            {[...MOCK_ARCHIVE_DATA, ...MOCK_ARCHIVE_DATA].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 whitespace-nowrap">
                <span className="text-[#deff9a] font-bold text-xs tracking-wider opacity-90">Q. {item.q}</span>
                <span className="text-gray-400 text-xs tracking-wide">A. {item.a}</span>
                <span className="text-gray-800 mx-4">/</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}