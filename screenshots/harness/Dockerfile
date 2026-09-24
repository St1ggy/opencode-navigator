FROM --platform=linux/arm64 oven/bun@sha256:9e7e578981fed70a53195549fb03d3b0888c283ebd8143bf0526e34aae9f7f5d AS bun

FROM --platform=linux/arm64 ubuntu:26.04@sha256:e03767b4dc7cb87fc57b1f119d40d9a997ecc5570dc6e22d57d6b7e333bbe78c

ARG CA_CERTIFICATES_VERSION=20260601~26.04.1
ARG GHOSTTY_VERSION=1.3.0~us1-0ubuntu1.1
ARG OPENCODE_VERSION=1.18.30
ARG OPENCODE_SHA256=1e20b66e76afbb7c1e5cd9be7515d2744cb4ea3476ff57add1f7e9ad6fb3a32d
ARG NODE_VERSION=22.22.1
ARG NODE_SHA256=0f3550d58d45e5d3cf7103d9e3f69937f09fe82fb5dd474c66a5d816fa58c9ee
ARG NERD_FONT_VERSION=3.4.0
ARG NERD_FONT_SHA256=ef552a3e638f25125c6ad4c51176a6adcdce295ab1d2ffacf0db060caf8c1582

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update --error-on=any \
    && apt-get install -y --no-install-recommends \
      ca-certificates="$CA_CERTIFICATES_VERSION" \
      curl \
      dbus-x11 \
      fontconfig \
      fonts-noto-color-emoji \
      ghostty="$GHOSTTY_VERSION" \
      imagemagick \
      libgl1-mesa-dri \
      mesa-utils \
      openbox \
      picom \
      tini \
      x11-utils \
      x11-xserver-utils \
      xdotool \
      xvfb \
      xz-utils \
    && rm -rf /var/lib/apt/lists/*

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN curl -fsSLo /tmp/opencode.tgz "https://registry.npmjs.org/opencode-linux-arm64/-/opencode-linux-arm64-${OPENCODE_VERSION}.tgz" \
    && printf '%s  %s\n' "$OPENCODE_SHA256" /tmp/opencode.tgz | sha256sum -c - \
    && tar -xzf /tmp/opencode.tgz -C /usr/local/bin --strip-components=2 package/bin/opencode \
    && rm /tmp/opencode.tgz \
    && opencode --version
RUN curl -fsSLo /tmp/node.tar.xz "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-arm64.tar.xz" \
    && printf '%s  %s\n' "$NODE_SHA256" /tmp/node.tar.xz | sha256sum -c - \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
    && rm /tmp/node.tar.xz \
    && node --version

RUN curl -fsSLo /tmp/JetBrainsMono.tar.xz "https://github.com/ryanoasis/nerd-fonts/releases/download/v${NERD_FONT_VERSION}/JetBrainsMono.tar.xz" \
    && printf '%s  %s\n' "$NERD_FONT_SHA256" /tmp/JetBrainsMono.tar.xz | sha256sum -c - \
    && mkdir -p /usr/local/share/fonts/JetBrainsMonoNF \
    && tar -xJf /tmp/JetBrainsMono.tar.xz -C /usr/local/share/fonts/JetBrainsMonoNF \
      --wildcards 'JetBrainsMonoNerdFontMono-*.ttf' \
    && rm /tmp/JetBrainsMono.tar.xz

COPY assets/OpenCodeNavigatorCorners.ttf /usr/local/share/fonts/OpenCodeNavigatorCorners.ttf
RUN fc-cache -f \
    && fc-match 'JetBrainsMono Nerd Font Mono' \
    && fc-match 'OpenCode Navigator Corners'

WORKDIR /workspace
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY dist/tui.js dist/tui.js
COPY screenshots/harness /harness
RUN chmod +x /harness/capture.sh /harness/run-opencode.sh

ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    TZ=UTC \
    HOME=/tmp/home \
    XDG_CACHE_HOME=/tmp/cache \
    XDG_CONFIG_HOME=/tmp/config \
    XDG_DATA_HOME=/tmp/data \
    XDG_STATE_HOME=/tmp/state \
    OPENCODE_CONFIG_DIR=/tmp/config \
    OPENCODE_TUI_CONFIG=/tmp/tui.json \
    OPENCODE_DISABLE_AUTOUPDATE=true \
    OPENCODE_DISABLE_LSP_DOWNLOAD=true \
    OPENCODE_DISABLE_MODELS_FETCH=true \
    OPENCODE_DISABLE_TERMINAL_TITLE=true \
    TERM=xterm-256color \
    COLORTERM=truecolor

ENTRYPOINT ["/usr/bin/tini", "--", "/harness/capture.sh"]
