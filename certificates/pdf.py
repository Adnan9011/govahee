from __future__ import annotations

import base64
import html
import io
import re
from pathlib import Path

import qrcode
from django.conf import settings

from certificates.services import verification_url_for
from certificates.variables import render_variables, substitute_canvas
from pdfs.provider import get_pdf_provider

FORMAT_MM = {
    "a4_portrait": (210, 297),
    "a4_landscape": (297, 210),
    "a5_portrait": (148, 210),
    "a5_landscape": (210, 148),
    "letter_portrait": (216, 279),
    "letter_landscape": (279, 216),
}

_ATTACHMENT_RE = re.compile(r"/attachments/(\d+)/")


def sample_variables(locale: str = "fa") -> dict[str, str]:
    if locale == "en":
        return {
            "recipient_name": "Ali Ahmadi",
            "recipient_first_name": "Ali",
            "recipient_last_name": "Ahmadi",
            "certificate_number": "CERT-2026-000001",
            "course_name": "English Language – B2",
            "course_code": "EN-B2",
            "issue_date": "2026-08-28",
            "expiry_date": "",
            "duration": "40 hours",
            "score": "92",
            "grade": "A",
            "issuer_name": "Sample Institute",
            "issuer_title": "Director",
            "organization_name": "Sample Institute",
            "verification_url": "https://example.com/verify/preview",
            "verification_code": "PREVIEW",
            "recipient_id": "STU-1",
        }
    return {
        "recipient_name": "علی احمدی",
        "recipient_first_name": "علی",
        "recipient_last_name": "احمدی",
        "certificate_number": "CERT-2026-000001",
        "course_name": "زبان انگلیسی – B2",
        "course_code": "EN-B2",
        "issue_date": "2026-08-28",
        "expiry_date": "",
        "duration": "۴۰ ساعت",
        "score": "۹۲",
        "grade": "A",
        "issuer_name": "آموزشگاه نمونه",
        "issuer_title": "مدیر آموزش",
        "organization_name": "آموزشگاه نمونه",
        "verification_url": "https://example.com/verify/preview",
        "verification_code": "PREVIEW",
        "recipient_id": "STU-1",
    }


def _qr_data_uri(url: str) -> str:
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _embed_image_src(src: str) -> str:
    if not src or src.startswith("data:"):
        return src
    match = _ATTACHMENT_RE.search(src)
    if not match:
        return src
    from attachments.infrastructure.storage.factory import get_storage_provider
    from attachments.models import StoredFile

    stored = StoredFile.objects.filter(pk=int(match.group(1))).first()
    if stored is None:
        return src
    try:
        stream = get_storage_provider().open_stream(storage_key=stored.storage_key)
        data = stream.read()
        stream.close()
    except Exception:
        return src
    mime = stored.mime_type or "image/png"
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _font_css() -> str:
    font_dir = Path(settings.BASE_DIR) / "static" / "fonts"
    faces = []
    mapping = [
        ("Vazirmatn-Regular.woff2", 400),
        ("Vazirmatn-Bold.woff2", 700),
    ]
    for name, weight in mapping:
        path = font_dir / name
        if path.exists():
            encoded = base64.b64encode(path.read_bytes()).decode("ascii")
            faces.append(
                f"@font-face {{ font-family: 'Vazirmatn'; "
                f"src: url('data:font/woff2;base64,{encoded}') format('woff2'); "
                f"font-weight: {weight}; font-style: normal; }}"
            )
    if faces:
        return "\n".join(faces)
    return (
        "@font-face { font-family: 'Vazirmatn'; src: local('Vazirmatn'), local('Tahoma'); }"
    )


def render_canvas_html(
    *,
    canvas: dict,
    locale: str,
    fmt: str,
    variables: dict[str, str],
    qr_url: str,
) -> str:
    width, height = FORMAT_MM.get(fmt, (297, 210))
    width = canvas.get("width_mm") or width
    height = canvas.get("height_mm") or height
    canvas = substitute_canvas(canvas, variables)
    bg = (canvas.get("background") or {}).get("color") or "#ffffff"
    direction = "rtl" if locale == "fa" else "ltr"
    qr_uri = _qr_data_uri(qr_url)
    elements_html = []
    for el in canvas.get("elements", []):
        elements_html.append(_element_html(el, direction, qr_uri))
    return f"""<!doctype html>
<html lang="{html.escape(locale)}" dir="{direction}">
<head>
<meta charset="utf-8"/>
<style>
{_font_css()}
@page {{ size: {width}mm {height}mm; margin: 0; }}
html, body {{ margin: 0; padding: 0; width: {width}mm; height: {height}mm; }}
body {{ background: {bg}; font-family: Vazirmatn, Tahoma, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.sheet {{ position: relative; width: {width}mm; height: {height}mm; overflow: hidden; }}
table.cert-table {{ width: 100%; height: 100%; border-collapse: collapse; font-size: 10pt; }}
table.cert-table td {{ border: 0.4pt solid #94a3b8; padding: 1mm 2mm; }}
</style>
</head>
<body>
<div class="sheet">
{''.join(elements_html)}
</div>
</body>
</html>"""


def _element_html(el: dict, direction: str, qr_uri: str) -> str:
    el_type = el.get("type")
    x = el.get("x", 0)
    y = el.get("y", 0)
    w = el.get("width", 40)
    h = el.get("height", 10)
    style = (
        f"position:absolute;left:{x}mm;top:{y}mm;width:{w}mm;height:{h}mm;"
        f"overflow:hidden;"
    )
    if el_type == "text":
        align = el.get("align", "center")
        size = el.get("fontSize", 16)
        weight = el.get("fontWeight", 500)
        color = el.get("color", "#111")
        font = el.get("font", "Vazirmatn")
        content = html.escape(str(el.get("content", "")))
        return (
            f'<div style="{style}font-family:{html.escape(str(font))},Tahoma,sans-serif;'
            f"font-size:{size}pt;font-weight:{weight};color:{html.escape(str(color))};"
            f"text-align:{html.escape(str(align))};direction:{el.get('direction', direction)};"
            f'line-height:1.4;white-space:pre-wrap;">{content}</div>'
        )
    if el_type == "qr":
        return f'<img alt="QR" src="{qr_uri}" style="{style}object-fit:contain;" />'
    if el_type == "shape":
        fill = html.escape(str(el.get("fill", "#0f766e")))
        radius = el.get("radius", 0)
        return f'<div style="{style}background:{fill};border-radius:{radius}mm;"></div>'
    if el_type == "line":
        color = html.escape(str(el.get("color", "#111")))
        return f'<div style="{style}border-top:1.2pt solid {color};height:0;"></div>'
    if el_type == "table":
        rows = el.get("rows") or [["", ""]]
        cells = []
        for row in rows:
            tds = "".join(f"<td>{html.escape(str(cell))}</td>" for cell in row)
            cells.append(f"<tr>{tds}</tr>")
        return f'<div style="{style}"><table class="cert-table">{"".join(cells)}</table></div>'
    if el_type == "watermark":
        content = html.escape(str(el.get("content", "")))
        opacity = el.get("opacity", 0.12)
        return (
            f'<div style="{style}display:flex;align-items:center;justify-content:center;'
            f"opacity:{opacity};font-size:{el.get('fontSize', 28)}pt;font-weight:800;"
            f'color:#64748b;transform:rotate(-18deg);">{content}</div>'
        )
    if el_type in {"image", "logo", "signature", "seal"}:
        src = _embed_image_src(el.get("src") or "")
        if not src:
            return ""
        opacity = el.get("opacity", 1)
        return f'<img alt="" src="{src}" style="{style}object-fit:contain;opacity:{opacity};" />'
    return ""


def canvas_to_html(certificate) -> str:
    version = certificate.template_version
    canvas = (version.canvas if version else {}) or {}
    fmt = certificate.template.format if certificate.template else "a4_landscape"
    locale = certificate.template.locale if certificate.template else "fa"
    url = verification_url_for(certificate.verification_token)
    variables = render_variables(certificate, verification_url=url)
    return render_canvas_html(
        canvas=canvas,
        locale=locale,
        fmt=fmt,
        variables=variables,
        qr_url=url,
    )


def canvas_preview_html(template, extra_vars: dict | None = None) -> str:
    version = template.current_version
    canvas = (version.canvas if version else {}) or {}
    variables = sample_variables(template.locale)
    if extra_vars:
        variables.update({k: str(v) for k, v in extra_vars.items()})
    return render_canvas_html(
        canvas=canvas,
        locale=template.locale,
        fmt=template.format,
        variables=variables,
        qr_url=variables.get("verification_url") or "https://example.com/verify/preview",
    )


def render_certificate_pdf(certificate) -> bytes:
    html_doc = canvas_to_html(certificate)
    return get_pdf_provider().render_html(
        html_doc, base_url=getattr(settings, "SITE_URL", None)
    )
