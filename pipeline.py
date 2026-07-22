import json
import traceback
from agents import (
    get_llm,
    build_search_agent,
    build_reader_agent,
    get_writer_chain,
    get_critic_chain
)
from tools import get_tavily_search_tool, get_ddg_search_tool, scrape_url

def run_research_pipeline_stream(topic: str, config: dict):
    """
    Generator that executes the multi-agent research pipeline step-by-step
    and yields status updates and intermediate outputs in Server-Sent Events (SSE) format.
    """
    try:
        yield f"data: {json.dumps({'status': 'running', 'step': 'init', 'message': 'Initializing LLM and tools...'})}\n\n"

        # 1. Resolve LLM
        llm_provider = config.get("llm_provider", "gemini")
        llm_model = config.get("llm_model", "")
        
        # Determine API Key to use (frontend input fallback to server environment variables)
        import os
        api_key = None
        if llm_provider == "openai":
            api_key = config.get("openai_api_key")
            if not api_key:
                api_key = os.getenv("OPENAI_API_KEY")
        elif llm_provider == "gemini":
            api_key = config.get("gemini_api_key")
            if not api_key:
                api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        elif llm_provider == "groq":
            api_key = config.get("groq_api_key")
            if not api_key:
                api_key = os.getenv("GROQ_API_KEY")
            
        ollama_url = config.get("ollama_base_url", "http://localhost:11434/v1")
        
        try:
            llm = get_llm(
                provider=llm_provider,
                model_name=llm_model,
                api_key=api_key,
                base_url=ollama_url
            )
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': f'LLM Init Error: {str(e)}'})}\n\n"
            return

        # 2. Resolve Search Tool
        search_provider = config.get("search_provider", "duckduckgo")
        if search_provider == "tavily":
            tavily_key = config.get("tavily_api_key")
            if not tavily_key:
                import os
                tavily_key = os.getenv("TAVILY_API_KEY")
            if not tavily_key:
                yield f"data: {json.dumps({'status': 'error', 'message': 'Tavily API Key is required but not provided.'})}\n\n"
                return
            search_tool = get_tavily_search_tool(api_key=tavily_key)
        else:
            search_tool = get_ddg_search_tool()

        state = {}

        # --- STEP 1: Search Agent ---
        yield f"data: {json.dumps({'status': 'running', 'step': 'search', 'message': 'Search Agent is gathering web sources...'})}\n\n"
        
        try:
            search_agent = build_search_agent(llm, search_tool)
            search_result = None
            search_result = search_agent.invoke({
                "messages": [("user", f"Find recent, reliable and detailed information about: {topic}")]
            })

            state["search_results"] = search_result["messages"][-1].content
            yield f"data: {json.dumps({'status': 'running', 'step': 'search_done', 'content': state['search_results']})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': f'Search Agent failed: {str(e)}'})}\n\n"
            return

        # --- STEP 2: Reader Agent ---
        yield f"data: {json.dumps({'status': 'running', 'step': 'reader', 'message': 'Reader Agent is scraping top resource for deeper content...'})}\n\n"
        
        try:
            import re
            urls = re.findall(r'https?://[^\s<>"]+', state.get("search_results", ""))
            scraped_text = ""
            if urls:
                try:
                    scraped_text = scrape_url.invoke({"url": urls[0]})
                except Exception:
                    scraped_text = "Scraping bypassed; relying on detailed search intelligence."
            
            if not scraped_text or "Could not scrape" in scraped_text or "error" in scraped_text.lower():
                scraped_text = f"Primary research snippets:\n" + state.get("search_results", "")[:2500]

            state["scraped_content"] = scraped_text
            yield f"data: {json.dumps({'status': 'running', 'step': 'reader_done', 'content': state['scraped_content']})}\n\n"
        except Exception as e:
            state["scraped_content"] = state.get("search_results", "")[:2500]
            yield f"data: {json.dumps({'status': 'running', 'step': 'reader_done', 'content': state['scraped_content']})}\n\n"

        # --- STEP 3: Writer Chain ---
        yield f"data: {json.dumps({'status': 'running', 'step': 'writer', 'message': 'Writer is drafting the structured research report...'})}\n\n"
        
        try:
            writer_chain = get_writer_chain(llm)
            research_combined = (
                f"SEARCH RESULTS:\n{state['search_results']}\n\n"
                f"DETAILED SCRAPED CONTENT:\n{state['scraped_content']}"
            )
            report_content = writer_chain.invoke({
                "topic": topic,
                "research": research_combined
            })

            state["report"] = report_content
            yield f"data: {json.dumps({'status': 'running', 'step': 'writer_done', 'content': state['report']})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': f'Writer Chain failed: {str(e)}'})}\n\n"
            return

        # --- STEP 4: Critic Chain ---
        yield f"data: {json.dumps({'status': 'running', 'step': 'critic', 'message': 'Critic is reviewing and scoring the report...'})}\n\n"
        
        try:
            critic_chain = get_critic_chain(llm)
            feedback_content = critic_chain.invoke({
                "report": state["report"]
            })

            state["feedback"] = feedback_content
            yield f"data: {json.dumps({'status': 'running', 'step': 'critic_done', 'content': state['feedback']})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': f'Critic Chain failed: {str(e)}'})}\n\n"
            return

        # Final response
        yield f"data: {json.dumps({'status': 'complete', 'message': 'Research pipeline completed successfully!'})}\n\n"

    except Exception as e:
        error_msg = f"Unexpected error in pipeline: {str(e)}\n{traceback.format_exc()}"
        yield f"data: {json.dumps({'status': 'error', 'message': error_msg})}\n\n"

if __name__ == "__main__":
    # Simple CLI execution backup
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    topic = input("\nEnter a research topic: ")
    provider = input("Enter LLM provider (openai/gemini/ollama) [gemini]: ").strip() or "gemini"
    model = input("Enter model name (or press enter for default): ").strip()
    
    conf = {
        "llm_provider": provider,
        "llm_model": model,
        "search_provider": "duckduckgo"
    }
    
    print("\nRunning pipeline...")
    for chunk in run_research_pipeline_stream(topic, conf):
        if "running" in chunk or "complete" in chunk or "error" in chunk:
            print(chunk.strip())
