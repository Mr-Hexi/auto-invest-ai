from django.db import models
from django.utils import timezone


class Portfolio(models.Model):
    """Represents a themed group of stocks."""

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.name


class Stock(models.Model):
    """Represents a stock entity tracked by the platform."""

    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        related_name="stocks",
        null=True,
        blank=True,
    )
    symbol = models.CharField(max_length=20, unique=True)
    company_name = models.CharField(max_length=255)
    sector = models.CharField(max_length=100)
    current_price = models.FloatField()
    predicted_price_1d = models.FloatField(null=True, blank=True)
    expected_change_pct = models.FloatField(null=True, blank=True)
    direction_signal = models.CharField(max_length=30, blank=True, default="")
    model_confidence_r2 = models.FloatField(null=True, blank=True)
    prediction_status = models.CharField(max_length=30, default="unavailable")
    recommended_action = models.CharField(max_length=50, blank=True, default="")
    prediction_updated_at = models.DateTimeField(null=True, blank=True, default=timezone.now)

    def __str__(self) -> str:
        return f"{self.symbol} - {self.company_name}"
