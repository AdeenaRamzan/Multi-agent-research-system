import time
import json
from pipeline import run_research_pipeline_stream

start = time.time()
print("Starting speed test...")

config = {
    "llm_provider": "groq",
    "llm_model": "llama-3.3-70b-versatile",
    "search_provider": "duckduckgo"
}

t0 = time.time()
for chunk in run_research_pipeline_stream("agentic AI", config):
    now = time.time()
    elapsed = now - t0
    t0 = now
    
    # Parse SSE message
    if chunk.startswith("data: "):
        data = json.loads(chunk[6:].strip())
        print(f"[{time.time() - start:.2f}s] (+{elapsed:.2f}s) Step: {data.get('step')} | Message: {data.get('message', '')[:60]}")

print(f"Total time elapsed: {time.time() - start:.2f} seconds")
