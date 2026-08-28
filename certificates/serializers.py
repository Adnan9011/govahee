from rest_framework import serializers

from certificates.models import (
    Certificate,
    CertificateEvent,
    CertificateTemplate,
    CertificateType,
    IssuanceBatch,
    Recipient,
    TemplateVersion,
)


class CertificateTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateType
        fields = ("id", "name", "slug", "description", "default_template", "is_active")


class TemplateVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateVersion
        fields = ("id", "version", "canvas", "variables", "created_at")


class CertificateTemplateSerializer(serializers.ModelSerializer):
    current_version = TemplateVersionSerializer(read_only=True)

    class Meta:
        model = CertificateTemplate
        fields = (
            "id",
            "name",
            "description",
            "format",
            "width_mm",
            "height_mm",
            "locale",
            "is_system",
            "is_active",
            "current_version",
        )


class TemplateSaveSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=160, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    format = serializers.CharField(required=False)
    width_mm = serializers.IntegerField(required=False)
    height_mm = serializers.IntegerField(required=False)
    locale = serializers.CharField(required=False)
    canvas = serializers.JSONField()
    variables = serializers.ListField(child=serializers.CharField(), required=False)


class RecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipient
        fields = (
            "id",
            "email",
            "full_name",
            "first_name",
            "last_name",
            "phone",
            "external_id",
            "metadata",
        )


class CertificateListSerializer(serializers.ModelSerializer):
    recipient_name = serializers.CharField(source="recipient.full_name", read_only=True)
    recipient_email = serializers.EmailField(source="recipient.email", read_only=True)
    public_status = serializers.CharField(read_only=True)
    verification_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = (
            "id",
            "uuid",
            "certificate_number",
            "status",
            "public_status",
            "title",
            "course_name",
            "issue_date",
            "expiry_date",
            "recipient_name",
            "recipient_email",
            "verification_url",
            "view_count",
            "download_count",
            "verification_count",
            "created_at",
        )

    def get_verification_url(self, obj):
        from certificates.services import verification_url_for

        return verification_url_for(obj.verification_token)


class CertificateDetailSerializer(CertificateListSerializer):
    events = serializers.SerializerMethodField()
    recipient = RecipientSerializer(read_only=True)

    class Meta(CertificateListSerializer.Meta):
        fields = CertificateListSerializer.Meta.fields + (
            "recipient",
            "course_code",
            "duration",
            "score",
            "grade",
            "instructor_name",
            "issuer_name",
            "issuer_title",
            "description",
            "skills",
            "custom_fields",
            "revoke_reason",
            "template",
            "integrity_hash",
            "events",
        )

    def get_events(self, obj):
        return [
            {"kind": e.kind, "created_at": e.created_at, "metadata": e.metadata}
            for e in obj.events.all()
        ]


class IssueCertificateSerializer(serializers.Serializer):
    template_id = serializers.IntegerField()
    certificate_type_id = serializers.IntegerField(required=False, allow_null=True)
    recipient = serializers.DictField()
    title = serializers.CharField(required=False, allow_blank=True)
    course_name = serializers.CharField(required=False, allow_blank=True)
    course_code = serializers.CharField(required=False, allow_blank=True)
    duration = serializers.CharField(required=False, allow_blank=True)
    score = serializers.CharField(required=False, allow_blank=True)
    grade = serializers.CharField(required=False, allow_blank=True)
    instructor_name = serializers.CharField(required=False, allow_blank=True)
    issuer_name = serializers.CharField(required=False, allow_blank=True)
    issuer_title = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    skills = serializers.ListField(child=serializers.CharField(), required=False)
    custom_fields = serializers.DictField(required=False)
    issue_date = serializers.DateField(required=False)
    expiry_mode = serializers.CharField(required=False)
    expiry_value = serializers.IntegerField(required=False, allow_null=True)
    expiry_date = serializers.DateField(required=False, allow_null=True)
    idempotency_key = serializers.CharField(required=False, allow_blank=True)
    send_email = serializers.BooleanField(required=False, default=False)


class IssuanceBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssuanceBatch
        fields = (
            "id",
            "status",
            "source_filename",
            "column_mapping",
            "total_rows",
            "processed_rows",
            "success_count",
            "error_count",
            "error_report",
            "send_email",
            "created_at",
            "finished_at",
        )
