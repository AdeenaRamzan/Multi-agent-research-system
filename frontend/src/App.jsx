import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Key, Cpu, Search, FileText, Sparkles, CheckCircle2,
  AlertCircle, Download, Copy, RotateCcw, ArrowRight,
  Eye, Check, ShieldAlert, BookOpen, MessageSquare, Bell,
  LayoutDashboard, FolderKanban, BarChart3, FileStack, MessageCircle,
  Compass, Link2, Lightbulb, Quote, ChevronDown, ChevronUp, Bot
} from 'lucide-react';
import { marked } from 'marked';
import './App.css';

// Default config values
const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-flash-latest',
  ollama: 'llama3',
  groq: 'llama-3.3-70b-versatile'
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'research', label: 'Research', icon: Compass },
  { id: 'chat', label: 'AI Chat', icon: MessageCircle },
  { id: 'documents', label: 'Documents', icon: FileStack },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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

  // Nav state
  const [activeView, setActiveView] = useState('research');

  // Config state
  const [showConfig, setShowConfig] = useState(false);
  const [llmProvider, setLlmProvider] = useState('groq');
  const [llmModel, setLlmModel] = useState(DEFAULT_MODELS.groq);
  const [searchProvider, setSearchProvider] = useState('duckduckgo');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434/v1');

  // API Keys
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
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
    localStorage.setItem('groq_api_key', groqApiKey);
  }, [groqApiKey]);
  useEffect(() => {
    localStorage.setItem('tavily_api_key', tavilyApiKey);
  }, [tavilyApiKey]);

  // Adjust model when provider changes
  useEffect(() => {
    if (DEFAULT_MODELS[llmProvider]) {
      setLlmModel(DEFAULT_MODELS[llmProvider]);
    }
  }, [llmProvider]);

  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  };

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

  const handleStartResearch = async (e) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

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
      groq_api_key: groqApiKey,
      tavily_api_key: tavilyApiKey,
      ollama_base_url: ollamaBaseUrl
    };

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, config }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to initialize pipeline.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));

              if (data.status === 'running') {
                setStep(data.step);
                if (data.message) setStatusMessage(data.message);

                if (data.step === 'search_done') setSearchResults(data.content || '');
                else if (data.step === 'reader_done') setScrapedContent(data.content || '');
                else if (data.step === 'writer_done') setReport(data.content || '');
                else if (data.step === 'critic_done') setCriticFeedback(data.content || '');
              } else if (data.status === 'complete') {
                setStep('complete');
                setStatusMessage('Research completed successfully!');
                setLoading(false);
              } else if (data.status === 'error') {
                setError(data.message);
                setStep('error');
                setLoading(false);
                break;
              }
            } catch (err) {
              console.error('SSE parse error:', err);
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
    setActiveView('research');
    setTopic(exampleTopic);
  };

  const getCriticScore = () => {
    if (!criticFeedback) return null;
    const match = criticFeedback.match(/Score:\s*(\d+(\.\d+)?)\s*\/10/i);
    return match ? match[1] : null;
  };

  const score = getCriticScore();

  // Derive simple citation list from raw search results text
  const citations = searchResults
    ? Array.from(new Set((searchResults.match(/https?:\/\/[^\s)"'\]]+/g) || []))).slice(0, 6)
    : [];

  const keysMissing = (llmProvider === 'openai' && !openaiApiKey) ||
    (llmProvider === 'gemini' && !geminiApiKey) ||
    (searchProvider === 'tavily' && !tavilyApiKey);

  const pipelineSteps = [
    { key: 'search', doneKeys: ['reader', 'reader_done', 'writer', 'writer_done', 'critic', 'critic_done', 'complete'], activeKeys: ['search', 'search_done'], icon: Search, title: 'Search Agent', desc: 'Searches and compiles sources' },
    { key: 'reader', doneKeys: ['writer', 'writer_done', 'critic', 'critic_done', 'complete'], activeKeys: ['reader', 'reader_done'], icon: BookOpen, title: 'Reader Agent', desc: 'Scrapes and reads web body content' },
    { key: 'writer', doneKeys: ['critic', 'critic_done', 'complete'], activeKeys: ['writer', 'writer_done'], icon: FileText, title: 'Writer Chain', desc: 'Synthesizes research into a report' },
    { key: 'critic', doneKeys: ['complete'], activeKeys: ['critic', 'critic_done'], icon: MessageSquare, title: 'Critic Chain', desc: 'Evaluates structure & issues feedback' },
  ];

  return (
    <div className="app-shell">
      {/* Top Navigation */}
      <header className="topnav">
        <div className="topnav-logo">
          <div className="logo-mark"><Bot size={20} /></div>
          ResearchMind
        </div>

        <div className="topnav-search">
          <Search size={16} />
          <input type="text" placeholder="Search reports, sources, topics..." />
        </div>

        <div className="topnav-actions">
          <button className="icon-btn" title="Notifications">
            <Bell size={18} />
            <span className="dot"></span>
          </button>
          <button className="icon-btn" title="Settings" onClick={() => setActiveView('settings')}>
            <Settings size={18} />
          </button>
          <div className="avatar">RM</div>
        </div>
      </header>

      <div className="app-body">
        {/* Left Sidebar */}
        <nav className="sidebar">
          <div className="sidebar-section-label">Workspace</div>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isPlaceholder = !['research', 'settings'].includes(item.id);
            return (
              <button
                key={item.id}
                className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={17} />
                {item.label}
                {isPlaceholder && <span className="badge-soon">Soon</span>}
              </button>
            );
          })}

          <div className="sidebar-footer-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
              <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>Free tier active</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Groq &amp; DuckDuckGo are pre-configured — start researching right away.
            </p>
          </div>
        </nav>

        {/* Main content area */}
        <div className={`content-grid ${activeView === 'settings' ? 'no-rail' : ''}`}>
          <main className="main-col">

            {activeView === 'dashboard' && (
              <PlaceholderView icon={LayoutDashboard} title="Dashboard" note="Your research overview, recent activity, and saved reports will live here." onGo={() => setActiveView('research')} />
            )}
            {activeView === 'chat' && (
              <PlaceholderView icon={MessageCircle} title="AI Chat" note="Conversational research assistance is coming soon. Use Research for now to run the full agent pipeline." onGo={() => setActiveView('research')} />
            )}
            {activeView === 'documents' && (
              <PlaceholderView icon={FileStack} title="Documents" note="Upload and analyze PDFs alongside your research reports — coming soon." onGo={() => setActiveView('research')} />
            )}
            {activeView === 'projects' && (
              <PlaceholderView icon={FolderKanban} title="Projects" note="Group related research runs into projects to track progress over time." onGo={() => setActiveView('research')} />
            )}
            {activeView === 'analytics' && (
              <PlaceholderView icon={BarChart3} title="Analytics" note="Usage stats, source quality, and report performance will appear here." onGo={() => setActiveView('research')} />
            )}

            {activeView === 'settings' && (
              <SettingsPanel
                llmProvider={llmProvider} setLlmProvider={setLlmProvider}
                llmModel={llmModel} setLlmModel={setLlmModel}
                ollamaBaseUrl={ollamaBaseUrl} setOllamaBaseUrl={setOllamaBaseUrl}
                openaiApiKey={openaiApiKey} setOpenaiApiKey={setOpenaiApiKey}
                geminiApiKey={geminiApiKey} setGeminiApiKey={setGeminiApiKey}
                tavilyApiKey={tavilyApiKey} setTavilyApiKey={setTavilyApiKey}
                searchProvider={searchProvider} setSearchProvider={setSearchProvider}
                keysMissing={keysMissing}
              />
            )}

            {activeView === 'research' && (
              <>
                {/* Header */}
                <header className="app-header">
                  <div className="badge">
                    <Sparkles size={12} />
                    AI Agent Network
                  </div>
                  <h1 className="gradient-text-hero">Research, synthesized in minutes</h1>
                  <p>
                    Specialized agents collaborate in a real-time pipeline — gathering, scraping,
                    writing, and reviewing — to generate high-grade research reports.
                  </p>

                  <div className="info-banner">
                    <Sparkles size={16} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: '#065F46', lineHeight: '1.4' }}>
                      <strong>Free setup:</strong> Powered by <strong>Groq AI</strong> &amp; <strong>DuckDuckGo</strong>. Open Settings to add your own free Groq API key if needed.
                    </span>
                  </div>
                </header>

                {/* Main search card */}
                <section className="panel-card" style={{ padding: '1.8rem 2.2rem' }}>
                  <form onSubmit={handleStartResearch} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div className="input-group" style={{ flex: 1, minWidth: '240px' }}>
                        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Sparkles size={12} /> What would you like to research?
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="e.g. CRISPR gene editing advances in 2025"
                          disabled={loading}
                          style={{ fontSize: '1.05rem', padding: '1rem 1.2rem' }}
                        />
                      </div>

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
                      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Try:</span>
                      {['Fusion energy progress 2026', 'LLM Agents Architecture', 'Quantum cryptography breakthroughs'].map((ex, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => triggerExample(ex)}
                          className="chip"
                          disabled={loading}
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </form>
                </section>

                {/* Running progress view */}
                {step !== 'idle' && step !== 'complete' && (
                  <section className="panel-card" style={{ padding: '1.8rem 2.2rem', display: 'grid', gridTemplateColumns: '1.1fr 1.5fr', gap: '2rem' }}>

                    {/* Pipeline sequence */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <h3 className="eyebrow" style={{ marginBottom: '0.3rem' }}>Pipeline Status</h3>

                      {pipelineSteps.map(s => {
                        const isActive = s.activeKeys.includes(step);
                        const isDone = s.doneKeys.includes(step);
                        const Icon = s.icon;
                        return (
                          <div key={s.key} className={`step-card-ui ${isActive ? 'active' : isDone ? 'completed' : ''}`}>
                            <div className="icon-wrapper">
                              {isDone ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                            </div>
                            <div>
                              <h4>{s.title}</h4>
                              <p>{s.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Streaming log */}
                    <div style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
                      <div className="panel-soft" style={{ flex: 1, padding: '1.1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', color: 'var(--text-muted)' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: error ? 'var(--danger)' : 'var(--secondary)', animation: loading ? 'pulse-glow-light 1.5s infinite' : 'none' }}></div>
                          <span style={{ fontWeight: 600 }}>Activity Log</span>
                        </div>

                        <div ref={logContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '0.4rem' }}>
                          <div style={{ color: 'var(--text-muted)' }}>&gt; Initializing task: "{topic}"</div>
                          {statusMessage && <div style={{ color: 'var(--text-primary)' }}>&gt; {statusMessage}</div>}

                          {searchResults && (
                            <div>
                              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>[Search Results Retrieved]</span>
                              <pre style={{ fontSize: '0.75rem', marginTop: '0.3rem', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', padding: '0.6rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                                {searchResults.slice(0, 500)}...
                              </pre>
                            </div>
                          )}

                          {scrapedContent && (
                            <div>
                              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>[Scraped URL Content]</span>
                              <pre style={{ fontSize: '0.75rem', marginTop: '0.3rem', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', padding: '0.6rem', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                                {scrapedContent.slice(0, 500)}...
                              </pre>
                            </div>
                          )}

                          {report && (
                            <div style={{ color: 'var(--primary)' }}>
                              &gt; [Writer Chain] Draft report generated. ({report.length} bytes)
                            </div>
                          )}

                          {criticFeedback && (
                            <div style={{ color: 'var(--secondary)' }}>
                              &gt; [Critic Chain] Review complete. Score: {criticFeedback.match(/Score:\s*(\d+(\.\d+)?)\s*\/10/i)?.[1] || 'N/A'}/10
                            </div>
                          )}

                          {error && (
                            <div style={{ color: 'var(--danger)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'var(--danger-light)', padding: '0.6rem', borderRadius: '8px', border: '1px solid #FECACA' }}>
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
                  <section className="panel-card" style={{ padding: '2rem' }}>

                    {/* Results Heading */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.2rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div className="icon-tile blue"><FileText size={20} /></div>
                        <div>
                          <h2 style={{ fontSize: '1.35rem' }}>Research Report</h2>
                          {score && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Critic score: {score}/10</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={copyToClipboard} className="btn-secondary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}>
                          {copied ? <Check size={14} style={{ color: 'var(--secondary)' }} /> : <Copy size={14} />}
                          {copied ? 'Copied!' : 'Copy Markdown'}
                        </button>
                        <button onClick={downloadReport} className="btn-primary" style={{ padding: '0.6rem 1.3rem', fontSize: '0.85rem' }}>
                          <Download size={14} />
                          Download Report
                        </button>
                      </div>
                    </div>

                    {/* Tabs navigation */}
                    <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.6rem', flexWrap: 'wrap' }}>
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
                        <div className="panel-soft" style={{ padding: '1.5rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                          {criticFeedback}
                        </div>
                      )}

                      {activeTab === 'search' && searchResults && (
                        <div className="panel-soft" style={{ padding: '1.5rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                          {searchResults}
                        </div>
                      )}

                      {activeTab === 'reader' && scrapedContent && (
                        <div className="panel-soft" style={{ padding: '1.5rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                          {scrapedContent}
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </main>

          {/* Right rail */}
          {activeView !== 'settings' && (
            <aside className="right-rail">

              {/* Pipeline settings quick card */}
              <div className="panel-card" style={{ padding: '1.25rem' }}>
                <div className="side-card-title">
                  <div className="icon-tile blue" style={{ width: 32, height: 32, borderRadius: 9 }}><Settings size={15} /></div>
                  Pipeline Settings
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Model provider</span>
                    <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{llmProvider}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Search provider</span>
                    <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{searchProvider}</strong>
                  </div>
                  {keysMissing && (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', background: 'var(--danger-light)', padding: '0.6rem', borderRadius: '8px', marginTop: '0.3rem' }}>
                      <ShieldAlert size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '0.1rem' }} />
                      <span style={{ fontSize: '0.72rem', color: '#B91C1C' }}>API key missing for current selection.</span>
                    </div>
                  )}
                </div>
                <button className="btn-secondary" style={{ width: '100%', marginTop: '0.9rem', padding: '0.6rem', fontSize: '0.8rem' }} onClick={() => setActiveView('settings')}>
                  Open Settings
                </button>
              </div>

              {/* AI Recommendations */}
              <div className="panel-card" style={{ padding: '1.25rem' }}>
                <div className="side-card-title">
                  <div className="icon-tile orange" style={{ width: 32, height: 32, borderRadius: 9 }}><Lightbulb size={15} /></div>
                  AI Recommendations
                </div>
                <div className="rec-item">
                  <Sparkles size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                  <p><strong>Be specific.</strong> Narrow topics (e.g. a year, technology, or region) return sharper reports.</p>
                </div>
                <div className="rec-item">
                  <Sparkles size={14} style={{ color: 'var(--secondary)', flexShrink: 0, marginTop: '0.15rem' }} />
                  <p><strong>Check the Critic tab.</strong> It flags gaps and weak claims after each run.</p>
                </div>
                <div className="rec-item">
                  <Sparkles size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '0.15rem' }} />
                  <p><strong>Switch providers</strong> in Settings if a run stalls or a key is missing.</p>
                </div>
              </div>

              {/* Citations */}
              <div className="panel-card" style={{ padding: '1.25rem' }}>
                <div className="side-card-title">
                  <div className="icon-tile green" style={{ width: 32, height: 32, borderRadius: 9 }}><Quote size={15} /></div>
                  Sources &amp; Citations
                </div>
                {citations.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Sources will appear here once a research run retrieves results.
                  </p>
                ) : (
                  citations.map((url, i) => (
                    <div key={i} className="citation-pill">
                      <span className="num">{i + 1}</span>
                      <span style={{ wordBreak: 'break-all' }}>{url.length > 52 ? url.slice(0, 52) + '…' : url}</span>
                    </div>
                  ))
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '2rem 0', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        ResearchMind · LangChain Multi-Agent Framework · Vite + React + FastAPI Web Application
      </footer>
    </div>
  );
}

function PlaceholderView({ icon: Icon, title, note, onGo }) {
  return (
    <section className="panel-card" style={{ padding: '3rem 2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div className="icon-tile slate float-soft" style={{ width: 64, height: 64, borderRadius: 18 }}>
        <Icon size={28} />
      </div>
      <h2 style={{ fontSize: '1.4rem' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.6 }}>{note}</p>
      <button className="btn-primary" onClick={onGo} style={{ marginTop: '0.5rem' }}>
        <Compass size={16} /> Go to Research
      </button>
    </section>
  );
}

function SettingsPanel({
  llmProvider, setLlmProvider, llmModel, setLlmModel, ollamaBaseUrl, setOllamaBaseUrl,
  openaiApiKey, setOpenaiApiKey, geminiApiKey, setGeminiApiKey, tavilyApiKey, setTavilyApiKey,
  searchProvider, setSearchProvider, keysMissing
}) {
  return (
    <section className="panel-card" style={{ padding: '2rem', maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.2rem', marginBottom: '1.5rem' }}>
        <div className="icon-tile blue"><Settings size={20} /></div>
        <div>
          <h2 style={{ fontSize: '1.35rem' }}>Pipeline Settings</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Choose your model and search providers.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
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
            <option value="groq">Groq (Ultra-fast / Free tier)</option>
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
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stored locally in your browser.</span>
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
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Get free keys from Google AI Studio.</span>
          </div>
        )}

        {llmProvider === 'groq' && (
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Key size={12} /> Groq API Key
            </label>
            <input
              type="password"
              className="input-field"
              value="••••••••••••••••••••••••••••"
              disabled={true}
              style={{ opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-surface-alt)' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem', fontWeight: 600 }}>
              <CheckCircle2 size={12} /> Pre-configured server key active (locked)
            </span>
          </div>
        )}

        <div className="input-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.3rem' }}>
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Search size={12} /> Search Provider
          </label>
          <select
            className="input-field select-field"
            value={searchProvider}
            onChange={(e) => setSearchProvider(e.target.value)}
          >
            <option value="duckduckgo">DuckDuckGo Search (Free, No Key Needed)</option>
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

        {keysMissing && (
          <div style={{ padding: '0.85rem', background: 'var(--danger-light)', borderRadius: '12px', border: '1px solid #FECACA', display: 'flex', gap: '0.55rem' }}>
            <ShieldAlert size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '0.1rem' }} />
            <p style={{ fontSize: '0.78rem', color: '#B91C1C', lineHeight: '1.5' }}>
              API keys are missing. Enter a key above, or use <strong>Groq / Gemini (free tier)</strong> or <strong>Ollama (local)</strong> with <strong>DuckDuckGo</strong> for free runs.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
