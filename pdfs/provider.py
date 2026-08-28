from __future__ import annotations

from abc import ABC, abstractmethod

from django.conf import settings


class PdfProvider(ABC):
    @abstractmethod
    def render_html(self, html: str, *, base_url: str | None = None) -> bytes:
        raise NotImplementedError


class WeasyPrintPdfProvider(PdfProvider):
    def render_html(self, html: str, *, base_url: str | None = None) -> bytes:
        from weasyprint import HTML

        return HTML(string=html, base_url=base_url).write_pdf()


class HtmlPdfProvider(PdfProvider):
    """Fallback used in tests without native WeasyPrint deps."""

    def render_html(self, html: str, *, base_url: str | None = None) -> bytes:
        return html.encode("utf-8")


def get_pdf_provider() -> PdfProvider:
    name = getattr(settings, "PDF_PROVIDER", "html")
    if name == "weasyprint":
        try:
            import weasyprint  # noqa: F401
        except ImportError:
            return HtmlPdfProvider()
        return WeasyPrintPdfProvider()
    return HtmlPdfProvider()
