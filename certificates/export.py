from __future__ import annotations

import csv
import io


def sanitize_csv_cell(value) -> str:
    text = "" if value is None else str(value)
    if text[:1] in {"=", "+", "-", "@", "\t", "\r"}:
        return f"'{text}"
    return text


def certificates_to_csv(rows) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "certificate_number",
            "recipient_name",
            "recipient_email",
            "course_name",
            "status",
            "issue_date",
            "expiry_date",
            "verification_url",
        ]
    )
    from certificates.services import verification_url_for

    for cert in rows:
        writer.writerow(
            [
                sanitize_csv_cell(cert.certificate_number),
                sanitize_csv_cell(cert.recipient.full_name),
                sanitize_csv_cell(cert.recipient.email),
                sanitize_csv_cell(cert.course_name),
                sanitize_csv_cell(cert.public_status),
                sanitize_csv_cell(cert.issue_date),
                sanitize_csv_cell(cert.expiry_date),
                sanitize_csv_cell(verification_url_for(cert.verification_token)),
            ]
        )
    return buffer.getvalue()
