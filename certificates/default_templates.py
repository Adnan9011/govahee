"""Built-in certificate canvases (mm coordinates)."""

from __future__ import annotations


def _text(eid, x, y, w, h, content, **extra):
    el = {
        "id": eid,
        "type": "text",
        "x": x,
        "y": y,
        "width": w,
        "height": h,
        "content": content,
        "align": extra.pop("align", "center"),
        "fontSize": extra.pop("fontSize", 16),
        "fontWeight": extra.pop("fontWeight", 500),
        "color": extra.pop("color", "#111827"),
        "font": extra.pop("font", "Vazirmatn"),
        "direction": extra.pop("direction", "rtl"),
    }
    el.update(extra)
    return el


def _sheet(name, locale, fmt, width, height, elements, background="#fffef8"):
    return {
        "name": name,
        "locale": locale,
        "format": fmt,
        "width_mm": width,
        "height_mm": height,
        "canvas": {
            "width_mm": width,
            "height_mm": height,
            "background": {"color": background},
            "elements": elements,
        },
    }


def builtin_templates() -> list[dict]:
    qr = {
        "id": "qr",
        "type": "qr",
        "x": 12,
        "y": 168,
        "width": 28,
        "height": 28,
    }
    number = _text(
        "num",
        40,
        175,
        120,
        12,
        "{{certificate_number}}",
        fontSize=10,
        align="left",
        color="#6b7280",
    )
    fa_common = [
        _text("org", 20, 18, 257, 12, "{{organization_name}}", fontSize=13, color="#0f766e"),
        _text("title", 20, 38, 257, 16, "گواهینامه", fontSize=22, fontWeight=800),
        _text("who", 20, 70, 257, 10, "این گواهی به", fontSize=12, color="#4b5563"),
        _text("name", 20, 84, 257, 16, "{{recipient_name}}", fontSize=24, fontWeight=800, color="#0f172a"),
        _text("course", 20, 112, 257, 14, "{{course_name}}", fontSize=16, fontWeight=700),
        _text("meta", 20, 136, 257, 10, "تاریخ صدور: {{issue_date}}", fontSize=11, color="#4b5563"),
        _text("issuer", 180, 168, 90, 10, "{{issuer_name}}", fontSize=11),
        qr,
        number,
    ]
    en_common = [
        _text("org", 20, 18, 257, 12, "{{organization_name}}", fontSize=13, color="#0f766e", direction="ltr"),
        _text("title", 20, 38, 257, 16, "Certificate", fontSize=22, fontWeight=800, direction="ltr"),
        _text("who", 20, 70, 257, 10, "This is to certify that", fontSize=12, color="#4b5563", direction="ltr"),
        _text("name", 20, 84, 257, 16, "{{recipient_name}}", fontSize=24, fontWeight=800, direction="ltr"),
        _text("course", 20, 112, 257, 14, "{{course_name}}", fontSize=16, fontWeight=700, direction="ltr"),
        _text("meta", 20, 136, 257, 10, "Issued: {{issue_date}}", fontSize=11, color="#4b5563", direction="ltr"),
        _text("issuer", 180, 168, 90, 10, "{{issuer_name}}", fontSize=11, direction="ltr"),
        qr,
        {**number, "direction": "ltr"},
    ]
    return [
        _sheet("Classic Academic", "fa", "a4_landscape", 297, 210, fa_common, "#fffbeb"),
        _sheet("Classic Academic EN", "en", "a4_landscape", 297, 210, en_common, "#fffbeb"),
        _sheet(
            "Modern Minimal",
            "fa",
            "a4_landscape",
            297,
            210,
            [
                {"id": "bar", "type": "shape", "x": 0, "y": 0, "width": 297, "height": 18, "fill": "#0f766e"},
                *_text_swap(fa_common, title="گواهی پایان دوره"),
            ],
            "#ffffff",
        ),
        _sheet(
            "Corporate",
            "en",
            "a4_landscape",
            297,
            210,
            [
                {"id": "bar", "type": "shape", "x": 0, "y": 0, "width": 8, "height": 210, "fill": "#134e4a"},
                *_text_swap(en_common, title="Certificate of Achievement"),
            ],
            "#f8fafc",
        ),
        _sheet("Language Certificate", "fa", "a4_landscape", 297, 210, fa_common, "#f0fdfa"),
        _sheet("Course Completion", "en", "a4_landscape", 297, 210, _text_swap(en_common, title="Certificate of Completion"), "#f8fafc"),
        _sheet("Workshop", "fa", "a4_landscape", 297, 210, _text_swap(fa_common, title="گواهی کارگاه"), "#fdf2f8"),
        _sheet("Attendance", "en", "a4_landscape", 297, 210, _text_swap(en_common, title="Certificate of Attendance"), "#eff6ff"),
    ]


def _text_swap(elements, title: str):
    out = []
    for el in elements:
        if el.get("id") == "title":
            out.append({**el, "content": title})
        else:
            out.append(el)
    return out
