FROM python:3.11-alpine
WORKDIR /app
RUN pip install --no-cache-dir flask requests
COPY app.py /app/app.py
RUN adduser -D pos && mkdir -p /home/pos && echo "PMP{PAY001_USER_LOCAL}" > /home/pos/user.txt && echo "PMP{PAY001_ROOT_LOCAL}" > /root/root.txt
EXPOSE 8080
CMD ["python", "/app/app.py"]
