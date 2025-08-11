## Clinical Lab Extraction (PDFs + Images) → Canonical JSON

This project is a minimal backend script that ingests 5–7 lab report files (PDFs and images), sends them to the OpenAI Responses API with a carefully engineered prompt, and writes back a single strict JSON object that follows a canonical schema. No OCR libraries are used; the model reads PDFs and images directly.

### What it does
- Accepts a bundle of user-uploaded files: PDFs and common image formats (PNG/JPG/JPEG/WEBP/GIF/BMP/TIF/TIFF/HEIC).
- Sends a system + user prompt from `ai-prompt.md` to a multimodal model and provides the files as inputs.
- Receives one JSON object back that conforms to the canonical schema defined in `ai-prompt.md`.
- Saves the JSON to disk (default: `labs.json`).
- Post-processing adjusts a few fields for consistency:
  - Sets `context.report_ids` to the list of input PDF basenames (e.g., `["lab1.pdf","lab2.pdf"]`).
  - Normalizes `flag` to "N" when a value is inside `[ref_low, ref_high]` and no flag was provided.

### Inputs
- Directory of files: default `input_files/`.
  - Supported: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.tif`, `.tiff`, `.heic`.
- Or explicit file paths via CLI.
- Prompts come from `ai-prompt.md`:
  - `SYSTEM` block: defines the job, schema, normalization rules, and constraints.
  - `USER` block: instructs the model to process the attached documents and return JSON only.

### Output
- A single JSON object with shape:
  - `patient`: sex, age_years, height_cm, weight_kg
  - `context`: collection_datetime, fasting_hours, lab_name, report_ids, notes, medications
  - `labs`: array of normalized observations, each with fields like `analyte`, `value`, `unit`, `ref_low`, `ref_high`, `flag`, `collected_at`, `value_original`, `unit_original`, `confidence`, `source`, `page`, `bbox`, `snippet`, etc. See `ai-prompt.md` for the full list and rules.
- The script enforces JSON-only output; if decoding fails, it safely wraps raw output under `{ "raw": "..." }`.

### Requirements
- Python 3.9+
- OpenAI API key set as environment variable `OPENAI_API_KEY` (a `.env` file is supported)
- Dependencies: `openai`, `python-dotenv` (see `requirements.txt`)

### Installation
Preferred (global pip):
```bash
pip install -r requirements.txt
```

Optional (virtual env):
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Usage (CLI)
Read from a directory (default: `input_files`):
```bash
python extract_labs.py --model gpt-4.1 --output labs.json --input-dir input_files
```

Pass explicit files:
```bash
python extract_labs.py --model gpt-4.1 --output labs.json \
  /abs/path/report1.pdf /abs/path/lab2.jpg /abs/path/lab3.png
```

CLI flags:
- `--input-dir`: directory to scan for supported files when you don’t pass explicit paths (default: `input_files`).
- `--max-files`: cap how many files are sent (default: 0, meaning no cap). Handy if your folder contains more than 5–7 files.
- `--model`: multimodal model to use (default: `gpt-4.1`). Must support images and file inputs in the Responses API.
- `--prompt`: path to `ai-prompt.md` (default: `ai-prompt.md`). The script extracts `SYSTEM` and `USER` blocks from it at runtime.
- `--output`: output JSON file path (default: `labs.json`).

### How it works (pipeline)
1. Loads `SYSTEM` and `USER` prompt blocks from `ai-prompt.md`.
2. Gathers inputs either from `--input-dir` or explicit args.
   - Images are base64-encoded and embedded as `input_image` items with a data URI.
   - PDFs are uploaded via the Files API (`purpose="assistants"`) and referenced as `input_file` items by `file_id`.
3. Calls the Responses API with:
   - `model`: e.g., `gpt-4.1`.
   - `input`: `[system_message, user_message_with_images_and_files]`.
   - `text.format: { "type": "json_object" }` to enforce JSON-only.
   - `temperature: 0` for deterministic extraction.
4. Parses the response and writes pretty-printed JSON to `--output`.
5. Post-processing:
   - Sets `context.report_ids` to PDF basenames.
   - If an observation’s flag is missing but `value`, `ref_low`, `ref_high` are present and `qualifier` is empty, sets `flag` to `L`, `N`, or `H` based on range.

### Canonical schema (overview)
The complete authoritative schema and rules are in `ai-prompt.md`. Highlights:
- Top-level keys: `patient`, `context`, `labs` (array).
- For each analyte:
  - Normalized `analyte` names (e.g., `LDL_C`, `ApoB`, `hsCRP`, `Ferritin`, etc.).
  - Unit normalization rules (e.g., mmol/L → mg/dL for many lipids and glucose).
  - Validation bounds to discard absurd values (set `value=null`, `confidence=0.0` but keep snippet).
  - Duplicates/merging: keep most recent per analyte across all documents.
  - Derived fields when rules allow (e.g., `TransferrinSaturation` and `LDL_C_derived`).
  - Provenance: carry `source`, plus `page`, `bbox`, `snippet` when visible.

### Conventions and optional enhancements
- In-range flag: we standardize `flag` to `"N"` for in-range results when not provided.
- `context.report_ids`: we populate PDF basenames automatically.
- Optional (nice-to-have, model permitting):
  - `unit_sensitive: true` for `Lp(a)` to denote non-convertible units.
  - Ensure `value_original` for every row (we include when conversions occur; we can extend to always fill or set null).
  - If a row states `fasting`, copy to the analyte’s `fasting` field.
  - Capture `specimen` and `method` when printed.
  These can be enforced via prompt tweaks or additional post-processing if desired.

### Example minimal output snippet
```json
{
  "patient": { "sex": "unspecified", "age_years": null, "height_cm": null, "weight_kg": null },
  "context": { "collection_datetime": null, "fasting_hours": null, "lab_name": null, "report_ids": ["lab1.pdf"], "notes": null, "medications": [] },
  "labs": [
    {
      "analyte": "ALT", "value": 35.5, "unit": "U/L",
      "ref_low": 0.0, "ref_high": 40.0, "flag": "N",
      "collected_at": "2025-08-07",
      "value_original": "35.5", "unit_original": "U/L",
      "confidence": 1.0,
      "source": "lab2.pdf", "page": 1, "bbox": null, "snippet": "ALT 35.5 U/L 0 - 40 U/L",
      "synonyms": ["SGPT"]
    }
  ]
}
```

### Operational notes
- Models and access: Use a multimodal model that supports image and file inputs via the Responses API (e.g., `gpt-4.1`). Access may vary by account/plan.
- Limits and cost: Total tokens scale with document size and number of files. Keep to ~5–7 files for best latency/cost.
- No OCR library: We rely on OpenAI’s built-in vision and PDF reading; no external OCR is used.
- Privacy: Documents and outputs are sent to OpenAI per your account’s data policies. Do not include PHI unless your compliance posture allows it.

### Troubleshooting
- `OPENAI_API_KEY is not set` → export it or add to `.env`:
  ```bash
  export OPENAI_API_KEY=sk-...
  ```
- 400 errors about unknown parameters → ensure you’re on a recent `openai` Python SDK and using the documented flags in this README.
- Model refuses JSON or returns text → we already request JSON; the script will wrap non-JSON output under `{ "raw": ... }`. Consider re-running or changing the model.
- Missing fields like `specimen`/`method`/`fasting` → depends on visibility in the source; tune prompts or add custom post-processing if critical.

### Project layout
- `ai-prompt.md`: The full extraction prompt and canonical schema.
- `extract_labs.py`: CLI script.
- `server.py`: FastAPI app exposing endpoints to run extraction and read last output.
- `requirements.txt`: Python dependencies.
- `input_files/`: Drop PDFs/images here by default.
- `labs.json`: Output file (created after a run).

---

## FastAPI server

A thin API layer over the existing extraction pipeline. It accepts multipart uploads (images/PDFs) or can run against the sample files in `input_files/`. Results are persisted to `labs.json` for local testing while also returned in the HTTP response.

### Install

```bash
pip install -r requirements.txt
```

Ensure your OpenAI key is available:

```bash
export OPENAI_API_KEY=sk-...
```

### Run

```bash
python server.py  # uvicorn with reload on port 8000
```

Server will listen on `http://127.0.0.1:8000`.

### Endpoints

- `GET /health` → `{ "status": "ok" }`
- `POST /labs/ingest`
  - Multipart form fields:
    - `files`: one or more files (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.tif`, `.tiff`, `.heic`)
    - `model` (optional, default `gpt-4.1`)
    - `prompt` (optional, default `ai-prompt.md`)
    - `use_sample` (optional boolean, if no files provided, process `input_files/`)
  - Response: canonical JSON (`patient`, `context`, `labs[]`). Also saved to `labs.json`.
- `GET /labs/last`
  - Returns the last written `labs.json`. 404 if it doesn’t exist yet.

### Curl examples

Upload PDFs/images:

```bash
curl -sS -X POST "http://127.0.0.1:8000/labs/ingest" \
  -H "Accept: application/json" \
  -F "files=@input_files/sample_lab_report_part1.pdf" \
  -F "files=@input_files/sample_lab_report_part2.pdf" \
  | jq .
```

Use sample folder (no upload):

```bash
curl -sS -X POST "http://127.0.0.1:8000/labs/ingest" \
  -H "Accept: application/json" \
  -F "use_sample=true" | jq .
```

Fetch last result:

```bash
curl -sS "http://127.0.0.1:8000/labs/last" | jq .
```

### Extending
- Enforce optional fields post-extraction (e.g., add `unit_sensitive` for `Lp(a)`, always fill `value_original`).
- Add schema validation step and fail-fast if the JSON doesn’t match `ai-prompt.md`.
- Add logging, metrics, or batch directories.
- Wrap as a REST endpoint (e.g., FastAPI) if you need a service instead of a CLI.

