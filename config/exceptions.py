from rest_framework.views import exception_handler


_FRIENDLY = {
    "unique": "این مقدار قبلاً ثبت شده است.",
    "protected": "امکان حذف وجود ندارد چون رکوردهای وابسته به آن وجود دارد.",
}


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    data = response.data
    if isinstance(data, dict) and "detail" in data:
        return response

    # Flatten DRF ValidationError style into a single message when possible.
    if isinstance(data, dict):
        messages = []
        for key, value in data.items():
            if key in ("status_code",):
                continue
            if isinstance(value, list):
                messages.extend(str(item) for item in value)
            else:
                messages.append(str(value))
        if messages:
            response.data = {
                **data,
                "detail": messages[0] if len(messages) == 1 else messages,
            }
    return response
