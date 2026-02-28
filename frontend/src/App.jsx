import { useState, useRef, useEffect } from 'react'

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am your cloud architect bot. Tell me what you want to build, and I will design the pattern for you using AWS specifications.' }
  ])
  const [input, setInput] = useState('')
  const [cfnJson, setCfnJson] = useState('{}')
  const [isProposalActive, setIsProposalActive] = useState(false)
  const [currentProposal, setCurrentProposal] = useState([])
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetch('/api/architecture')
      .then(res => res.json())
      .then(data => {
        const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
        setCfnJson(jsonStr)
      })
      .catch(err => console.error(err))
  }, [])

  const sendMessage = async (e, overrideText = null) => {
    if (e) e.preventDefault()
    const userMessage = overrideText || input.trim()
    if (!userMessage) return

    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    if (!overrideText) setInput('')
    setIsProposalActive(false)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          current_proposal: currentProposal
        })
      })
      const data = await res.json()

      setMessages(prev => [...prev, { role: 'bot', text: data.reply }])

      if (data.json_output && data.json_output !== '{}') {
        setCfnJson(typeof data.json_output === 'string' ? data.json_output : JSON.stringify(data.json_output, null, 2))
      }

      // Sync proposal state from backend response
      setCurrentProposal(data.proposal || [])

      if (data.is_proposal) {
        setIsProposalActive(true)
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Error communicating with backend.' }])
    }
  }

  const handleConfirm = (choice) => {
    sendMessage(null, choice)
  }

  const clearArchitecture = async () => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'clear', current_proposal: [] })
      })
      const data = await res.json()
      setMessages([{ role: 'bot', text: data.reply }])
      setCfnJson('{}')
      setIsProposalActive(false)
      setCurrentProposal([])
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
      {/* Main Chat Area */}
      <div className="w-1/2 flex flex-col bg-gray-800 border-r border-gray-700">
        <header className="p-6 border-b border-gray-700 bg-gray-900 flex items-center justify-between shadow-md z-10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Architect Chatbot
          </h1>
          <button
            onClick={clearArchitecture}
            className="text-sm px-4 py-2 bg-red-600/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-medium transition-all"
          >
            Clear
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-800 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-md whitespace-pre-wrap ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-700 border border-gray-600 text-gray-200 rounded-tl-none'
                  }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isProposalActive && (
            <div className="flex justify-start gap-3 mt-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <button
                onClick={() => handleConfirm('Yes')}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-full font-bold shadow-lg shadow-green-500/20 transition-all active:scale-95"
              >
                Yes, proceed
              </button>
              <button
                onClick={() => handleConfirm('No')}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-full font-bold shadow-lg transition-all active:scale-95"
              >
                No, adjust
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-700 bg-gray-900">
          <form onSubmit={sendMessage} className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProposalActive}
              placeholder={isProposalActive ? "Please confirm or reject the proposal..." : "Describe your architecture... (e.g., 'I want a scalable web app')"}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-6 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-gray-500 shadow-inner disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isProposalActive || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-full px-8 py-4 font-semibold transition-all flex items-center justify-center shadow-lg active:scale-95"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar for CloudFormation YAML/JSON Output */}
      <div className="w-1/2 p-6 flex flex-col bg-gray-900">
        {currentProposal.length > 0 && (
          <div className="mb-6 animate-in fade-in duration-500">
            <h2 className="text-xl font-bold mb-3 text-orange-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              Current Proposal (Pending)
            </h2>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <ul className="space-y-2">
                {currentProposal.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 text-orange-100">
                    <span className="text-orange-500">•</span>
                    {p.split('::').pop()}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4 text-blue-400">Architecture Output (YAML-JSON)</h2>
        <div className="flex-1 bg-gray-800 rounded-lg p-4 overflow-auto border border-gray-700 custom-scrollbar shadow-inner">
          <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
            {cfnJson}
          </pre>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
      `}} />
    </div>
  )
}

export default App
