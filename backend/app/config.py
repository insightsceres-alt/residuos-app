from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Union, List
from pydantic import field_validator


class Settings(BaseSettings):
    # Application
    app_name: str = "Residuos API"
    environment: str = "development"
    debug: bool = True
    
    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "residuos"
    db_user: str = "postgres"
    db_password: str = "postgres"
    
    # AWS
    aws_region: str = "eu-west-1"
    s3_bucket_documents: str = ""
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS
    cors_origins: Union[str, List[str]] = ["*"]
    
    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list"""
        if isinstance(v, str):
            if not v or v.strip() == "":
                return ["*"]
            # Si es una string, separar por comas
            return [origin.strip() for origin in v.split(',')]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields
    
    @property
    def database_url(self) -> str:
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    @property
    def async_database_url(self) -> str:
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
