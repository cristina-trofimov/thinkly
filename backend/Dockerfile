FROM python:3.11-slim

# Set working directory
WORKDIR /app

COPY src/requirements.txt .
# COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY ./src .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
