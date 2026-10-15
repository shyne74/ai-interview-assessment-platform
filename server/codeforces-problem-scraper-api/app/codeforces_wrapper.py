import copy
import re
import bs4
import requests


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def clean_text(text):
    if not text:
        return ""

    soup = bs4.BeautifulSoup(text, "html.parser")

    # Remove hidden Codeforces text
    for hidden in soup.select(".text-hidden"):
        hidden.decompose()

    # Convert HTML to plain text
    text = soup.get_text(" ", strip=True)

    # Remove Codeforces math delimiters
    text = text.replace("$$$", "")
    text = text.replace("$$", "")
    text = text.replace("$", "")

    # Common LaTeX replacements
    replacements = {
        r"\times": "×",
        r"\cdot": "·",
        r"\div": "÷",
        r"\leq": "≤",
        r"\le": "≤",
        r"\geq": "≥",
        r"\ge": "≥",
        r"\neq": "≠",
        r"\ne": "≠",
        r"\pm": "±",
        r"\rightarrow": "→",
        r"\to": "→",
        r"\leftarrow": "←",
        r"\ldots": "...",
        r"\dots": "...",
        r"\cdots": "...",
        r"\in": "∈",
        r"\notin": "∉",
        r"\%": "%",
        r"\_": "_",
        r"\#": "#",
        r"\&": "&",
        r"\{": "{",
        r"\}": "}",
        r"\left": "",
        r"\right": "",
        r"\quad": " ",
        r"\qquad": " ",
        r"\,": " ",
        r"\;": " ",
        r"\!": "",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # Remove formatting commands
    text = re.sub(
        r"\\text\{([^{}]*)\}",
        r"\1",
        text
    )

    text = re.sub(
        r"\\mathrm\{([^{}]*)\}",
        r"\1",
        text
    )

    text = re.sub(
        r"\\mathbf\{([^{}]*)\}",
        r"\1",
        text
    )

    # Simple superscript/subscript formatting
    text = re.sub(
        r"\^\{([^{}]+)\}",
        r"^\1",
        text
    )

    text = re.sub(
        r"_\{([^{}]+)\}",
        r"_\1",
        text
    )

    #LaTeX commands removal
    text = re.sub(
        r"\\[a-zA-Z]+",
        "",
        text
    )

    # Remove leftover braces
    text = text.replace("{", "")
    text = text.replace("}", "")

    # Normalize whitespace
    text = re.sub(
        r"\s+",
        " ",
        text
    ).strip()

    return text


def parse_limit(limit_elem):
    if not limit_elem:
        return None

    elem_copy = copy.copy(limit_elem)

    prop_title = elem_copy.find(
        "div",
        class_="property-title"
    )

    if prop_title:
        prop_title.decompose()

    text = elem_copy.get_text(
        " ",
        strip=True
    )

    match = re.search(
        r"([\d.]+)\s*([a-zA-Z]+)",
        text
    )

    if match:
        value = float(match.group(1))
        unit = match.group(2)

        return {
            "value": (
                int(value)
                if value.is_integer()
                else value
            ),
            "unit": unit
        }

    return None


def extract_pre_text(pre):
    if not pre:
        return ""

    pre_copy = copy.copy(pre)

    lines = pre_copy.find_all(
        "div",
        class_="test-example-line"
    )

    if lines:
        return "\n".join(
            line.get_text()
            for line in lines
        ).strip()

    for br in pre_copy.find_all("br"):
        br.replace_with("\n")

    return pre_copy.get_text().strip()


def get_section_content(elem):
    if not elem:
        return ""

    elem_copy = copy.copy(elem)

    sec_title = elem_copy.find(
        "div",
        class_="section-title"
    )

    if sec_title:
        sec_title.decompose()

    raw_html = "".join(
        str(child)
        for child in elem_copy.contents
    ).strip()

    return clean_text(
        raw_html
    )


def get_statement(ps):
    # Modern Codeforces structure
    legend = ps.find(
        "div",
        class_="legend"
    )

    if legend:
        return get_section_content(
            legend
        )

    header = ps.find(
        "div",
        class_="header"
    )

    known_classes = {
        "header",
        "input-specification",
        "output-specification",
        "sample-tests",
        "sample-test",
        "note"
    }

    parts = []

    curr = (
        header.next_sibling
        if header
        else (
            ps.contents[0]
            if ps.contents
            else None
        )
    )

    while curr:

        # Stop when another known section begins
        if (
            hasattr(curr, "get")
            and curr.get("class")
        ):

            classes = set(
                curr.get("class")
            )

            if classes.intersection(
                known_classes
            ):
                break

        # Collect statement blocks
        if (
            hasattr(curr, "name")
            and curr.name in ["div", "p"]
        ):

            parts.append(
                "".join(
                    str(child)
                    for child in curr.contents
                )
            )

        curr = curr.next_sibling

    return clean_text(
        "".join(parts).strip()
    )


def parse_problem(problem_link):
    urls_to_try = [
        problem_link
    ]

    # Try alternate contest URL too
    match = re.search(
        r"/problemset/problem/(\d+)/([a-zA-Z\d]+)",
        problem_link
    )

    if match:
        contest_id = match.group(1)
        index = match.group(2)

        contest_url = (
            f"https://codeforces.com/contest/"
            f"{contest_id}/problem/{index}"
        )

        if contest_url not in urls_to_try:
            urls_to_try.append(
                contest_url
            )

    response = None

    for url in urls_to_try:

        try:

            r = requests.get(
                url,
                headers=HEADERS,
                timeout=15
            )

            if (
                r.status_code == 200
                and r.url.rstrip("/")
                != "https://codeforces.com"
                and "problem-statement" in r.text
            ):

                response = r
                break

        except requests.RequestException:
            continue

    if not response:

        raise ValueError(
            f"Failed to fetch Codeforces problem from: {problem_link}"
        )

    soup = bs4.BeautifulSoup(
        response.text,
        "html.parser"
    )

    ps = soup.find(
        "div",
        class_="problem-statement"
    )

    if not ps:

        raise ValueError(
            "Could not find problem-statement container"
        )

    # ---------------- TITLE ----------------

    header = ps.find(
        "div",
        class_="header"
    )

    title_elem = (
        header.find(
            "div",
            class_="title"
        )
        if header
        else ps.find(
            "div",
            class_="title"
        )
    )

    title = (
        clean_text(
            title_elem.get_text(
                " ",
                strip=True
            )
        )
        if title_elem
        else None
    )

    if not title:

        raise ValueError(
            "Failed to extract problem title"
        )

    # ---------------- TIME LIMIT ----------------

    time_elem = (
        header.find(
            "div",
            class_="time-limit"
        )
        if header
        else ps.find(
            "div",
            class_="time-limit"
        )
    )

    time_limit = parse_limit(
        time_elem
    )

    if not time_limit:

        raise ValueError(
            "Failed to extract time limit"
        )

    # ---------------- MEMORY LIMIT ----------------

    memory_elem = (
        header.find(
            "div",
            class_="memory-limit"
        )
        if header
        else ps.find(
            "div",
            class_="memory-limit"
        )
    )

    memory_limit = parse_limit(
        memory_elem
    )

    if not memory_limit:

        raise ValueError(
            "Failed to extract memory limit"
        )

    # ---------------- STATEMENT ----------------

    statement = get_statement(
        ps
    )

    if not statement:

        raise ValueError(
            "Failed to extract problem statement"
        )

    # ---------------- INPUT ----------------

    input_elem = ps.find(
        "div",
        class_="input-specification"
    )

    input_spec = get_section_content(
        input_elem
    )

    # ---------------- OUTPUT ----------------

    output_elem = ps.find(
        "div",
        class_="output-specification"
    )

    output_spec = get_section_content(
        output_elem
    )

    # ---------------- SAMPLES ----------------

    samples = []

    sample_tests = (
        ps.find(
            "div",
            class_="sample-test"
        )
        or ps.find(
            "div",
            class_="sample-tests"
        )
    )

    if sample_tests:

        inputs = sample_tests.find_all(
            "div",
            class_="input"
        )

        outputs = sample_tests.find_all(
            "div",
            class_="output"
        )

        for inp, outp in zip(
            inputs,
            outputs
        ):

            pre_in = inp.find(
                "pre"
            )

            pre_out = outp.find(
                "pre"
            )

            samples.append({

                "input": extract_pre_text(
                    pre_in
                ),

                "output": extract_pre_text(
                    pre_out
                )

            })

    # ---------------- NOTE ----------------

    note_elem = ps.find(
        "div",
        class_="note"
    )

    note = get_section_content(
        note_elem
    )

    # final output

    return {
        "title": title,
        "timeLimit": time_limit,
        "memoryLimit": memory_limit,
        "statement": statement,
        "inputSpecification": input_spec,
        "outputSpecification": output_spec,
        "samples": samples,
        "note": note
    }