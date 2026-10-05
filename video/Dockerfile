# Render do vídeo num Linux: nesta máquina, a política de integridade do Windows bloqueia o
# ffmpeg e o compositor do Remotion (executáveis sem assinatura). Ver o README.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 \
    libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 \
    libcairo2 libcups2 \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g bun@1.4.2
WORKDIR /repo/video
