from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

from processor import process_document
from vectorstore import store_document, search_documents, list_all_documents, delete_document_by_id, get_index_stats
from ragengine import get_answer

app = FastAPI(title="RAG Knowledge Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    conversation_history: Optional[List[dict]] = []


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    filename = file.filename.lower()
    if not any(filename.endswith(ext) for ext in [".pdf", ".txt", ".md", ".csv"]):
        raise HTTPException(status_code=400, detail="Only PDF, TXT, MD, CSV files allowed.")
    try:
        content = await file.read()
        result = await process_document(content, file.filename)
        doc_id = await store_document(result)
        return {
            "success": True,
            "document_id": doc_id,
            "filename": file.filename,
            "chunks": result["chunk_count"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
async def query(request: QueryRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    try:
        result = await get_answer(request.query, request.top_k, request.conversation_history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents")
async def documents():
    try:
        docs = await list_all_documents()
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/documents/{document_id}")
async def delete(document_id: str):
    try:
        await delete_document_by_id(document_id)
        return {"success": True, "message": f"Deleted {document_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def stats():
    try:
        return await get_index_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)