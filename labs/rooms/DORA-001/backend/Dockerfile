FROM python:3.11-alpine
WORKDIR /app
RUN pip install --no-cache-dir flask requests
COPY app.py /app/app.py
EXPOSE 8081
CMD ["python", "/app/app.py"]
