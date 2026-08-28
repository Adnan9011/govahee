from __future__ import annotations

import base64
import io

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


def _qr_data_uri(url: str) -> str:
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def canvas_to_html(certificate) -> str:
    version = certificate.template_version
    canvas = (version.canvas if version else {}) or {}
    fmt = certificate.template.format if certificate.template else "a4_landscape"
    width, height = FORMAT_MM.get(fmt, (canvas.get("width_mm", 297), canvas.get("height_mm", 210)))
    width = canvas.get("width_mm") or width
    height = canvas.get("height_mm") or height
    url = verification_url_for(certificate.verification_token)
    variables = render_variables(certificate, verification_url=url)
    canvas = substitute_canvas(canvas, variables)
    bg = (canvas.get("background") or {}).get("color") or "#ffffff"
    direction = "rtl" if (certificate.template and certificate.template.locale == "fa") else "ltr"
    qr_uri = _qr_data_uri(url)

    elements_html = []
    for el in canvas.get("elements", []):
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
            content = el.get("content", "")
            elements_html.append(
                f'<div style="{style}font-family:{font},Tahoma,sans-serif;font-size:{size}pt;'
                f"font-weight:{weight};color:{color};text-align:{align};"
                f'direction:{el.get("direction", direction)};line-height:1.4;">{content}</div>'
            )
        elif el_type == "qr":
            elements_html.append(
                f'<img alt="QR" src="{qr_uri}" style="{style}object-fit:contain;" />'
            )
        elif el_type == "shape":
            fill = el.get("fill", "#0f766e")
            radius = el.get("radius", 0)
            elements_html.append(
                f'<div style="{style}background:{fill};border-radius:{radius}mm;"></div>'
            )
        elif el_type == "line":
            color = el.get("color", "#111")
            elements_html.append(
                f'<div style="{style}border-top:1.2pt solid {color};height:0;"></div>'
            )
        elif el_type in {"image", "logo", "signature", "seal", "watermark"}:
            src = el.get("src") or ""
            if src:
                elements_html.append(
                    f'<img alt="" src="{src}" style="{style}object-fit:contain;opacity:{el.get("opacity", 1)};" />'
                )

    disclaimer = (
        "این صفحه اصالت صدور توسط سازمان ثبت‌شده در سامانه را نشان می‌دهد "
        "و به‌تنهایی اعتبار قانونی محتوای گواهی را تضمین نمی‌کند."
        if direction == "rtl"
        else "This page confirms issuance by a registered organization and does not itself confer legal validity."
    )
    return f"""<!doctype html>
<html lang="{certificate.template.locale if certificate.template else "fa"}" dir="{direction}">
<head>
<meta charset="utf-8"/>
<style>
@page {{ size: {width}mm {height}mm; margin: 0; }}
html, body {{ margin: 0; padding: 0; width: {width}mm; height: {height}mm; }}
body {{ background: {bg}; font-family: Vazirmatn, Tahoma, sans-serif; }}
.sheet {{ position: relative; width: {width}mm; height: {height}mm; overflow: hidden; }}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;800&display=swap" rel="stylesheet"/>
</head>
<body>
<div class="sheet">
{''.join(elements_html)}
</div>
<!-- {disclaimer} -->
</body>
</html>"""


def render_certificate_pdf(certificate) -> bytes:
    html = canvas_to_html(certificate)
    return get_pdf_provider().render_html(html, base_url=getattr(settings, "SITE_URL", None))
