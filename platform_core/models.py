from django.db import models


class PlatformSettings(models.Model):
    display_name = models.CharField(max_length=80, default="Govahi")
    display_name_fa = models.CharField(max_length=80, default="گواهی")
    support_email = models.EmailField(blank=True)
    default_locale = models.CharField(max_length=8, default="fa")
    payment_bitpay_enabled = models.BooleanField(default=False)
    bitpay_api_key = models.CharField(max_length=200, blank=True)
    bitpay_callback_url = models.URLField(blank=True)
    payment_zibal_enabled = models.BooleanField(default=False)
    zibal_merchant_id = models.CharField(max_length=200, blank=True)
    zibal_callback_url = models.URLField(blank=True)
    trial_days = models.PositiveSmallIntegerField(default=14)
    trial_certificate_limit = models.PositiveIntegerField(default=20)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "platform settings"

    @classmethod
    def get_singleton(cls) -> "PlatformSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class LegalDocument(models.Model):
    class Kind(models.TextChoices):
        TERMS = "terms"
        PRIVACY = "privacy"
        ISSUER_RESPONSIBILITY = "issuer_responsibility"
        ACCEPTABLE_USE = "acceptable_use"

    kind = models.CharField(max_length=40, unique=True, choices=Kind.choices)
    title_fa = models.CharField(max_length=200)
    title_en = models.CharField(max_length=200)
    body_fa = models.TextField()
    body_en = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)
