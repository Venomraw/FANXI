from passlib.context import CryptContext

# Define how we hash passwords (using Bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Converts a plain password into a secure, unreadable hash."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies if the login password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)