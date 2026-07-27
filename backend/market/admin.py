from django.contrib import admin
from .models import Company, Relationship, NewsEvent, BacktestPattern, GeneratedChain

admin.site.register(Company)
admin.site.register(Relationship)
admin.site.register(NewsEvent)
admin.site.register(BacktestPattern)
admin.site.register(GeneratedChain)
