import { useState, useRef, useEffect } from 'react'

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am your cloud architect bot. What AWS component would you like to add? (e.g., S3 bucket, EC2 instance, RDS database)' }
  ])
  const [input, setInput] = useState('')
  const [cfnJson, setCfnJson] = useState('{}')
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
        setCfnJson(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
      })
      .catch(err => console.error(err))
  }, [])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input.trim()
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setInput('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })
      const data = await res.json()

      setMessages(prev => [...prev, { role: 'bot', text: data.reply }])
      setCfnJson(typeof data.json_output === 'string' ? data.json_output : JSON.stringify(data.json_output, null, 2))
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Error communicating with backend.' }])
    }
  }

  const clearArchitecture = async () => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'clear' })
      })
      const data = await res.json()
      setMessages([{ role: 'bot', text: data.reply }])
      setCfnJson(typeof data.json_output === 'string' ? data.json_output : JSON.stringify(data.json_output, null, 2))
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
      {/* Sidebar for CloudFormation JSON */}
      <div className="w-1/2 p-6 border-r border-gray-700 flex flex-col bg-gray-900">
        <h2 className="text-xl font-bold mb-4 text-blue-400">AWS CloudFormation Output</h2>
        <div className="flex-1 bg-gray-800 rounded-lg p-4 overflow-auto border border-gray-700 custom-scrollbar shadow-inner">
          <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
            {cfnJson}
          </pre>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-1/2 flex flex-col bg-gray-800">
        {/* Header */}
        <header className="p-6 border-b border-gray-700 bg-gray-900 flex items-center justify-between shadow-md z-10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Architect Chatbot
          </h1>
          <button
            onClick={clearArchitecture}
            className="text-sm px-4 py-2 bg-red-600/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-medium transition-all"
          >
            Clear Architecture
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-800">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} transform transition-all`}>
              <div
                className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-md ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-700 border border-gray-600 text-gray-200 rounded-tl-none'
                  }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-700 bg-gray-900">
          <form onSubmit={sendMessage} className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Add an S3 bucket and EC2 instance..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-6 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-gray-500 shadow-inner"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 py-4 font-semibold transition-colors flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Custom styles for scrollbar included here for simplicity */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}} />
    </div>
  )
}

export default App
