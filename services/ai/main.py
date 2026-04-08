import os
import io
from typing import Any
import pandas as pd
import anthropic
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="OpsTrack AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


class DefectAnalysisRequest(BaseModel):
    defects: list[dict[str, Any]]


class AnalysisResponse(BaseModel):
    summary: str
    risk_areas: list[str]
    recommendations: list[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalysisResponse)
def analyze_defects(request: DefectAnalysisRequest):
    if not request.defects:
        raise HTTPException(status_code=400, detail="No defects provided")

    defect_text = "\n".join(
        f"- [{d.get('severity', 'unknown').upper()}] {d.get('title', 'N/A')}: {d.get('description', 'N/A')} (status: {d.get('status', 'unknown')})"
        for d in request.defects
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": f"""You are an aerospace operations analyst. Analyze these defects and return a JSON object with exactly these keys:
- "summary": a 2-3 sentence plain-language summary of the defect patterns
- "risk_areas": a list of 3-5 short strings identifying risk areas
- "recommendations": a list of 3-5 short actionable recommendation strings

Defects:
{defect_text}

Return only valid JSON, no markdown.
""",
            }
        ],
    )

    import json, re
    try:
        raw = message.content[0].text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        data = json.loads(raw)
        return AnalysisResponse(**data)
    except Exception:
        return AnalysisResponse(
            summary=message.content[0].text,
            risk_areas=[],
            recommendations=[],
        )


@app.post("/import-csv")
async def import_csv(file: UploadFile = File(...)):
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {e}")

    required = {"title", "description", "severity", "status"}
    missing = required - set(df.columns.str.lower())
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")

    df.columns = df.columns.str.lower()
    records = df[list(required)].fillna("").to_dict(orient="records")

    return {"imported": len(records), "preview": records[:5]}
