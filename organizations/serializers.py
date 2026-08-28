from rest_framework import serializers

from organizations.models import (
    ApiKey,
    Branding,
    CustomField,
    EmailTemplate,
    Organization,
    OrganizationMembership,
    PublicIssuerProfile,
    Webhook,
    WebhookDelivery,
)


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "slug",
            "legal_name",
            "registration_number",
            "license_number",
            "issuing_authority",
            "website",
            "address",
            "contact_email",
            "contact_phone",
            "description",
            "locale",
            "certificate_number_prefix",
            "verification_status",
            "is_suspended",
            "issuance_enabled",
            "api_enabled",
            "verification_search_enabled",
            "public_issuer_page_enabled",
            "verification_indexable",
            "onboarding_completed_at",
        )
        read_only_fields = (
            "slug",
            "verification_status",
            "is_suspended",
            "issuance_enabled",
            "api_enabled",
            "onboarding_completed_at",
        )


class MembershipSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = ("id", "user", "email", "full_name", "role", "is_active", "created_at")
        read_only_fields = ("user", "created_at")


class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=180, required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=["admin", "issuer", "designer", "viewer"], default="issuer"
    )


class ApiKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiKey
        fields = (
            "id",
            "name",
            "prefix",
            "permissions",
            "last_used_at",
            "revoked_at",
            "created_at",
        )
        read_only_fields = fields


class ApiKeyCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)
    permissions = serializers.ListField(child=serializers.CharField(), required=False)


class WebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Webhook
        fields = ("id", "url", "events", "is_active", "created_at")
        read_only_fields = ("id", "created_at")


class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = (
            "id",
            "event",
            "status",
            "response_code",
            "attempt_count",
            "next_retry_at",
            "created_at",
        )


class BrandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branding
        fields = (
            "primary_color",
            "secondary_color",
            "font_family",
            "email_from_name",
            "verification_footer",
            "custom_domain",
            "logo_file",
        )


class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = (
            "id",
            "key",
            "label",
            "field_type",
            "is_public",
            "is_required",
            "sort_order",
        )


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = ("id", "kind", "subject", "body", "is_active")


class PublicIssuerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicIssuerProfile
        fields = (
            "headline",
            "about",
            "show_certificate_count",
            "show_programs",
            "is_published",
        )
