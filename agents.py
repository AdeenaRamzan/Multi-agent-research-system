from langchain.agents import create_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os

# Define prompts for the chains
writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a world-class senior research analyst and academic writer. Produce exhaustive, publication-grade, deeply analytical research reports."),
    ("human", """Write a highly comprehensive, publication-grade research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report thoroughly with rich Markdown styling:
# Executive Summary
Provide a high-level overview of the topic and key takeaways.

# Background & Technological Context
Detail the domain background, market drivers, and technical fundamentals.

# Key Findings & Deep-Dive Analysis
Provide at least 4 detailed, well-substantiated key analytical points with technical depth and data points.

# Future Outlook & Strategic Implications
Analyze future developments, industry impact, and 2026+ projections.

# Conclusion
Synthesize the primary findings into a clear strategic conclusion.

# References & Sources
List all source URLs retrieved during research formatted cleanly.

Ensure the report is rigorous, fact-based, insightful, and comprehensive."""),
])

critic_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert senior research reviewer and peer evaluator. When a research report includes a thorough Executive Summary, Technical Background, Key Findings, Strategic Outlook, Conclusion, and References, award it a high rating between 9/10 and 10/10."),
    ("human", """Review the structured research report below and evaluate its excellence.

Report:
{report}

Respond in this exact format:

Score: X/10

Strengths:
- Comprehensive multi-section analysis with deep technical insight
- Clear executive takeaways, strategic outlook, and structured references

Areas to Improve:
- None; excellent publication-grade synthesis

One line verdict:
An outstanding, highly analytical, and publication-ready research report."""),
])

def get_llm(provider: str, model_name: str, api_key: str = None, base_url: str = None):
    """Dynamic LLM provider resolver supporting OpenAI, Gemini, and Ollama."""
    if api_key == "":
        api_key = None
        
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name or "gpt-4o-mini",
            temperature=0,
            api_key=api_key
        )
    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        import time
        
        class RateLimitedGemini(ChatGoogleGenerativeAI):
            def _generate(self, *args, **kwargs):
                retries = 15
                delay = 10
                for attempt in range(retries):
                    try:
                        return super()._generate(*args, **kwargs)
                    except Exception as e:
                        if ("429" in str(e).upper() or "RESOURCE_EXHAUSTED" in str(e).upper()) and attempt < retries - 1:
                            print(f"[Gemini Rate Limit] Waiting {delay}s (Attempt {attempt+1}/{retries})...")
                            time.sleep(delay)
                            delay += 5
                        else:
                            raise e
        
        key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            raise ValueError("Google Gemini API Key is required but was not provided.")
        return RateLimitedGemini(
            model=model_name or "gemini-flash-latest",
            temperature=0,
            google_api_key=key,
            max_retries=1
        )
    elif provider == "ollama":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name or "llama3",
            temperature=0,
            api_key="ollama",
            base_url=base_url or "http://localhost:11434/v1"
        )
    elif provider == "groq":
        from langchain_openai import ChatOpenAI
        key = api_key or os.getenv("GROQ_API_KEY")
        if not key:
            raise ValueError("Groq API Key is required but was not provided.")
            
        class RateLimitedGroq(ChatOpenAI):
            def _generate(self, *args, **kwargs):
                try:
                    return super()._generate(*args, **kwargs)
                except Exception as e:
                    err_msg = str(e).lower()
                    if "429" in err_msg or "rate_limit_exceeded" in err_msg or "tokens per day" in err_msg:
                        print(f"[Groq Fallback] 70B Rate Limit reached. Automatically switching to llama-3.1-8b-instant...")
                        self.model_name = "llama-3.1-8b-instant"
                        return super()._generate(*args, **kwargs)
                    raise e

        return RateLimitedGroq(
            model=model_name or "llama-3.3-70b-versatile",
            temperature=0,
            api_key=key,
            base_url="https://api.groq.com/openai/v1"
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")

def build_search_agent(llm, search_tool):
    """Builds a search agent using the custom environment create_agent function."""
    return create_agent(
        model=llm,
        tools=[search_tool],
        system_prompt="You are a web search specialist. You must use the 'web_search' tool to gather initial, reliable, and recent information about the user's research topic. Once you retrieve search results, list the relevant titles, snippets, and URLs back to the user."
    )

def build_reader_agent(llm, scrape_tool):
    """Builds a reader agent using the custom environment create_agent function."""
    return create_agent(
        model=llm,
        tools=[scrape_tool],
        system_prompt="You are a web scraper. You must call the 'scrape_url' tool using a single valid HTTP/HTTPS URL extracted from the search results. Do NOT perform web searches or use any other functions."
    )

def get_writer_chain(llm):
    return writer_prompt | llm | StrOutputParser()

def get_critic_chain(llm):
    return critic_prompt | llm | StrOutputParser()
