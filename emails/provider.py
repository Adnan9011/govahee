from __future__ import annotations

from abc import ABC, abstractmethod

from django.conf import settings
from django.core.mail import send_mail


class EmailProvider(ABC):
    @abstractmethod
    def send(
        self,
        *,
        to: str,
        subject: str,
        body: str,
        from_email: str | None = None,
    ) -> None:
        raise NotImplementedError


class DjangoEmailProvider(EmailProvider):
    def send(self, *, to: str, subject: str, body: str, from_email: str | None = None) -> None:
        send_mail(
            subject=subject,
            message=body,
            from_email=from_email or settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
            fail_silently=False,
        )


def get_email_provider() -> EmailProvider:
    return DjangoEmailProvider()
