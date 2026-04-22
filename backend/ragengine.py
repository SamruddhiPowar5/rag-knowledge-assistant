import os
from typing import List, Dict
from openai import AsyncOpenAI
from dotenv import load_dotenv
from vectorstore import search_documents

load_dotenv()

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = "gpt-4o"


async def get_answer(query: str, top_k: int = 5, history: List[Dict] = []) -> Dict:
    """
    Main RAG function:
    1. Search Pinecone for relevant chunks
    2. Build a context string
    3. Ask GPT-4o to answer using that context
    """

    # Step 1: Find relevant chunks
    chunks = await search_documents(query, top_k=top_k)

    if not chunks:
        return {
            "answer": "I couldn't find any relevant information. Please upload some documents first.",
            "sources": [],
            "chunks_used": 0,
        }

    # Step 2: Build context from chunks
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Source {i} - {chunk['filename']} | score: {chunk['score']:.2f}]\n{chunk['content']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    # Step 3: Build the system prompt
    system_prompt = f"""You are a helpful Knowledge Assistant.
Answer the user's question using ONLY the context below.
If the context doesn't have enough info, say so clearly.
Use markdown formatting when helpful.

## Context:
{context}"""

    # Step 4: Build message history
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history[-6:]:  # Only last 6 messages to keep it short
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": query})

    # Step 5: Ask GPT-4o
    response = await openai_client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=1500,
    )

    answer = response.choices[0].message.content

    # Step 6: Build sources list for the frontend
    sources = [
        {
            "filename":        chunk["filename"],
            "content_preview": chunk["content"][:200] + "...",
            "score":           round(chunk["score"], 3),
            "chunk_index":     chunk["chunk_index"],
        }
        for chunk in chunks
    ]

    return {
        "answer":      answer,
        "sources":     sources,
        "chunks_used": len(chunks),
        "model":       MODEL,
    }