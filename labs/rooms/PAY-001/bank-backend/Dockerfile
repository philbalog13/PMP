FROM python:3.11-alpine
WORKDIR /app
RUN pip install --no-cache-dir flask
COPY app.py /app/app.py
EXPOSE 9090
CMD ["python", "/app/app.py"]
