#!/usr/bin/env python3
import argparse
import base64
import json
import mimetypes
import os
from pathlib import Path
import sys
from typing import List, Tuple

from dotenv import load_dotenv
from openai import OpenAI


def read_prompts_from_markdown(markdown_path: Path) -> Tuple[str, str]:
    """Extract the SYSTEM and USER blocks from ai-prompt.md.

    We read everything after a line that equals 'SYSTEM' until the next block 'USER' as the system prompt,
    and everything after 'USER' to EOF as the user prompt.
    """
    text = markdown_path.read_text(encoding="utf-8")
    lines = [ln.rstrip("\n") for ln in text.splitlines()]

    def find_index(label: str) -> int:
        for i, ln in enumerate(lines):
            if ln.strip() == label:
                return i
        return -1

    system_idx = find_index("SYSTEM")
    user_idx = find_index("USER")
    if system_idx == -1 or user_idx == -1 or user_idx <= system_idx:
        raise RuntimeError("Could not locate SYSTEM and USER blocks in ai-prompt.md")

    system_block = "\n".join(lines[system_idx + 1 : user_idx]).strip()
    user_block = "\n".join(lines[user_idx + 1 :]).strip()
    if not system_block or not user_block:
        raise RuntimeError("SYSTEM or USER block appears empty in ai-prompt.md")
    return system_block, user_block


def encode_image_to_data_uri(path: Path) -> str:
    mime, _ = mimetypes.guess_type(path.as_posix())
    if not mime:
        # Default to octet-stream; Vision typically expects image/*
        # We'll still pass the file; most common types (png, jpg, jpeg, heic, webp, gif, tiff, bmp) are detected.
        mime = "application/octet-stream"
    data = path.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{b64}"


def is_image_file(path: Path) -> bool:
    ext = path.suffix.lower()
    return ext in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".heic"}


def is_pdf_file(path: Path) -> bool:
    return path.suffix.lower() == ".pdf"


def upload_pdfs_for_retrieval(client: OpenAI, pdf_paths: List[Path]) -> List[str]:
    file_ids: List[str] = []
    for pdf in pdf_paths:
        with pdf.open("rb") as f:
            # purpose="assistants" is used for retrieval/file_search tools in Responses API
            uploaded = client.files.create(file=f, purpose="assistants")
            file_ids.append(uploaded.id)
    return file_ids


def call_model(
    client: OpenAI,
    model: str,
    system_prompt: str,
    user_prompt: str,
    image_data_uris: List[str],
    pdf_file_ids: List[str],
) -> str:
    # Build input content parts
    system_input = {
        "role": "system",
        "content": [
            {"type": "input_text", "text": system_prompt},
        ],
    }

    user_content: List[dict] = [{"type": "input_text", "text": user_prompt}]
    for uri in image_data_uris:
        user_content.append({
            "type": "input_image",
            "image_url": uri,
            "detail": "auto",
        })

    user_input: dict = {
        "role": "user",
        "content": user_content,
    }

    # Include PDFs as input_file items directly (no retrieval tool)
    if pdf_file_ids:
        for fid in pdf_file_ids:
            user_content.append({
                "type": "input_file",
                "file_id": fid,
            })

    # Request strict JSON
    response = client.responses.create(
        model=model,
        input=[system_input, user_input],
        temperature=0,
        text={
            "format": {"type": "json_object"}
        },
    )

    # Convenience accessor (new SDKs). Fallback to manual extract if unavailable.
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    # Fallback: stitch together text parts
    try:
        parts: List[str] = []
        for item in getattr(response, "output", []) or []:
            for content in getattr(item, "content", []) or []:
                if getattr(content, "type", None) == "output_text":
                    parts.append(getattr(content, "text", ""))
        text = "".join(parts).strip()
        if text:
            return text
    except Exception:
        pass

    # Last resort: dump whole object (may not be JSON-only)
    return json.dumps(response.model_dump(), ensure_ascii=False)


def normalize_flags_and_context(data: dict, pdf_names: List[str]) -> dict:
    """Apply post-processing fixes:
    - Set context.report_ids to the list of PDF basenames
    - Set flag to "N" when value is within [ref_low, ref_high] and flag is missing/null
    """
    # Ensure context exists
    context = data.get("context")
    if not isinstance(context, dict):
        context = {}
        data["context"] = context
    context["report_ids"] = list(pdf_names)

    labs = data.get("labs")
    if isinstance(labs, list):
        for lab in labs:
            if not isinstance(lab, dict):
                continue
            flag = lab.get("flag")
            value = lab.get("value")
            ref_low = lab.get("ref_low")
            ref_high = lab.get("ref_high")
            qualifier = lab.get("qualifier")
            if flag in (None, "") and isinstance(value, (int, float)) and isinstance(ref_low, (int, float)) and isinstance(ref_high, (int, float)) and qualifier in (None, ""):
                if value < ref_low:
                    lab["flag"] = "L"
                elif value > ref_high:
                    lab["flag"] = "H"
                else:
                    lab["flag"] = "N"
    return data


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Extract clinical lab results JSON from PDFs and images using OpenAI.")
    parser.add_argument("files", nargs="*", help="Input files: PDFs and/or images (optional if --input-dir is used)")
    parser.add_argument("--output", "-o", default="labs.json", help="Path to write the JSON output")
    parser.add_argument("--model", "-m", default="gpt-4.1", help="Model to use (must support vision + file_search)")
    parser.add_argument("--prompt", default="ai-prompt.md", help="Path to ai-prompt.md containing SYSTEM/USER blocks")
    parser.add_argument("--input-dir", default="input_files", help="Directory containing PDFs/images if no explicit files are passed")
    parser.add_argument("--max-files", type=int, default=0, help="Optional max number of files to include (0 = no limit)")
    args = parser.parse_args(argv)

    load_dotenv()  # load OPENAI_API_KEY if present
    if not os.getenv("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY is not set (set in environment or in a .env file)", file=sys.stderr)
        return 2

    base_dir = Path.cwd()
    prompt_path = (Path(args.prompt) if os.path.isabs(args.prompt) else base_dir / args.prompt).resolve()
    system_prompt, user_prompt = read_prompts_from_markdown(prompt_path)

    input_paths: List[Path] = []
    if args.files:
        for f in args.files:
            p = (Path(f) if os.path.isabs(f) else base_dir / f).resolve()
            if not p.exists() or not p.is_file():
                print(f"ERROR: File not found: {p}", file=sys.stderr)
                return 2
            input_paths.append(p)
    else:
        input_dir = (Path(args.input_dir) if os.path.isabs(args.input_dir) else base_dir / args.input_dir).resolve()
        if not input_dir.exists() or not input_dir.is_dir():
            print(f"ERROR: Input directory not found: {input_dir}", file=sys.stderr)
            return 2
        # Collect supported files from directory (non-recursive)
        for p in sorted(input_dir.iterdir()):
            if p.is_file() and (is_image_file(p) or is_pdf_file(p)):
                input_paths.append(p)
        if not input_paths:
            print(f"ERROR: No supported files found in directory: {input_dir}", file=sys.stderr)
            return 2

    if args.max_files and args.max_files > 0:
        input_paths = input_paths[: args.max_files]

    image_paths = [p for p in input_paths if is_image_file(p)]
    pdf_paths = [p for p in input_paths if is_pdf_file(p)]
    other = [p for p in input_paths if p not in image_paths and p not in pdf_paths]
    if other:
        print(f"WARNING: Ignoring unsupported file types: {', '.join(str(p) for p in other)}", file=sys.stderr)

    client = OpenAI()

    # Encode images to data URIs for Vision
    image_uris = [encode_image_to_data_uri(p) for p in image_paths]

    # Upload PDFs for retrieval
    pdf_file_ids = upload_pdfs_for_retrieval(client, pdf_paths) if pdf_paths else []

    output_text = call_model(
        client=client,
        model=args.model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        image_data_uris=image_uris,
        pdf_file_ids=pdf_file_ids,
    )

    # Ensure valid JSON and pretty-print
    try:
        data = json.loads(output_text)
    except json.JSONDecodeError:
        # If the model returned something non-JSON despite our constraints, wrap raw text
        data = {"raw": output_text}

    # Post-process: set report_ids and normalize flags
    try:
        pdf_names = [p.name for p in pdf_paths]
        if isinstance(data, dict):
            data = normalize_flags_and_context(data, pdf_names)
    except Exception:
        pass

    output_path = (Path(args.output) if os.path.isabs(args.output) else base_dir / args.output).resolve()
    output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))


