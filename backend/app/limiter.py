from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance — imported by main.py (to attach to app)
# and by route modules (to apply @limiter.limit decorators).
limiter = Limiter(key_func=get_remote_address)
