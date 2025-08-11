#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Reuse the existing extraction utilities
from extract_labs import (
    read_prompts_from_markdown,
    encode_image_to_data_uri,
    is_image_file,
    is_pdf_file,
    upload_pdfs_for_retrieval,
    call_model,
    normalize_flags_and_context,
)
from openai import OpenAI


BASE_DIR = Path(__file__).parent.resolve()
DEFAULT_OUTPUT = BASE_DIR / "labs.json"
DEFAULT_PROMPT = BASE_DIR / "ai-prompt.md"
DEFAULT_INPUT_DIR = BASE_DIR / "input_files"


def _ensure_api_key() -> None:
    load_dotenv()
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")


def _save_uploads_to_temp(upload_files: List[UploadFile]) -> List[Path]:
    tmp_dir = BASE_DIR / "tmp_uploads" / str(uuid.uuid4())
    tmp_dir.mkdir(parents=True, exist_ok=True)
    saved_paths: List[Path] = []
    for uf in upload_files:
        dest = tmp_dir / uf.filename
        with dest.open("wb") as out:
            shutil.copyfileobj(uf.file, out)
        saved_paths.append(dest)
    return saved_paths


def _cleanup_paths(paths: List[Path]) -> None:
    if not paths:
        return
    parent = paths[0].parent
    if parent.name != "tmp_uploads":
        # Be conservative: only remove within tmp_uploads
        try:
            if parent.exists() and str(parent).startswith(str(BASE_DIR / "tmp_uploads")):
                shutil.rmtree(parent)
        except Exception:
            pass


def _process_paths(
    input_paths: List[Path],
    model: str,
    prompt_path: Path,
    output_path: Optional[Path] = DEFAULT_OUTPUT,
) -> dict:
    client = OpenAI()

    # Split by type
    image_paths = [p for p in input_paths if is_image_file(p)]
    pdf_paths = [p for p in input_paths if is_pdf_file(p)]

    # Prepare inputs
    image_uris = [encode_image_to_data_uri(p) for p in image_paths]
    pdf_file_ids = upload_pdfs_for_retrieval(client, pdf_paths) if pdf_paths else []

    # Prompts
    system_prompt, user_prompt = read_prompts_from_markdown(prompt_path)

    # Call model
    output_text = call_model(
        client=client,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        image_data_uris=image_uris,
        pdf_file_ids=pdf_file_ids,
    )

    # Parse JSON
    try:
        data = json.loads(output_text)
    except json.JSONDecodeError:
        data = {"raw": output_text}

    # Post-process
    try:
        pdf_names = [p.name for p in pdf_paths]
        if isinstance(data, dict):
            data = normalize_flags_and_context(data, pdf_names)
    except Exception:
        pass

    # Persist to disk for local testing
    if output_path is not None:
        try:
            output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        except Exception:
            # Non-fatal
            pass

    return data


app = FastAPI(title="Bio Project API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/labs/ingest")
async def ingest_labs(
    files: List[UploadFile] = File(default=[]),
    model: str = Form(default="gpt-4.1"),
    prompt: str = Form(default=str(DEFAULT_PROMPT)),
    use_sample: bool = Form(default=False),
) -> JSONResponse:
    """Ingest uploaded lab PDFs/images and return canonical JSON.

    Behavior:
    - If one or more files are uploaded, process those.
    - Else if use_sample=true, process files under input_files/.
    - Else if neither, and input_files/ exists with files, fall back to sample.
    - Writes result to labs.json for local testing.
    """
    _ensure_api_key()

    prompt_path = Path(prompt)
    if not prompt_path.is_absolute():
        prompt_path = (BASE_DIR / prompt).resolve()
    if not prompt_path.exists():
        raise HTTPException(status_code=400, detail=f"Prompt not found: {prompt_path}")

    saved_paths: List[Path] = []
    try:
        if files:
            saved_paths = _save_uploads_to_temp(files)
        elif use_sample or (DEFAULT_INPUT_DIR.exists() and any((DEFAULT_INPUT_DIR / p).is_file() for p in os.listdir(DEFAULT_INPUT_DIR))):
            saved_paths = [
                p for p in sorted(DEFAULT_INPUT_DIR.iterdir())
                if p.is_file() and (is_image_file(p) or is_pdf_file(p))
            ]
        else:
            raise HTTPException(status_code=400, detail="No files uploaded and no sample inputs available")

        if not saved_paths:
            raise HTTPException(status_code=400, detail="No supported files found to process")

        data = _process_paths(
            input_paths=saved_paths,
            model=model,
            prompt_path=prompt_path,
            output_path=DEFAULT_OUTPUT,
        )

        return JSONResponse(content=data)
    finally:
        # Clean temp uploads (not the sample dir)
        if files and saved_paths:
            _cleanup_paths(saved_paths)


@app.get("/labs/last")
def get_last_labs() -> JSONResponse:
    """Return the most recent labs.json if present."""
    if not DEFAULT_OUTPUT.exists():
        raise HTTPException(status_code=404, detail="labs.json not found")
    try:
        data = json.loads(DEFAULT_OUTPUT.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read labs.json: {e}")
    return JSONResponse(content=data)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)


