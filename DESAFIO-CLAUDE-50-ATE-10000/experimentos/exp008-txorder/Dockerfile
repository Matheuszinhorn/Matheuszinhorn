ARG BASE_IMAGE=python:3.12-slim
FROM ${BASE_IMAGE}
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY txorder ./txorder
COPY tests ./tests
RUN python -m unittest discover -s tests
ENV DATA_DIR=/data MASTER_KEYPAIR=/keys/master.json
ENTRYPOINT ["python", "-m", "txorder.cli"]
CMD ["plan"]
