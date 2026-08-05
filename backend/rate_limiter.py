"""
rate_limiter.py — Central slowapi Limiter instance for Benkyo API.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
