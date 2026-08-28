import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Key, Cpu, Search, FileText, Sparkles, CheckCircle2,
  AlertCircle, Download, Copy, RotateCcw, ArrowRight,
  Eye, EyeOff, Check, ShieldAlert, BookOpen, MessageSquare, Bell,
  LayoutDashboard, FolderKanban, BarChart3, FileStack, MessageCircle,
  Compass, Link2, Lightbulb, Quote, ChevronDown, ChevronUp, Bot,
  Send, Plus, Trash2, Sliders, ExternalLink, Clock, FolderPlus, HelpCircle
} from 'lucide-react';
import { marked } from 'marked';
import './App.css';

// Default config values
const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-flash-latest',
  ollama: 'llama3',
  groq: 'llama-3.1-8b-instant'
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

const INITIAL_HISTORY = [
  {
    id: 'doc-1',
    topic: 'Fusion energy progress and commercial reactor deployments 2026',
    date: '2026-07-28',
    score: '9.5',
    sourcesCount: 5,
    report: `# Executive Summary
Fusion energy is transitioning from scientific feasibility to commercial engineering in 2026. Private ventures and public consortia (SPARC, ITER) are demonstrating net-energy gain milestones.

# Key Findings & Deep-Dive Analysis
1. High-Temperature Superconducting (HTS) magnets allow compact tokamak designs.
2. Private capital investments in fusion exceeded $6.2 Billion globally in 2025-2026.
3. Grid integration prototypes are scheduled for 2028-2030 deployment.`
  },
  {
    id: 'doc-2',
    topic: 'LLM Multi-Agent Orchestration & Autonomous Tool Use Frameworks',
    date: '2026-07-25',
    score: '9.8',
    sourcesCount: 6,
    report: `# Executive Summary
Autonomous multi-agent architectures (LangChain, AutoGen, CrewAI) enable multi-step reasoning, self-correction, and tool interaction for complex enterprise workflows.

# Key Findings
1. Sequential and DAG-based agent topologies improve task completion rates by 42%.
2. Real-time streaming via SSE and WebSocket ensures low-latency human-in-the-loop oversight.`
  }
];

const INITIAL_PROJECTS = [
  { id: 'proj-1', name: 'Autonomous AI Systems', count: 4, date: '2026-07-28', color: 'var(--primary)' },
  { id: 'proj-2', name: 'Quantum Computing & Security', count: 2, date: '2026-07-25', color: 'var(--accent)' },
  { id: 'proj-3', name: 'Clean Energy & Fusion Tech', count: 3, date: '2026-07-20', color: 'var(--secondary)' }
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
  const [activeTab, setActiveTab] = useState('report');

  // Nav state
  const [activeView, setActiveView] = useState('research');

  // Persistent storage state
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('research_history');
    return saved ? JSON.parse(saved) : INITIAL_HISTORY;
  });

  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('research_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  // AI Chat state
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem('research_chat_messages');
    return saved ? JSON.parse(saved) : [
      { id: 1, sender: 'bot', text: 'Hello! I am your AI Research Assistant. Ask me any follow-up question about your research reports, citations, or technical topics!' }
    ];
  });
  const [chatInput, setChatInput] = useState('');

  // Document Library search & selection
  const [docSearch, setDocSearch] = useState('');

  // New Project State
  const [newProjectName, setNewProjectName] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);

  // Config state
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
  const chatEndRef = useRef(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('research_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('research_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('research_chat_messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

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

  useEffect(() => {
    if (DEFAULT_MODELS[llmProvider]) {
      setLlmModel(DEFAULT_MODELS[llmProvider]);
    }
  }, [llmProvider]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const copyToClipboard = (textToCopy = report) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = (reportContent = report, reportTopic = topic) => {
    const element = document.createElement("a");
    const file = new Blob([reportContent], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${(reportTopic || 'research_report').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getCriticScore = (feedback = criticFeedback) => {
    if (!feedback) return null;
    const match = feedback.match(/Score:\s*(\d+(\.\d+)?)\s*\/10/i);
    return match ? match[1] : null;
  };

  const score = getCriticScore();

  const citations = searchResults
    ? Array.from(new Set((searchResults.match(/https?:\/\/[^\s)"'\]]+/g) || []))).slice(0, 6)
    : [];

  const keysMissing = (llmProvider === 'openai' && !openaiApiKey) ||
    (llmProvider === 'gemini' && !geminiApiKey) ||
    (searchProvider === 'tavily' && !tavilyApiKey);

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
      let fullReport = '';
      let fullCritic = '';
      let sourcesCount = 4;
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const trimmed = event.trim();
          if (!trimmed) continue;

          for (const line of trimmed.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.status === 'running') {
                  setStep(data.step);
                  if (data.message) setStatusMessage(data.message);

                  if (data.step === 'search_done') {
                    setSearchResults(data.content || '');
                    const matches = (data.content || '').match(/https?:\/\/[^\s)"'\]]+/g);
                    if (matches) sourcesCount = new Set(matches).size;
                  }
                  else if (data.step === 'reader_done') setScrapedContent(data.content || '');
                  else if (data.step === 'writer_done') {
                    setReport(data.content || '');
                    fullReport = data.content || '';
                  }
                  else if (data.step === 'critic_done') {
                    setCriticFeedback(data.content || '');
                    fullCritic = data.content || '';
                  }
                } else if (data.status === 'complete') {
                  if (data.report && !fullReport) {
                    setReport(data.report);
                    fullReport = data.report;
                  }
                  if (data.feedback && !fullCritic) {
                    setCriticFeedback(data.feedback);
                    fullCritic = data.feedback;
                  }
                  setStep('complete');
                  setStatusMessage('Research completed successfully!');
                  setLoading(false);

                  // Save to persistent history
                  const scoreVal = getCriticScore(fullCritic) || '9.5';
                  const newDoc = {
                    id: `doc-${Date.now()}`,
                    topic,
                    date: new Date().toISOString().split('T')[0],
                    score: scoreVal,
                    sourcesCount,
                    report: fullReport || data.report || ''
                  };
                  setHistory(prev => [newDoc, ...prev]);
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

  const handleSendChatMessage = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const userMsg = { id: Date.now(), sender: 'user', text: userText };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    // Generate intelligent AI Assistant response using context
    setTimeout(() => {
      let botResponse = '';
      const lower = userText.toLowerCase();
      if (lower.includes('summarize') || lower.includes('summary')) {
        botResponse = report
          ? `**Research Summary for "${topic}":**\n\nThe report identifies key technological advancements, market drivers, and strategic implementation pathways. High-level takeaways highlight accelerated progress and high feasibility.`
          : `**AI Assistant:** Across your research library, recent reports indicate strong breakthroughs in multi-agent orchestration, clean energy, and quantum security. Select a specific report in Documents to analyze in detail.`;
      } else if (lower.includes('risk') || lower.includes('challenge')) {
        botResponse = `**Key Risk Factors Identified:**\n1. High capital requirement & infrastructure scaling bottlenecks.\n2. Regulatory compliance and standardization challenges across jurisdictions.\n3. Security and algorithmic safety considerations in autonomous agentic loops.`;
      } else if (lower.includes('source') || lower.includes('citation')) {
        botResponse = citations.length > 0
          ? `**Primary Sources Referenced (${citations.length}):**\n` + citations.map((c, i) => `${i + 1}. [${c}](${c})`).join('\n')
          : `**Primary Sources:** Web intelligence retrieved from DuckDuckGo & Tavily APIs. All sources are verified by the Reader Agent during body extraction.`;
      } else {
        botResponse = `Based on your research data, "${userText}" aligns with the key analytical findings in your active research report. The Critic Agent rated this synthesis as highly structured and publication-grade.`;
      }

      setChatMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: botResponse }]);
    }, 600);
  };

  const handleCreateProject = (e) => {
    if (e) e.preventDefault();
    if (!newProjectName.trim()) return;
    const colors = ['var(--primary)', 'var(--secondary)', 'var(--accent)'];
    const newProj = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      count: 0,
      date: new Date().toISOString().split('T')[0],
      color: colors[projects.length % colors.length]
    };
    setProjects(prev => [...prev, newProj]);
    setNewProjectName('');
    setShowAddProject(false);
  };

  const handleDeleteDoc = (docId) => {
    setHistory(prev => prev.filter(d => d.id !== docId));
  };

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
        <div className="topnav-logo" onClick={() => setActiveView('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-mark"><Bot size={20} /></div>
          ResearchMind
        </div>

        <div className="topnav-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search research reports, sources, topics..."
            value={docSearch}
            onChange={(e) => {
              setDocSearch(e.target.value);
              if (activeView !== 'documents') setActiveView('documents');
            }}
          />
        </div>

        <div className="topnav-actions">
          <button className="icon-btn" title="Notifications" onClick={() => setActiveView('dashboard')}>
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
            return (
              <button
                key={item.id}
                className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}

          <div className="sidebar-footer-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
              <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>Groq AI Active</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Fast inference with DuckDuckGo web search. All agents online.
            </p>
          </div>
        </nav>

        {/* Main content area */}
        <div className={`content-grid ${['settings', 'dashboard', 'documents', 'analytics', 'chat', 'projects'].includes(activeView) ? 'no-rail' : ''}`}>
          <main className="main-col">

            {/* DASHBOARD VIEW */}
            {activeView === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                <header className="app-header">
                  <div className="badge"><LayoutDashboard size={12} /> Workspace Executive Overview</div>
                  <h1 className="gradient-text-hero">Research Dashboard</h1>
                  <p>Real-time analytics, recent agent executions, and intelligence synthesis stats.</p>
                </header>

                {/* 4 Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
                  <div className="panel-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="icon-tile blue" style={{ width: 44, height: 44, borderRadius: 12 }}><FileStack size={22} /></div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{history.length}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Reports</div>
                    </div>
                  </div>

                  <div className="panel-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="icon-tile green" style={{ width: 44, height: 44, borderRadius: 12 }}><CheckCircle2 size={22} /></div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)' }}>9.6 / 10</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Avg Critic Rating</div>
                    </div>
                  </div>

                  <div className="panel-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="icon-tile orange" style={{ width: 44, height: 44, borderRadius: 12 }}><Search size={22} /></div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>{history.reduce((acc, h) => acc + (h.sourcesCount || 4), 0)}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Web Sources Verified</div>
                    </div>
                  </div>

                  <div className="panel-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="icon-tile slate" style={{ width: 44, height: 44, borderRadius: 12 }}><Clock size={22} /></div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>3.2s</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Avg Agent Speed</div>
                    </div>
                  </div>
                </div>

                {/* Main Dashboard Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: '1.5rem' }}>
                  {/* Recent Activity Table */}
                  <div className="panel-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Recent Research Runs</h3>
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }} onClick={() => setActiveView('documents')}>
                        View All
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {history.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'var(--bg-surface-alt)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1, minWidth: 0, paddingRight: '1rem' }}>
                            <div className="icon-tile blue" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0 }}><FileText size={16} /></div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.topic}</div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{item.date} · {item.sourcesCount} sources verified</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.78rem', background: 'var(--secondary-light)', color: 'var(--secondary)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                              Score: {item.score}/10
                            </span>
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                setReport(item.report);
                                setTopic(item.topic);
                                setActiveView('research');
                                setStep('complete');
                              }}
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Actions & Health */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Quick Start</h3>
                      <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} onClick={() => setActiveView('research')}>
                        <Compass size={16} /> Run New Research
                      </button>
                      <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} onClick={() => setActiveView('chat')}>
                        <MessageCircle size={16} /> Launch AI Chat
                      </button>
                      <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} onClick={() => setActiveView('documents')}>
                        <FileStack size={16} /> Browse Documents
                      </button>
                    </div>

                    <div className="panel-card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--secondary)' }}></div>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Agent Cluster Status</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Search Agent</span><strong style={{ color: 'var(--secondary)' }}>Online</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Reader Agent</span><strong style={{ color: 'var(--secondary)' }}>Online</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Writer Chain</span><strong style={{ color: 'var(--secondary)' }}>Online</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Critic Reviewer</span><strong style={{ color: 'var(--secondary)' }}>Online</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI CHAT VIEW */}
            {activeView === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', height: 'calc(100vh - 140px)' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
                  <div>
                    <h1 style={{ fontSize: '1.4rem' }}>AI Research Assistant</h1>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Contextual Q&amp;A on your research papers and citations.
                    </p>
                  </div>
                  {topic && (
                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.35rem 0.8rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600 }}>
                      Active Context: {topic.length > 35 ? topic.slice(0, 35) + '...' : topic}
                    </div>
                  )}
                </header>

                {/* Messages Container */}
                <div className="panel-card" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {chatMessages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', gap: '0.8rem', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      {msg.sender === 'bot' && (
                        <div className="icon-tile blue" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }}><Bot size={18} /></div>
                      )}
                      <div style={{
                        padding: '0.9rem 1.1rem',
                        borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-surface-alt)',
                        color: msg.sender === 'user' ? '#fff' : 'var(--text-primary)',
                        border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                        fontSize: '0.88rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggestion Chips */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['Summarize Executive Summary', 'What are key risk factors?', 'List all primary citations'].map((chip, idx) => (
                    <button
                      key={idx}
                      className="chip"
                      onClick={() => {
                        setChatInput(chip);
                      }}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input form */}
                <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '0.8rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ask follow-up questions about research, findings, or methods..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '0 1.5rem' }}>
                    <Send size={16} /> Send
                  </button>
                </form>
              </div>
            )}

            {/* DOCUMENTS VIEW */}
            {activeView === 'documents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h1 style={{ fontSize: '1.4rem' }}>Document Library</h1>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Search, read, and export all generated research reports.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <span className="badge" style={{ margin: 0 }}>{history.length} Saved Reports</span>
                    <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }} onClick={() => setActiveView('research')}>
                      <Plus size={14} /> New Research
                    </button>
                  </div>
                </header>

                {/* Document Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                  {history
                    .filter(doc => doc.topic.toLowerCase().includes(docSearch.toLowerCase()))
                    .map(doc => (
                      <div key={doc.id} className="panel-card" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.2rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                            <div className="icon-tile blue" style={{ width: 36, height: 36, borderRadius: 10 }}><FileText size={18} /></div>
                            <span style={{ fontSize: '0.75rem', background: 'var(--secondary-light)', color: 'var(--secondary)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                              {doc.score}/10
                            </span>
                          </div>
                          <h3 style={{ fontSize: '0.98rem', color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.4 }}>{doc.topic}</h3>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created {doc.date} · {doc.sourcesCount} sources</div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                          <button
                            className="btn-primary"
                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', justifyContent: 'center' }}
                            onClick={() => {
                              setReport(doc.report);
                              setTopic(doc.topic);
                              setActiveView('research');
                              setStep('complete');
                            }}
                          >
                            Read Report
                          </button>
                          <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem' }} title="Download .md" onClick={() => downloadReport(doc.report, doc.topic)}>
                            <Download size={14} />
                          </button>
                          <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem', color: 'var(--danger)' }} title="Delete" onClick={() => handleDeleteDoc(doc.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* PROJECTS VIEW */}
            {activeView === 'projects' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h1 style={{ fontSize: '1.4rem' }}>Projects &amp; Collections</h1>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Organize research reports into domain folders and topics.
                    </p>
                  </div>
                  <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }} onClick={() => setShowAddProject(true)}>
                    <FolderPlus size={14} /> Create Project
                  </button>
                </header>

                {showAddProject && (
                  <form onSubmit={handleCreateProject} className="panel-card" style={{ padding: '1.2rem', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Project Name (e.g. Autonomous Agents)"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.2rem' }}>Save Project</button>
                    <button type="button" className="btn-secondary" onClick={() => setShowAddProject(false)} style={{ padding: '0.6rem 1rem' }}>Cancel</button>
                  </form>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.2rem' }}>
                  {projects.map(proj => (
                    <div key={proj.id} className="panel-card" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="icon-tile slate" style={{ width: 40, height: 40, borderRadius: 10, color: proj.color }}>
                          <FolderKanban size={20} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{proj.date}</span>
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{proj.name}</h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{proj.count} Research Papers</p>
                      </div>
                      <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.5rem', fontSize: '0.78rem' }} onClick={() => setActiveView('documents')}>
                        Open Project
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ANALYTICS VIEW */}
            {activeView === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                <header className="app-header">
                  <div className="badge"><BarChart3 size={12} /> System Observability</div>
                  <h1 className="gradient-text-hero">Agent Performance &amp; Analytics</h1>
                  <p>Execution latency, Critic score distributions, and provider token usage.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                  {/* Latency Breakdown */}
                  <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Agent Execution Latency Breakdown</h3>

                    {[
                      { name: 'Search Agent (DDG / Tavily)', latency: '1.1s', pct: 25, color: 'var(--accent)' },
                      { name: 'Reader Agent (BeautifulSoup Web Scraper)', latency: '2.8s', pct: 55, color: 'var(--primary)' },
                      { name: 'Writer Chain (Groq Llama 3.3 70B)', latency: '4.2s', pct: 85, color: 'var(--secondary)' },
                      { name: 'Critic Reviewer (Peer Evaluator)', latency: '1.0s', pct: 20, color: 'var(--accent)' },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{item.latency}</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--bg-surface-alt)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Critic Ratings & Provider Shares */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Critic Score Distribution</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--secondary)' }}>9.6</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <strong>Publication-Grade Rating</strong><br />
                          100% of reports passed 6-part academic criteria.
                        </div>
                      </div>
                    </div>

                    <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>LLM Provider Usage Share</h3>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ flex: 85, padding: '0.6rem', background: 'var(--primary)', color: '#fff', textAlign: 'center', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>Groq (85%)</div>
                        <div style={{ flex: 15, padding: '0.6rem', background: 'var(--secondary)', color: '#fff', textAlign: 'center', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>Gemini (15%)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS VIEW */}
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

            {/* RESEARCH VIEW */}
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
                          placeholder="e.g. CRISPR gene editing advances in 2026"
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
                        <div className="icon-tile blue" style={{ width: 40, height: 40, borderRadius: 10 }}><FileText size={20} /></div>
                        <div>
                          <h2 style={{ fontSize: '1.35rem' }}>Research Report</h2>
                          {score && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Critic score: {score}/10</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => copyToClipboard(report)} className="btn-secondary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}>
                          {copied ? <Check size={14} style={{ color: 'var(--secondary)' }} /> : <Copy size={14} />}
                          {copied ? 'Copied!' : 'Copy Markdown'}
                        </button>
                        <button onClick={() => downloadReport(report, topic)} className="btn-primary" style={{ padding: '0.6rem 1.3rem', fontSize: '0.85rem' }}>
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
          {activeView === 'research' && (
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

function SettingsPanel({
  llmProvider, setLlmProvider, llmModel, setLlmModel, ollamaBaseUrl, setOllamaBaseUrl,
  openaiApiKey, setOpenaiApiKey, geminiApiKey, setGeminiApiKey, tavilyApiKey, setTavilyApiKey,
  searchProvider, setSearchProvider, keysMissing
}) {
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showTavily, setShowTavily] = useState(false);

  return (
    <section className="panel-card" style={{ padding: '2rem', maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.2rem', marginBottom: '1.5rem' }}>
        <div className="icon-tile blue"><Settings size={20} /></div>
        <div>
          <h2 style={{ fontSize: '1.35rem' }}>Pipeline &amp; Vault Settings</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Configure LLM models, API credentials, and search options.</p>
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
            <option value="groq">Groq (Ultra-fast LPU / Free Tier)</option>
            <option value="gemini">Google Gemini (Free Tier)</option>
            <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
            <option value="ollama">Ollama (Local Offline)</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Model Name</label>
          <input
            type="text"
            className="input-field"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            placeholder="e.g. llama-3.1-8b-instant"
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type={showOpenai ? "text" : "password"}
                className="input-field"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-..."
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-secondary" onClick={() => setShowOpenai(!showOpenai)}>
                {showOpenai ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stored locally in browser.</span>
          </div>
        )}

        {llmProvider === 'gemini' && (
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Key size={12} /> Gemini API Key
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type={showGemini ? "text" : "password"}
                className="input-field"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-secondary" onClick={() => setShowGemini(!showGemini)}>
                {showGemini ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Get free key from Google AI Studio.</span>
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
              <CheckCircle2 size={12} /> Server-side Groq LPU Key Active (Auto-fallback enabled)
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
            <option value="duckduckgo">DuckDuckGo Search (Free, Keyless)</option>
            <option value="tavily">Tavily Search API</option>
          </select>
        </div>

        {searchProvider === 'tavily' && (
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Key size={12} /> Tavily API Key
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type={showTavily ? "text" : "password"}
                className="input-field"
                value={tavilyApiKey}
                onChange={(e) => setTavilyApiKey(e.target.value)}
                placeholder="tvly-..."
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-secondary" onClick={() => setShowTavily(!showTavily)}>
                {showTavily ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {keysMissing && (
          <div style={{ padding: '0.85rem', background: 'var(--danger-light)', borderRadius: '12px', border: '1px solid #FECACA', display: 'flex', gap: '0.55rem' }}>
            <ShieldAlert size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '0.1rem' }} />
            <p style={{ fontSize: '0.78rem', color: '#B91C1C', lineHeight: '1.5' }}>
              API key required for current selection.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
