from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    database_url: str = ""  # no longer used; kept for .env compatibility
    clerk_secret_key: str
    clerk_publishable_key: str
    frontend_url: str = "http://localhost:3000"

    # Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 200

    # RAG
    top_k_results: int = 5

    class Config:
        env_file = ".env"


settings = Settings()
