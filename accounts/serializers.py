from django.utils import timezone
from rest_framework import serializers

from accounts.auth import check_super_admin_login, issue_tokens_for_user, make_super_admin_refresh_token
from accounts.models import User


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=180)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(min_length=8, write_only=True)
    organization_name = serializers.CharField(max_length=200)

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("phone"):
            raise serializers.ValidationError("ایمیل یا شماره موبایل الزامی است.")
        email = (attrs.get("email") or "").lower()
        if email and User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "این ایمیل قبلاً ثبت شده است."})
        if attrs.get("phone") and User.objects.filter(phone=attrs["phone"]).exists():
            raise serializers.ValidationError({"phone": "این شماره قبلاً ثبت شده است."})
        attrs["email"] = email
        return attrs

    def create(self, validated):
        from organizations.services import provision_organization

        user = User.objects.create_user(
            email=validated.get("email") or None,
            phone=validated.get("phone") or None,
            password=validated["password"],
            full_name=validated["full_name"],
        )
        org = provision_organization(owner=user, name=validated["organization_name"])
        return user, org


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        login = (attrs.get("login") or "").strip()
        password = attrs.get("password") or ""
        if check_super_admin_login(login, password):
            refresh = make_super_admin_refresh_token(login)
            return {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "role": "platform_admin",
            }
        if "@" in login:
            user = User.objects.filter(email__iexact=login).first()
        else:
            user = User.objects.filter(phone=login).first()
        if user is None or not user.check_password(password):
            raise serializers.ValidationError("نام کاربری یا رمز عبور نادرست است.")
        if not user.is_active:
            raise serializers.ValidationError("حساب کاربری غیرفعال است.")
        if user.is_locked():
            raise serializers.ValidationError("حساب موقتاً قفل شده است. بعداً تلاش کنید.")
        user.failed_login_count = 0
        user.last_login_at = timezone.now()
        user.save(update_fields=["failed_login_count", "last_login_at"])
        return issue_tokens_for_user(user)


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "phone", "full_name", "locale", "is_platform_admin")


class SetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_str
        from django.utils.http import urlsafe_base64_decode

        try:
            user_id = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=user_id)
        except (ValueError, TypeError, OverflowError, User.DoesNotExist) as exc:
            raise serializers.ValidationError("لینک تعیین رمز نامعتبر است.") from exc
        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError("لینک منقضی یا نامعتبر است.")
        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["password"])
        user.save(update_fields=["password"])
        return user
