import io
import csv
import uuid
import pdfplumber
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Splits text into chunks of 1000 characters with 200 overlap
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)


async def process_document(content: bytes, filename: str) -> dict:
    """Read a file and split it into chunks."""

    # Step 1: Extract text based on file type
    ext = filename.lower().split(".")[-1]

    if ext == "pdf":
        text = _read_pdf(content)
    elif ext == "csv":
        text = _read_csv(content)
    else:
        # txt and md
        text = content.decode("utf-8", errors="ignore")

    # Step 2: Split text into chunks
    chunks = splitter.split_text(text)

    # Step 3: Give each chunk an ID and metadata
    doc_id = str(uuid.uuid4())
    chunk_list = []
    for i, chunk in enumerate(chunks):
        chunk_list.append({
            "chunk_id": f"{doc_id}_chunk_{i}",
            "document_id": doc_id,
            "filename": filename,
            "content": chunk,
            "chunk_index": i,
            "total_chunks": len(chunks),
        })

    return {
        "document_id": doc_id,
        "filename": filename,
        "chunks": chunk_list,
        "chunk_count": len(chunks),
    }


def _read_pdf(content: bytes) -> str:
    pages = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return "\n\n".join(pages)


def _read_csv(content: bytes) -> str:
    lines = []
    decoded = content.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(decoded))
    headers = reader.fieldnames or []
    lines.append(f"Columns: {', '.join(headers)}")
    for i, row in enumerate(reader):
        row_text = " | ".join([f"{k}: {v}" for k, v in row.items() if v])
        lines.append(f"Row {i+1}: {row_text}")
    return "\n".join(lines)