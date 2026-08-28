from celery import Celery

app = Celery("certificate_saas")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

try:
    from django.conf import settings as django_settings

    if getattr(django_settings, "CELERY_TASK_ALWAYS_EAGER", False):
        app.conf.task_always_eager = True
        app.conf.task_eager_propagates = True
except Exception:
    pass
