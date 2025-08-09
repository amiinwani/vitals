Backend script to extract clinical lab results from PDFs and images using OpenAI's Responses API.

Requirements
- Python 3.9+
- An OpenAI API key available as environment var `OPENAI_API_KEY` (you can put it in a `.env` file)

Install (pip/venv)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Usage
```bash
# Option A: read from a directory (default: input_files)
python extract_labs.py --model gpt-4.1 --output labs.json --input-dir input_files

# Option B: pass explicit files
python extract_labs.py --model gpt-4.1 --output labs.json \
  /abs/path/report1.pdf /abs/path/lab2.jpg /abs/path/lab3.png
```

Notes
- The script reads `SYSTEM` and `USER` blocks from `ai-prompt.md` and sends them as system and user prompts.
- PDFs are uploaded and attached for retrieval via `file_search`.
- Images are embedded as Vision inputs via data URIs.
- The model is asked to return JSON only and the response is saved to the `--output` path.
- Use `--max-files` to cap how many items are sent if your directory has more than 5–7.

