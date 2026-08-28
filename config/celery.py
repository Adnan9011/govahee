from celery import Celery

app = Celery("certificate_saas")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
