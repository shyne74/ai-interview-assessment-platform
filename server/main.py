import os 
import json
import re
from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from groq import Groq 
from dotenv import load_dotenv
import pandas as pd
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

load_dotenv()

app = FastAPI()

groq_api_key = os.getenv("GROQ_API_KEY")

if not groq_api_key:
   print("warning: the api key is not present")

client = Groq(api_key=groq_api_key)

# Ordered list of models to try. If one hits rate limit / OTPM cap, fall back automatically.
MODELS_TO_TRY = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b"
]


def call_groq_json(messages: list, temperature: float = 0.3, max_tokens: int = 1500) -> dict:
    """
    Robust helper to invoke Groq with automatic model fallback and JSON parsing.
    Prevents 429 OTPM token exhaustion.
    """
    last_err = None
    for model_name in MODELS_TO_TRY:
        try:
            kwargs = {
                "messages": messages,
                "model": model_name,
                "temperature": temperature,
                "response_format": {"type": "json_object"}
            }
            if max_tokens:
                kwargs["max_tokens"] = max_tokens
                
            response = client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content.strip()
            
            # Clean markdown codeblocks if model wrapped output
            if content.startswith("```"):
                lines = content.splitlines()
                if lines and lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()
                
            return json.loads(content)
        except Exception as e:
            print(f"[Groq Warning] Model '{model_name}' encountered: {str(e)}. Trying next available model...")
            last_err = e
            continue
            
    raise HTTPException(
        status_code=500,
        detail=f"All Groq AI models failed. Root error: {str(last_err)}"
    )


def extract_pdf_smart_text(reader: PdfReader, max_chars: int = 8000):
    """
    Extracts text from large PDFs without token exhaustion by smart sampling across chapters/pages.
    """
    total_pages = len(reader.pages)
    if total_pages == 0:
        return "", 0

    if total_pages <= 6:
        pages_to_sample = list(range(total_pages))
    else:
        # Sample beginning, middle, and end
        pages_to_sample = sorted(list(set([
            0, 1,
            total_pages // 3, (total_pages // 3) + 1,
            (2 * total_pages) // 3,
            total_pages - 2, total_pages - 1
        ])))

    per_page_budget = max(400, max_chars // max(1, len(pages_to_sample)))
    text_chunks = []
    
    for p_idx in pages_to_sample:
        if 0 <= p_idx < total_pages:
            try:
                page_raw = reader.pages[p_idx].extract_text() or ""
                cleaned = " ".join(page_raw.split())[:per_page_budget]
                if cleaned:
                    text_chunks.append(f"[Page {p_idx + 1}]: {cleaned}")
            except Exception:
                continue

    combined_text = "\n\n".join(text_chunks)
    return combined_text[:max_chars], total_pages


def clean_html(html: str) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    for hidden in soup.select(".text-hidden"):
        hidden.decompose()
    raw = soup.get_text(" ", strip=True)

    # 1. LaTeX mathematical symbol conversion
    latex_map = [
        (r'\\le\b|\\leq\b', '≤'),
        (r'\\ge\b|\\geq\b', '≥'),
        (r'\\ne\b|\\neq\b', '≠'),
        (r'\\times\b', '×'),
        (r'\\cdot\b', '·'),
        (r'\\dots\b|\\ldots\b|\\cdots\b', '...'),
        (r'\\oplus\b', '⊕'),
        (r'\\sum\b', '∑'),
        (r'\\prod\b', '∏'),
        (r'\\infty\b', '∞'),
        (r'\\approx\b', '≈'),
        (r'\\pm\b', '±'),
        (r'\\in\b', '∈'),
        (r'\\notin\b', '∉'),
        (r'\\subset\b', '⊂'),
        (r'\\subseteq\b', '⊆'),
        (r'\\rightarrow\b|\\to\b', '→'),
        (r'\\leftarrow\b', '←'),
        (r'\\bmod\b|\\mod\b', ' mod '),
        (r'\\gcd\b', 'gcd'),
        (r'\\min\b', 'min'),
        (r'\\max\b', 'max'),
        (r'\\log\b', 'log'),
        (r'\\ln\b', 'ln')
    ]
    for pattern, repl in latex_map:
        raw = re.sub(pattern, repl, raw)

    # Wrappers: \text{...}, \frac{a}{b}, \sqrt{x}
    raw = re.sub(r'\\sqrt\{([^}]+)\}', r'√(\1)', raw)
    raw = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1 / \2)', raw)
    raw = re.sub(r'\\(?:text|mathrm|mathit|mathbf|mathcal|texttt|textbf)\{([^}]+)\}', r'\1', raw)
    raw = raw.replace(r'\{', '{').replace(r'\}', '}').replace(r'\_', '_')

    # Strip $$$math$$$, $$math$$, $math$
    raw = re.sub(r'\${3}(.*?)\${3}', r'\1', raw)
    raw = re.sub(r'\${2}(.*?)\${2}', r'\1', raw)
    raw = re.sub(r'\$([^\$\n]+)\$', r'\1', raw)

    # Normalize hyphens and dashes
    raw = re.sub(r'[\u2010\u2011\u2012\u2013\u2014\u2015]', '-', raw)
    raw = re.sub(r'\\text\{---\}|---|--', ' - ', raw)

    # Superscripts and subscripts
    raw = re.sub(r'\^\{([^}]+)\}', r'^(\1)', raw)
    raw = re.sub(r'_\{([^}]+)\}', r'[\1]', raw)

    raw = re.sub(r'\\([a-zA-Z0-9])', r'\1', raw)
    raw = re.sub(r'[ \t]+', ' ', raw).strip()
    return raw


def scrape_codeforces_direct(contest_id: str, index: str):
    """
    Direct scraper for Codeforces problems when port 5001 scraper is not running.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    url = f"https://codeforces.com/problemset/problem/{contest_id}/{index}"
    res = requests.get(url, headers=headers, timeout=15)
    
    if res.status_code != 200:
        raise HTTPException(
            status_code=res.status_code,
            detail=f"Codeforces returned status {res.status_code}"
        )

    soup = BeautifulSoup(res.text, "html.parser")
    problem_div = soup.select_one(".problem-statement")
    if not problem_div:
        raise HTTPException(status_code=404, detail="Problem statement not found on Codeforces")

    title_elem = problem_div.select_one(".header .title")
    title = clean_html(title_elem.text) if title_elem else f"Problem {contest_id}{index}"

    time_limit_elem = problem_div.select_one(".header .time-limit")
    time_limit_str = time_limit_elem.text if time_limit_elem else "2 seconds"
    time_limit_num = 2000
    m_time = re.search(r"(\d+(\.\d+)?)", time_limit_str)
    if m_time:
        try:
            time_limit_num = int(float(m_time.group(1)) * 1000)
        except Exception:
            pass

    memory_limit_elem = problem_div.select_one(".header .memory-limit")
    memory_limit_str = memory_limit_elem.text if memory_limit_elem else "256 megabytes"
    memory_limit_num = 256
    m_mem = re.search(r"(\d+)", memory_limit_str)
    if m_mem:
        try:
            memory_limit_num = int(m_mem.group(1))
        except Exception:
            pass

    input_spec_div = problem_div.select_one(".input-specification")
    input_spec = clean_html(str(input_spec_div)) if input_spec_div else ""

    output_spec_div = problem_div.select_one(".output-specification")
    output_spec = clean_html(str(output_spec_div)) if output_spec_div else ""

    # Extract general statement paragraphs
    statement_parts = []
    for child in problem_div.children:
        if child.name == 'div':
            classes = child.get('class', [])
            if any(c in classes for c in ['input-specification', 'output-specification', 'sample-tests', 'sample-test', 'header']):
                continue
        if child.name:
            t = clean_html(str(child))
            if t:
                statement_parts.append(t)

    statement = "\n\n".join(statement_parts).strip() or clean_html(str(problem_div))

    # Extract test samples
    samples = []
    sample_tests = problem_div.select(".sample-test, .sample-tests")
    for st in sample_tests:
        inputs = st.select(".input pre")
        outputs = st.select(".output pre")
        for inp, outp in zip(inputs, outputs):
            samples.append({
                "input": clean_html(str(inp)),
                "output": clean_html(str(outp))
            })

    return {
        "contestId": contest_id,
        "index": index,
        "title": title,
        "statement": statement,
        "inputSpecification": input_spec,
        "outputSpecification": output_spec,
        "samples": samples,
        "timeLimit": time_limit_num,
        "memoryLimit": memory_limit_num
    }


@app.get('/health')
def healthcheck():
    """simple health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "fastapi ai engine",
        "groq_configured": bool(groq_api_key)
    }


class generateQuestionRequest(BaseModel):
    role: str
    domain: str
    difficulty: Optional[str] = "medium"
    num_questions: Optional[int] = 10
    num_question: Optional[int] = None


@app.post('/generate-question')
async def generate_questions(req: generateQuestionRequest):
    """
    Accepts role, domain, difficulty, and question count from Node.js Express.
    Calls Groq to generate structured interview questions.
    """
    count = req.num_questions if req.num_questions is not None else (req.num_question or 5)
    prompt = f"""
    You are an expert technical interviewer. 
    Generate exactly {count} technical interview questions based on:
    - Role: {req.role}
    - Domain/Topics: {req.domain}
    - Difficulty: {req.difficulty}

    CRITICAL REQUIREMENTS:
    1. Return ONLY a valid JSON object with a single key "questions" containing an array of objects.
    2. Do NOT include markdown blocks like ```json ... ``` or extra conversational text.
    
    Each question object inside the array must strictly follow this structure:
    {{
        "questionText": "Clear technical question text",
        "role": "{req.role}",
        "domain": "{req.domain}",
        "difficulty": "{req.difficulty}",
        "type": "technical",
        "idealAnswer": "Comprehensive model answer detailing expected concepts",
        "keypoint": ["Key concept 1", "Key concept 2"],
        "maxscore": 10,
        "timeLimit": 180
    }}
    """
    messages = [
        {"role": "system", "content": "You are a backend API assistant. Output ONLY valid JSON."},
        {"role": "user", "content": prompt}
    ]
    data = call_groq_json(messages, temperature=0.7, max_tokens=1500)
    
    if "questions" in data:
        question_list = data["questions"]
    elif isinstance(data, list):
        question_list = data
    else:
        question_list = list(data.values())[0]
        
    return {"questions": question_list}


class evaluateanswer(BaseModel):
    questionText: str
    idealAnswer: str
    keypoints: List[str]
    candidateAnswer: str


@app.post('/evaluate_answer')
async def evaluate_answer_oftest(req: evaluateanswer):
    """
    Evaluates a candidate's answer against the ideal answer and keypoints.
    """
    cleaned_ans = (req.candidateAnswer or "").strip()
    if not cleaned_ans:
        return {
            "technicalKnowledgeScore": 0,
            "completenessScore": 0,
            "relevanceScore": 0,
            "clarityScore": 0,
            "overallScore": 0.0,
            "feedback": "Candidate did not provide an answer for this question."
        }

    prompt = f"""
    You are an expert subject matter evaluator assessing a candidate's response.

    Question: {req.questionText}
    Ideal Answer Reference: {req.idealAnswer}
    Key Concepts Expected: {json.dumps(req.keypoints)}
    Candidate's Submitted Answer: {cleaned_ans}

    CRITICAL INSTRUCTIONS:
    1. Compare the candidate's answer against the ideal answer and key concepts.
    2. Assign integer scores from 0 to 10 for each criterion:
       - technicalKnowledgeScore
       - completenessScore
       - relevanceScore
       - clarityScore
    3. Calculate overallScore as the average of the 4 scores (rounded to 1 decimal place).
    4. Provide actionable, concise constructive feedback (2-3 sentences) summarizing strengths and missing nuances.
    5. Return ONLY a valid JSON object.

    Strict JSON Output Format:
    {{
        "technicalKnowledgeScore": 8,
        "completenessScore": 7,
        "relevanceScore": 9,
        "clarityScore": 8,
        "overallScore": 8.0,
        "feedback": "Concise feedback here..."
    }}
    """
    messages = [
        {"role": "system", "content": "You are a precise evaluation engine. Output ONLY valid JSON."},
        {"role": "user", "content": prompt}
    ]
    try:
        return call_groq_json(messages, temperature=0.2, max_tokens=500)
    except Exception as e:
        print("evaluate_answer fallback error:", e)
        # Fallback scoring if Groq is temporarily overloaded
        ans_len = len(cleaned_ans)
        est_score = min(9.0, max(2.0, round(ans_len / 40.0, 1)))
        return {
            "technicalKnowledgeScore": int(est_score),
            "completenessScore": int(est_score),
            "relevanceScore": int(est_score),
            "clarityScore": int(est_score),
            "overallScore": est_score,
            "feedback": "Candidate answer received and processed."
        }


class analyzeResultRequest(BaseModel):
    response: List[dict]
    roleTitle: str
    domain: Optional[str] = None


@app.post("/analyze-results")
async def analyze_results(req: analyzeResultRequest):
    responses = req.response
    role = req.roleTitle or "Subject Assessment"
    domain = req.domain or "General Knowledge"

    df = pd.DataFrame(responses)
    if not df.empty:
        df["overallScore"] = df["score"].apply(
            lambda x: x.get("overallScore", 0) if isinstance(x, dict) else 0
        )
        average_score = float(df["overallScore"].mean())
    else:
        average_score = 0
    
    prompt = f"""
    You are an expert assessment analytics engine.
    Analyze the following exam responses for the specific subject / role '{role}' in domain '{domain}':

    {json.dumps({
        "roleTitle": role,
        "domain": domain,
        "responses": responses,
        "averageScore": round(average_score, 1)
    })}

    CRITICAL REQUIREMENTS:
    1. Identify 3 to 5 skill categories STRICTLY relevant to '{role}' / '{domain}' and assign 0-100 percentage scores.
       (e.g., if role is Philosophy: use topics like 'Metaphysics', 'Epistemology', 'Ethics', 'Virtue Theory'. NEVER mention unrelated fields like React/JavaScript).
    2. Identify 2-3 specific Demonstrated Strengths strictly relevant to '{role}'.
    3. Identify 2-3 specific Growth Opportunities strictly relevant to '{role}'.
    4. Provide a diagnostic Performance Trend summary (1-2 sentences) relevant to '{role}'.
    5. Provide an overall Summary Feedback (2 sentences).
    6. Return ONLY valid JSON.

    Strict JSON Output:
    {{
        "skillBreakdown": {{
            "Core Topic 1": 80,
            "Core Topic 2": 65
        }},
        "strongAreas": ["Specific strength in {role}", "Demonstrated concept knowledge"],
        "weakAreas": ["Area needing deeper study in {role}", "Complex nuance application"],
        "performanceTrend": "Assessment overview for {role} candidate...",
        "summaryFeedback": "Detailed summary feedback for {role}..."
    }}
    """
    messages = [
        {"role": "system", "content": "You are a precise analytics engine. Output ONLY valid JSON."},
        {"role": "user", "content": prompt}
    ]
    try:
        return call_groq_json(messages, temperature=0.3, max_tokens=800)
    except Exception as e:
        print("analyze_results fallback error:", e)
        return {
            "skillBreakdown": {
                f"{domain} Concepts": int(average_score * 10),
                f"{role} Fundamentals": int(average_score * 10)
            },
            "strongAreas": [f"Demonstrated foundational understanding of {domain}"],
            "weakAreas": [f"Deepen analytical review of advanced {domain} topics"],
            "performanceTrend": f"Completed evaluation for {role} ({domain}).",
            "summaryFeedback": f"Candidate completed the {role} assessment with an overall score of {round(average_score, 1)}/10."
        }


@app.post("/get-codeforces-statement")
async def get_codeforces_statement(data: dict):
    contest_id = str(data.get("contestId", "")).strip()
    index = str(data.get("index", "")).strip()

    if not contest_id or not index:
        raise HTTPException(status_code=400, detail="contestId and index are required")

    # Step 1: Try local microservice on port 5001 if active
    try:
        response = requests.get(
            f"http://127.0.0.1:5001/?id={contest_id}/{index}",
            timeout=2
        )
        if response.status_code == 200:
            problem = response.json()
            title = problem.get("title")
            statement = clean_html(problem.get("statement"))
            if title and statement:
                samples = []
                for sample in problem.get("samples", []):
                    samples.append({
                        "input": clean_html(sample.get("input")),
                        "output": clean_html(sample.get("output"))
                    })
                return {
                    "contestId": contest_id,
                    "index": index,
                    "title": title,
                    "statement": statement,
                    "inputSpecification": clean_html(problem.get("inputSpecification")),
                    "outputSpecification": clean_html(problem.get("outputSpecification")),
                    "samples": samples,
                    "timeLimit": problem.get("timeLimit"),
                    "memoryLimit": problem.get("memoryLimit")
                }
    except Exception as e:
        print(f"[Scraper Warning] Port 5001 microservice offline: {e}. Falling back to direct Codeforces scraper...")

    # Step 2: Fallback to direct Codeforces web scraper
    try:
        return scrape_codeforces_direct(contest_id, index)
    except HTTPException:
        raise
    except Exception as e:
        print("Direct Codeforces scraper error:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve Codeforces problem {contest_id}/{index}: {str(e)}"
        )


@app.post('/evaluate-code')
async def evaluate_code(data: dict):
    code = data.get("code")
    problem = data.get("problem")
    execution_result = data.get("executionResult")
    
    if not code or not problem:
        raise HTTPException(
            status_code=400,
            detail="code and problem are required"
        )
    
    prompt = f"""
You are evaluating a coding interview submission.

PROBLEM:
{problem[:3000]}

CANDIDATE CODE:
{code[:4000]}

JUDGE / EXECUTION CONTEXT:
{execution_result}

Evaluate:
1. Approach
2. Time complexity
3. Space complexity
4. Code quality
5. Constructive feedback

Return JSON:
{{
    "approach": "...",
    "timeComplexity": "...",
    "spaceComplexity": "...",
    "codeQuality": "...",
    "feedback": "..."
}}
"""
    messages = [
        {"role": "system", "content": "You are a code assessment engine. Output ONLY valid JSON."},
        {"role": "user", "content": prompt}
    ]
    data = call_groq_json(messages, temperature=0.1, max_tokens=600)
    return {"evaluation": json.dumps(data) if isinstance(data, dict) else str(data)}


class EvaluateAdaptiveRequest(BaseModel):
    role: str
    domain: str
    questionText: str
    idealAnswer: str
    keypoints: List[str]
    candidateAnswer: str
    currentLevel: Optional[int] = 2


@app.post('/evaluate-adaptive')
async def evaluate_adaptive(req: EvaluateAdaptiveRequest):
    prompt = f"""
You are an advanced adaptive technical interviewer evaluating a candidate's answer in a live exam.
Role: {req.role}
Domain: {req.domain}
Question: {req.questionText}
Ideal Answer: {req.idealAnswer}
Key Concepts: {json.dumps(req.keypoints)}
Candidate's Answer: {req.candidateAnswer}
Current Level: {req.currentLevel} (1=Easy, 2=Medium, 3=Hard, 4=Expert)

CRITICAL INSTRUCTIONS:
1. Assign numerical score 0 to 10 (rounded to 1 decimal place).
2. Demonstrated strength (1 concise phrase).
3. Specific knowledge gap (1 concise phrase).
4. Constructive feedback (2 sentences).
5. Level progression:
   - score >= 8.0 -> levelShift = 1
   - score < 5.0 -> levelShift = -1
   - else -> levelShift = 0
6. Map nextLevel (1 to 4) to nextDifficulty ("easy", "medium", "hard").
7. Recommend a specific targeted technical sub-topic for the next question.

Strict JSON Format:
{{
    "score": 8.5,
    "strength": "Clean separation of concerns & async handling",
    "weakness": "Did not detail connection pooling nuances",
    "feedback": "Strong explanation of asynchronous patterns.",
    "levelShift": 1,
    "nextLevel": 3,
    "nextDifficulty": "hard",
    "nextTopic": "Database connection pooling"
}}
"""
    messages = [
        {"role": "system", "content": "Output ONLY valid JSON."},
        {"role": "user", "content": prompt}
    ]
    return call_groq_json(messages, temperature=0.2, max_tokens=600)


@app.post('/analyze-pdf-content')
async def analyze_pdf_content(file: UploadFile = File(...)):
    """
    Parses PDF (small or large), extracts smart sample text & returns structured topic taxonomy.
    """
    try:
        reader = PdfReader(file.file)
        text_sample, total_pages = extract_pdf_smart_text(reader, max_chars=7000)

        if not text_sample.strip():
            raise HTTPException(status_code=400, detail="No readable text found in PDF.")

        prompt = f"""
Analyze this document and extract a structured knowledge taxonomy:

DOCUMENT SAMPLE ({total_pages} total pages):
{text_sample}

REQUIREMENTS:
1. Provide a concise document summary (2 sentences).
2. ACCURATELY determine the detectedDomain / subject matter based STRICTLY on the document content (e.g. if the document is about Philosophy, output "Philosophy"; if it is about Psychology, output "Psychology"; if Backend, "Backend Engineering").
3. Extract 4 to 6 distinct core topics/modules present in this document.
4. For each topic:
   - id: unique id (e.g. "topic-1")
   - name: clear topic title
   - description: 1 sentence description
   - difficulty: "easy", "medium", or "hard"
   - keywords: array of 3 key terms
   - suggestedQuestions: array of 2 short question angles
5. Return ONLY valid JSON.

Strict JSON Output Format:
{{
    "summary": "This document explores core concepts...",
    "totalPages": {total_pages},
    "detectedDomain": "Accurate Subject / Role Name here",
    "topics": [
        {{
            "id": "topic-1",
            "name": "Core Module Name",
            "description": "Explores primary concepts.",
            "difficulty": "medium",
            "keywords": ["Term 1", "Term 2", "Term 3"],
            "suggestedQuestions": ["Key conceptual question."]
        }}
    ]
}}
"""
        messages = [
            {"role": "system", "content": "You are an expert document analysis engine. Output ONLY valid JSON."},
            {"role": "user", "content": prompt}
        ]
        data = call_groq_json(messages, temperature=0.2, max_tokens=900)
        data["extractedTextSnippet"] = text_sample[:2000]
        data["fullText"] = text_sample
        return data

    except HTTPException:
        raise
    except Exception as e:
        print("fastapi analyze pdf error:", str(e))
        raise HTTPException(status_code=500, detail=f"PDF analysis failed: {str(e)}")


class GenerateFromTopicsRequest(BaseModel):
    pdfText: Optional[str] = ""
    selectedTopics: List[str]
    role: str
    domain: Optional[str] = "General"
    difficulty: Optional[str] = "medium"
    num_questions: Optional[int] = 5
    assessmentType: Optional[str] = "theory"
    customPrompt: Optional[str] = ""


@app.post('/generate-questions-from-topics')
async def generate_questions_from_topics(req: GenerateFromTopicsRequest):
    count = req.num_questions or 5
    req_type = req.assessmentType or "theory"
    is_theory_only = req_type == "theory"

    prompt = f"""
Generate exactly {count} calibrated exam questions based on:
- Role/Subject: {req.role}
- Domain Topics: {req.domain}
- Target Difficulty: {req.difficulty}
- Assessment Type: {req_type}
- Selected Specific Topics: {json.dumps(req.selectedTopics)}
- Custom Focus: {req.customPrompt or 'None'}

Reference Context:
{req.pdfText[:4000] if req.pdfText else 'Use selected topics and subject standards.'}

CRITICAL RULES:
1. If Assessment Type is 'theory', ALL questions MUST be conceptual theory questions testing knowledge and principles. The 'type' MUST be 'technical' and 'assessmentType' MUST be 'theory'. (DO NOT create coding questions or programming tasks for non-coding/theory assessments).
2. If Assessment Type is 'coding', questions must test algorithmic/practical coding tasks with 'type': 'coding' and 'assessmentType': 'coding'.
3. Every question must be directly grounded in the selected topics for {req.role}.

Return JSON with key "questions":
{{
    "questions": [
        {{
            "questionText": "Detailed question...",
            "role": "{req.role}",
            "domain": "{req.domain}",
            "difficulty": "{req.difficulty}",
            "type": "{"coding" if req_type == "coding" else "technical"}",
            "assessmentType": "{"coding" if req_type == "coding" else "theory"}",
            "idealAnswer": "Comprehensive model answer...",
            "keypoint": ["Key concept 1", "Key concept 2"],
            "maxscore": 10,
            "timeLimit": 180
        }}
    ]
}}
"""
    messages = [
        {"role": "system", "content": "Output ONLY valid JSON containing a questions array."},
        {"role": "user", "content": prompt}
    ]
    data = call_groq_json(messages, temperature=0.3, max_tokens=1400)
    q_list = data.get("questions", [])
    if not isinstance(q_list, list):
        q_list = list(data.values())[0] if data else []
    return {"questions": q_list}


class AnalyzeJDRequest(BaseModel):
    jdText: str
    roleOverride: Optional[str] = None
    num_questions: Optional[int] = 5
    assessmentType: Optional[str] = "mixed"
    difficulty: Optional[str] = "medium"


@app.post('/analyze-and-generate-jd')
async def analyze_and_generate_jd(req: AnalyzeJDRequest):
    count = req.num_questions or 5
    prompt = f"""
Analyze this Job Description (JD) and generate {count} calibrated interview questions:

JOB DESCRIPTION:
{req.jdText[:5000]}

Parameters:
- Question Count: {count}
- Assessment Type: {req.assessmentType}
- Target Difficulty: {req.difficulty}
- Role Override: {req.roleOverride or 'Auto-detect'}

Requirements:
1. Extract Role Title (e.g., "Senior Backend Developer").
2. Extract Primary Tech Stack (array of 4 strings).
3. Seniority level (Junior, Mid, Senior, Lead).
4. Short 2-sentence summary.
5. Generate {count} tailored questions.

Strict JSON format:
{{
    "roleTitle": "Backend Developer",
    "seniority": "Senior",
    "primaryDomain": "Backend Systems",
    "techStack": ["Node.js", "PostgreSQL", "Kafka", "Docker"],
    "summary": "Looking for a backend engineer with distributed systems expertise.",
    "questions": [
        {{
            "questionText": "Question testing JD skill...",
            "role": "Backend Developer",
            "domain": "Backend Systems",
            "difficulty": "{req.difficulty}",
            "type": "technical",
            "assessmentType": "{req.assessmentType if req.assessmentType != 'mixed' else 'theory'}",
            "idealAnswer": "Comprehensive answer...",
            "keypoint": ["Keypoint 1", "Keypoint 2"],
            "maxscore": 10,
            "timeLimit": 180
        }}
    ]
}}
"""
    messages = [
        {"role": "system", "content": "You are a technical hiring analyst. Output ONLY valid JSON."},
        {"role": "user", "content": prompt}
    ]
    return call_groq_json(messages, temperature=0.3, max_tokens=1400)