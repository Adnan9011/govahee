class AttachmentError(Exception):
    """Base exception for attachment operations."""

    default_message = "خطای پیوست فایل."
    status_code = 400

    def __init__(self, message: str | None = None):
        self.message = message or self.default_message
        super().__init__(self.message)


class AttachmentValidationError(AttachmentError):
    default_message = "فایل نامعتبر است."
    status_code = 400


class AttachmentAccessDeniedError(AttachmentError):
    default_message = "دسترسی به این فایل مجاز نیست."
    status_code = 403


class AttachmentNotFoundError(AttachmentError):
    default_message = "فایل پیدا نشد."
    status_code = 404


class AttachmentStorageError(AttachmentError):
    default_message = "خطا در ذخیره‌سازی فایل."
    status_code = 500


class AttachmentConfigurationError(AttachmentStorageError):
    default_message = "تنظیمات ذخیره‌سازی ناقص است."
    status_code = 500


class AttachmentQuotaExceededError(AttachmentError):
    default_message = "سهمیه فضای ذخیره‌سازی تکمیل شده است."
    status_code = 403
