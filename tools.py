from langchain.tools import tool 
import requests
from bs4 import BeautifulSoup
from tavily import TavilyClient

def get_tavily_search_tool(api_key: str):
    """Factory to create a Tavily web search tool with a dynamic API key."""
    @tool("web_search")
    def web_search(query: str) -> str:
        """Search the web for recent and reliable information on a topic. Returns Titles, URLs, and snippets."""
        try:
            client = TavilyClient(api_key=api_key)
            results = client.search(query=query, max_results=5)
            out = []
            for r in results.get('results', []):
                out.append(
                    f"Title: {r.get('title', 'No Title')}\n"
                    f"URL: {r.get('url', '')}\n"
                    f"Snippet: {r.get('content', '')[:300]}\n"
                )
            return "\n----\n".join(out)
        except Exception as e:
            return f"Tavily search failed: {str(e)}"
    return web_search

def get_ddg_search_tool():
    """Factory to create a free DuckDuckGo web search tool (no key required)."""
    @tool("web_search")
    def web_search(query: str) -> str:
        """Search the web for recent and reliable information on a topic. Returns Titles, URLs, and snippets."""
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=5))
            
            out = []
            for r in results:
                out.append(
                    f"Title: {r.get('title', 'No Title')}\n"
                    f"URL: {r.get('href', '')}\n"
                    f"Snippet: {r.get('body', '')[:300]}\n"
                )
            if not out:
                return "No search results found on DuckDuckGo."
            return "\n----\n".join(out)
        except Exception as e:
            return f"DuckDuckGo search failed: {str(e)}"
    return web_search

@tool("scrape_url")
def scrape_url(url: str) -> str:
    """Scrape and return clean text content from a given URL for deeper reading."""
    try:
        resp = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()
        return soup.get_text(separator=" ", strip=True)[:3500]
    except Exception as e:
        return f"Could not scrape URL: {str(e)}"
