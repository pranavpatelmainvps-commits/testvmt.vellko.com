FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files
COPY . .

# Expose port (Backend uses 5000 by default in Flask)
EXPOSE 5000

# Run the backend (default command, can be overridden)
CMD ["python", "backend.py"]
