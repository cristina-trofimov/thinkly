from posthog import Posthog
from dotenv import load_dotenv
import os

load_dotenv()

POSTHOG_API_KEY = os.getenv("POSTHOG_API_KEY")
POSTHOG_HOST = os.getenv("POSTHOG_HOST")

posthog = Posthog(
    project_api_key=POSTHOG_API_KEY,
    host=POSTHOG_HOST
)