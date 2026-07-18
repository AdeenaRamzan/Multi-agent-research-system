import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Key, Cpu, Search, FileText, Sparkles, CheckCircle2, 
  AlertCircle, Download, Copy, RotateCcw, HelpCircle, ArrowRight,
  Eye, Check, ShieldAlert, BookOpen, MessageSquare
} from 'lucide-react';
import { marked } from 'marked';
import './App.css';

// Default config values
const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
  ollama: 'llama3'
};

export default function App() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('idle'); // idle, init, search, search_done, reader, reader_done, writer, writer_done, critic, critic_done, complete
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  
  // Pipeline state outputs
  const [searchResults, setSearchResults] = useState('');
  const [scrapedContent, setScrapedContent] = useState('');
  const [report, setReport] = useState('');
  const [criticFeedback, setCriticFeedback] = useState('');
  
  // Active Tab in Results Panel
  const [activeTab, setActiveTab] = useState('report'); // report, critic, search, reader
  
  // Config state
  const [showConfig, setShowConfig] = useState(true);
  const [llmProvider, setLlmProvider] = useState('openai');
  const [llmModel, setLlmModel] = useState(DEFAULT_MODELS.openai);
  const [searchProvider, setSearchProvider] = useState('duckduckgo');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434/v1');
  
  // API Keys
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [tavilyApiKey, setTavilyApiKey] = useState(() => localStorage.getItem('tavily_api_key') || '');

  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef(null);

  // Sync API Keys to localStorage
  useEffect(() => {
    localStorage.setItem('openai_api_key', openaiApiKey);
  }, [openaiApiKey]);
  useEffect(() => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
  }, [geminiApiKey]);
  useEffect(() => {
    localStorage.setItem('tavily_api_key', tavilyApiKey);
  }, [tavilyApiKey]);

  // Adjust model when provider changes
  useEffect(() => {
    setLlmModel(DEFAULT_MODELS[llmProvider] || '');
  }, [llmProvider]);

  // Scroll logs to bottom when text updates
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [searchResults, scrapedContent, report, criticFeedback, statusMessage]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([report], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `research_report_${Date.now()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleRunPipeline = async (e) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    // Reset results & start
    setLoading(true);
    setError(null);
    setStep('init');
    setStatusMessage('Connecting to server...');
    setSearchResults('');
    setScrapedContent('');
    setReport('');
    setCriticFeedback('');
    setActiveTab('report');

    const config = {
      llm_provider: llmProvider,
      llm_model: llmModel,
      search_provider: searchProvider,
      openai_api_key: openaiApiKey,
      gemini_api_key: geminiApiKey,
      tavily_api_key: tavilyApiKey,
      ollama_base_url: ollamaBaseUrl
    };

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, config }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start research pipeline.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep partial line in buffer

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(cleanLine.slice(6));
              
              if (data.status === 'running') {
                setStep(data.step);
                if (data.message) {
                  setStatusMessage(data.message);
                }
                
                // Live streaming incremental content back to corresponding hooks
                if (data.step === 'search_done') {
                  setSearchResults(data.content);
                } else if (data.step === 'reader_done') {
                  setScrapedContent(data.content);
                } else if (data.step === 'writer_done') {
                  setReport(data.content);
                } else if (data.step === 'critic_done') {
                  setCriticFeedback(data.content);
                }
              } else if (data.status === 'complete') {
                setStep('complete');
                setLoading(false);
                setStatusMessage('Finished!');
              } else if (data.status === 'error') {
                setError(data.message);
                setStep('error');
                setLoading(false);
              }
            } catch (err) {
              console.error('Error parsing SSE line:', err);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred during execution.');
      setStep('error');
      setLoading(false);
    }
  };

  const triggerExample = (exampleTopic) => {
    setTopic(exampleTopic);
    // Don't auto-run immediately, let user review search and settings first
  };

  const getCriticScore = () => {
    if (!criticFeedback) return null;
    const match = criticFeedback.match(/Score:\s*(\d+(\.\d+)?)\s*\/10/i);
    return match ? match[1] : null;
  };

  const score = getCriticScore();

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="badge">AI Agent Network</div>
        <h1>
          Research<span style={{ color: 'var(--accent-orange)' }}>Mind</span>
        </h1>
        <p>
          Specialized agents collaborate in a pipeline—gathering, scraping, 
          writing, and reviewing—to generate premium research reports.
        </p>
      </header>

      {/* Main Grid */}
      <div className="main-layout" style={{ display: 'grid', gridTemplateColumns: showConfig ? '350px 1fr' : '1fr', gap: '1.5rem', transition: 'all 0.3s ease' }}>
        
        {/* Left Side: Configuration Drawer */}
        {showConfig && (
          <aside className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                <Settings size={18} style={{ color: 'var(--accent-orange)' }} />
                Pipeline Config
              </h2>
              <button 
                onClick={() => setShowConfig(false)}
                style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem' }}
                title="Hide settings"
              >
                [Hide]
              </button>
            </div>

            {/* Model settings */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Cpu size={12} /> LLM Provider
              </label>
              <select 
                className="input-field select-field" 
                value={llmProvider} 
                onChange={(e) => setLlmProvider(e.target.value)}
              >
                <option value="openai">OpenAI (GPT Models)</option>
                <option value="gemini">Google Gemini (Free tier avail.)</option>
                <option value="ollama">Ollama (Local / Free)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Model Name</label>
              <input 
                type="text" 
                className="input-field" 
                value={llmModel} 
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder="e.g. gpt-4o-mini"
              />
            </div>

            {llmProvider === 'ollama' && (
              <div className="input-group">
                <label className="input-label">Ollama API URL</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={ollamaBaseUrl} 
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                />
              </div>
            )}

            {/* API Keys based on selection */}
            {llmProvider === 'openai' && (
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Key size={12} /> OpenAI API Key
                </label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stored locally in your browser.</span>
              </div>
            )}

            {llmProvider === 'gemini' && (
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Key size={12} /> Gemini API Key
                </label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Get free keys from Google AI Studio.
                </span>
              </div>
            )}

            {/* Search Provider */}
            <div className="input-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Search size={12} /> Search Provider
              </label>
              <select 
                className="input-field select-field" 
                value={searchProvider} 
                onChange={(e) => setSearchProvider(e.target.value)}
              >
                <option value="duckduckgo">DuckDuckGo Search (Free, No Key)</option>
                <option value="tavily">Tavily Search (Key required)</option>
              </select>
            </div>

            {searchProvider === 'tavily' && (
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Key size={12} /> Tavily API Key
                </label>
                <input 
                  type="password" 
                  className="input-field" 
                  value={tavilyApiKey}
                  onChange={(e) => setTavilyApiKey(e.target.value)}
                  placeholder="tvly-..."
                />
              </div>
            )}

            {/* Shield warning if keys missing and needed */}
            {((llmProvider === 'openai' && !openaiApiKey) || 
              (llmProvider === 'gemini' && !geminiApiKey) ||
              (searchProvider === 'tavily' && !tavilyApiKey)) && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <ShieldAlert size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.1rem' }} />
                <p style={{ fontSize: '0.75rem', color: '#ef4444', lineHeight: '1.4' }}>
                  API Keys are missing. Please enter keys above, or use <strong>Gemini (free tier)</strong> or <strong>Ollama (local)</strong> with <strong>DuckDuckGo</strong> for keyless runs.
                </p>
              </div>
            )}
          </aside>
        )}

        {/* Right Side: Search input & pipeline execution */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main search card */}
          <section className="glass-panel" style={{ padding: '1.8rem 2.2rem' }}>
            <form onSubmit={handleRunPipeline} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={12} /> What would you like to research?
                  </label>
                  <input 
                    type="text" 
                    className="input-field anim-pulse-orange" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. CRISPR gene editing advances in 2025"
                    disabled={loading}
                    style={{ fontSize: '1.1rem', padding: '1rem 1.2rem' }}
                  />
                </div>
                
                {!showConfig && (
                  <button 
                    type="button"
                    onClick={() => setShowConfig(true)}
                    className="btn-secondary"
                    style={{ height: '54px', width: '54px', padding: 0 }}
                    title="Show settings"
                  >
                    <Settings size={20} />
                  </button>
                )}

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={loading || !topic.trim()}
                  style={{ height: '54px', padding: '0 2rem' }}
                >
                  {loading ? (
                    <>
                      <RotateCcw size={18} className="spinner" />
                      Researching...
                    </>
                  ) : (
                    <>
                      <ArrowRight size={18} />
                      Start Research
                    </>
                  )}
                </button>
              </div>

              {/* Examples chips */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>SUGGESTIONS:</span>
                {['Fusion energy progress 2026', 'LLM Agents Architecture', 'Quantum cryptography breakthroughs'].map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => triggerExample(ex)}
                    className="chip"
                    disabled={loading}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </form>
          </section>

          {/* Running progress view */}
          {step !== 'idle' && step !== 'complete' && (
            <section className="glass-panel" style={{ padding: '1.8rem 2.2rem', display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
              
              {/* Pipeline sequence */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                  PIPELINE STATUS
                </h3>
                
                {/* Search Step */}
                <div className={`step-card-ui ${['search', 'search_done'].includes(step) ? 'active' : ['reader', 'reader_done', 'writer', 'writer_done', 'critic', 'critic_done', 'complete'].includes(step) ? 'completed' : ''}`}>
                  <div className="icon-wrapper">
                    {['reader', 'reader_done', 'writer', 'writer_done', 'critic', 'critic_done', 'complete'].includes(step) ? <CheckCircle2 size={16} /> : <Search size={16} />}
                  </div>
                  <div>
                    <h4>Search Agent</h4>
                    <p>Searches and compiles sources</p>
                  </div>
                </div>

                {/* Reader Step */}
                <div className={`step-card-ui ${['reader', 'reader_done'].includes(step) ? 'active' : ['writer', 'writer_done', 'critic', 'critic_done', 'complete'].includes(step) ? 'completed' : ''}`}>
                  <div className="icon-wrapper">
                    {['writer', 'writer_done', 'critic', 'critic_done', 'complete'].includes(step) ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}
                  </div>
                  <div>
                    <h4>Reader Agent</h4>
                    <p>Scrapes and reads web body content</p>
                  </div>
                </div>

                {/* Writer Step */}
                <div className={`step-card-ui ${['writer', 'writer_done'].includes(step) ? 'active' : ['critic', 'critic_done', 'complete'].includes(step) ? 'completed' : ''}`}>
                  <div className="icon-wrapper">
                    {['critic', 'critic_done', 'complete'].includes(step) ? <CheckCircle2 size={16} /> : <FileText size={16} />}
                  </div>
                  <div>
                    <h4>Writer Chain</h4>
                    <p>Synthesizes research into a report</p>
                  </div>
                </div>

                {/* Critic Step */}
                <div className={`step-card-ui ${['critic', 'critic_done'].includes(step) ? 'active' : step === 'complete' ? 'completed' : ''}`}>
                  <div className="icon-wrapper">
                    {step === 'complete' ? <CheckCircle2 size={16} /> : <MessageSquare size={16} />}
                  </div>
                  <div>
                    <h4>Critic Chain</h4>
                    <p>Evaluates structure & issues feedback</p>
                  </div>
                </div>
              </div>

              {/* Streaming log terminal */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '300px' }}>
                <div style={{ background: '#07070a', border: '1px solid var(--border-color)', borderRadius: '10px', flex: 1, padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: error ? '#ef4444' : 'var(--accent-orange)', animation: loading ? 'pulse-glow 1.5s infinite' : 'none' }}></div>
                    <span>TERMINAL OUTPUT</span>
                  </div>
                  
                  <div ref={logContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem', color: '#34d399' }}>
                    <div style={{ color: 'var(--text-muted)' }}>&gt; Initializing task: "{topic}"</div>
                    {statusMessage && <div style={{ color: 'var(--text-primary)' }}>&gt; {statusMessage}</div>}
                    
                    {searchResults && (
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent-orange)' }}>[Search Results Retrieved]</span>
                        <pre style={{ fontSize: '0.75rem', marginTop: '0.25rem', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          {searchResults.slice(0, 500)}...
                        </pre>
                      </div>
                    )}

                    {scrapedContent && (
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent-purple)' }}>[Scraped URL Content]</span>
                        <pre style={{ fontSize: '0.75rem', marginTop: '0.25rem', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          {scrapedContent.slice(0, 500)}...
                        </pre>
                      </div>
                    )}

                    {report && (
                      <div style={{ color: '#60a5fa' }}>
                        &gt; [Writer Chain] Draft report generated. ({report.length} bytes)
                      </div>
                    )}

                    {criticFeedback && (
                      <div style={{ color: 'var(--accent-green)' }}>
                        &gt; [Critic Chain] Review complete. Score: {criticFeedback.match(/Score:\s*(\d+(\.\d+)?)\s*\/10/i)?.[1] || 'N/A'}/10
                      </div>
                    )}

                    {error && (
                      <div style={{ color: '#ef4444', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                        <AlertCircle size={14} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                        <span>Error: {error}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Results display panel */}
          {(step === 'complete' || report) && (
            <section className="glass-panel" style={{ padding: '2rem' }}>
              
              {/* Results Heading */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.2rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h2 style={{ fontSize: '1.5rem', color: '#fff' }}>Research Report</h2>
                  
                  {score && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '0.3rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.9rem', fontWeight: 600 }}>
                      <span>Score: {score} / 10</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={copyToClipboard} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    {copied ? <Check size={14} style={{ color: 'var(--accent-green)' }} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Markdown'}
                  </button>
                  <button onClick={downloadReport} className="btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
                    <Download size={14} />
                    Download Report
                  </button>
                </div>
              </div>

              {/* Tabs navigation */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                <button 
                  onClick={() => setActiveTab('report')}
                  className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
                >
                  <BookOpen size={14} />
                  Final Report
                </button>
                <button 
                  onClick={() => setActiveTab('critic')}
                  className={`tab-btn ${activeTab === 'critic' ? 'active' : ''}`}
                  disabled={!criticFeedback}
                >
                  <MessageSquare size={14} />
                  Critic Feedback
                </button>
                <button 
                  onClick={() => setActiveTab('search')}
                  className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                  disabled={!searchResults}
                >
                  <Search size={14} />
                  Raw Sources
                </button>
                <button 
                  onClick={() => setActiveTab('reader')}
                  className={`tab-btn ${activeTab === 'reader' ? 'active' : ''}`}
                  disabled={!scrapedContent}
                >
                  <Eye size={14} />
                  Scraped Body Content
                </button>
              </div>

              {/* Tab Contents */}
              <div style={{ minHeight: '300px' }}>
                {activeTab === 'report' && (
                  <div 
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: marked.parse(report) }}
                  />
                )}

                {activeTab === 'critic' && criticFeedback && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                    {criticFeedback}
                  </div>
                )}

                {activeTab === 'search' && searchResults && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    {searchResults}
                  </div>
                )}

                {activeTab === 'reader' && scrapedContent && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    {scrapedContent}
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '2rem 0', borderTop: '1px solid var(--border-color)', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
        ResearchMind · LangChain Multi-Agent Framework · Vite + React + FastAPI Web Application
      </footer>
    </div>
  );
}
