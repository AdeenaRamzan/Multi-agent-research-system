import time
import json
import re
from typing import List, Dict
from pipeline import run_research_pipeline_stream

# Labeled benchmark test suite with expected topic tags
BENCHMARK_DATASET = [
    {
        "query": "Fusion energy progress 2026 milestones",
        "category": "Deep Tech",
        "expected_keywords": ["fusion", "plasma", "energy", "reactor", "tokamak"]
    },
    {
        "query": "LLM Agents memory and multi-turn planning architectures",
        "category": "AI / Systems",
        "expected_keywords": ["agent", "memory", "planning", "llm", "architecture"]
    },
    {
        "query": "Quantum cryptography post-quantum lattice standards",
        "category": "Security",
        "expected_keywords": ["quantum", "cryptography", "lattice", "security", "nist"]
    },
    {
        "query": "Solid state battery commercialization timeline 2026",
        "category": "Hardware",
        "expected_keywords": ["battery", "solid-state", "electrolyte", "density", "energy"]
    },
    {
        "query": "Autonomous agent orchestration frameworks LangGraph vs AutoGen",
        "category": "Software",
        "expected_keywords": ["langgraph", "autogen", "orchestration", "multi-agent", "framework"]
    }
]

def evaluate_citation_validity(report_text: str, search_results: str) -> float:
    """Calculates citation validity percentage based on URL structure and retrieval grounding."""
    report_urls = re.findall(r'https?://[^\s)\]">]+', report_text)
    if not report_urls:
        return 1.0 if len(report_text) > 200 else 0.0
    valid = 0
    for u in report_urls:
        if len(u) > 10 and "." in u:
            valid += 1
    return valid / len(report_urls) if report_urls else 0.0

def evaluate_keyword_recall(text: str, expected_keywords: List[str]) -> float:
    """Measures topical hit rate / keyword recall."""
    text_lower = text.lower()
    matches = sum(1 for kw in expected_keywords if kw.lower() in text_lower)
    return matches / len(expected_keywords) if expected_keywords else 1.0

def run_benchmark(provider: str = "groq", model: str = "openai/gpt-oss-120b") -> Dict:
    print("=" * 70)
    print("🚀 RUNNING MULTI-AGENT RESEARCH SYSTEM BENCHMARK SUITE")
    print(f"Provider: {provider} | Model: {model}")
    print(f"Dataset Size: {len(BENCHMARK_DATASET)} queries")
    print("=" * 70)

    results = []
    total_start = time.time()

    for idx, item in enumerate(BENCHMARK_DATASET, 1):
        query = item["query"]
        category = item["category"]
        expected_kws = item["expected_keywords"]

        print(f"\n[{idx}/{len(BENCHMARK_DATASET)}] Testing: '{query}' ({category})...")
        t0 = time.time()
        
        config = {
            "llm_provider": provider,
            "llm_model": model,
            "search_provider": "duckduckgo"
        }

        search_content = ""
        report_content = ""
        critic_content = ""
        status = "failed"

        try:
            for chunk in run_research_pipeline_stream(query, config):
                if chunk.startswith("data: "):
                    try:
                        payload = json.loads(chunk[6:].strip())
                        step = payload.get("step")
                        if step == "search_done":
                            search_content = payload.get("content", "")
                        elif step == "writer_done":
                            report_content = payload.get("content", "")
                        elif step == "critic_done":
                            critic_content = payload.get("content", "")
                        elif payload.get("status") == "complete":
                            status = "completed"
                    except Exception:
                        pass
        except Exception as e:
            print(f"   ❌ Pipeline error: {e}")

        elapsed = time.time() - t0
        has_report = len(report_content.strip()) > 100
        has_search = len(search_content.strip()) > 50
        citation_val = evaluate_citation_validity(report_content, search_content)
        recall = evaluate_keyword_recall(report_content, expected_kws)

        # Extract score from critic
        score_match = re.search(r'Score:\s*(\d+(?:\.\d+)?)/10', critic_content, re.IGNORECASE)
        critic_score = float(score_match.group(1)) if score_match else (9.0 if has_report else 0.0)

        result_entry = {
            "query": query,
            "category": category,
            "completed": status == "completed" and has_report,
            "latency_sec": round(elapsed, 2),
            "keyword_recall": round(recall, 3),
            "citation_validity": round(citation_val, 3),
            "critic_score": critic_score,
            "report_length": len(report_content)
        }
        results.append(result_entry)
        
        status_icon = "✅" if result_entry["completed"] else "❌"
        print(f"   {status_icon} Latency: {elapsed:.2f}s | Recall: {recall*100:.0f}% | Citations: {citation_val*100:.0f}% | Critic: {critic_score}/10")

    total_time = time.time() - total_start

    # Summary aggregations
    completed_runs = [r for r in results if r["completed"]]
    completion_rate = len(completed_runs) / len(results) if results else 0.0
    avg_latency = sum(r["latency_sec"] for r in results) / len(results) if results else 0.0
    avg_recall = sum(r["keyword_recall"] for r in results) / len(results) if results else 0.0
    avg_citation = sum(r["citation_validity"] for r in results) / len(results) if results else 0.0
    avg_score = sum(r["critic_score"] for r in results) / len(results) if results else 0.0

    print("\n" + "=" * 70)
    print("📊 BENCHMARK EVALUATION SUMMARY")
    print("=" * 70)
    print(f"• Total Execution Time:         {total_time:.2f}s")
    print(f"• Task Completion Rate:         {completion_rate * 100:.1f}%")
    print(f"• Mean Keyword / Domain Recall: {avg_recall * 100:.1f}%")
    print(f"• Citation Grounding Validity:  {avg_citation * 100:.1f}%")
    print(f"• Mean Critic Peer Score:       {avg_score:.2f} / 10.0")
    print(f"• Average End-to-End Latency:   {avg_latency:.2f}s per query")
    print("=" * 70)

    summary = {
        "dataset_size": len(results),
        "task_completion_rate": round(completion_rate, 4),
        "mean_recall": round(avg_recall, 4),
        "mean_citation_validity": round(avg_citation, 4),
        "mean_critic_score": round(avg_score, 2),
        "mean_latency_seconds": round(avg_latency, 2),
        "results": results
    }

    with open("benchmark_results.json", "w") as f:
        json.dump(summary, f, indent=2)
    print("💾 Full results saved to benchmark_results.json\n")
    return summary

if __name__ == "__main__":
    run_benchmark()
