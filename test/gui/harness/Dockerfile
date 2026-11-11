FROM mcr.microsoft.com/playwright:v1.65.0-noble

ARG MODE=release
ARG DESKTOP_ARCH=arm64
ARG DESKTOP_VERSION=2.2.6

WORKDIR /opt/navigator-smoke
RUN test "$MODE" = release && \
    curl --fail --location --retry 3 -o desktop.deb "https://github.com/anomalyco/opencode/releases/download/v${DESKTOP_VERSION}/opencode-desktop-linux-${DESKTOP_ARCH}.deb" && \
    curl --fail --location --retry 3 -o SHA256SUMS "https://github.com/anomalyco/opencode/releases/download/v${DESKTOP_VERSION}/SHA256SUMS" && \
    checksum="$(awk -v name="opencode-desktop-linux-${DESKTOP_ARCH}.deb" '$2 == name { print $1 }' SHA256SUMS)" && \
    test -n "$checksum" && printf '%s  desktop.deb\n' "$checksum" | sha256sum --check && \
    apt-get update && apt-get install --yes --no-install-recommends ./desktop.deb && \
    npm install --ignore-scripts --no-audit --no-fund @playwright/test@1.65.0

COPY test/gui/harness/run.mjs ./run.mjs
COPY test/gui/harness/toolbar.mjs ./toolbar.mjs
COPY test/gui/harness/fixture.cjs ./fixture.cjs
COPY test/gui/harness/server-fixture.mjs ./server-fixture.mjs
COPY test/gui/harness/codex-fixture.mjs ./codex-fixture.mjs
COPY test/gui/harness/quota.mjs ./quota.mjs
COPY test/gui/harness/settings.mjs ./settings.mjs
COPY test/gui/harness/gh-fixture.mjs ./gh-fixture.mjs
COPY test/gui/harness/presets.mjs ./presets.mjs
COPY test/gui/harness/settings-extras.mjs ./settings-extras.mjs
COPY test/gui/harness/preset-management.mjs ./preset-management.mjs
COPY test/gui/harness/capture.mjs ./capture.mjs
CMD ["xvfb-run", "--auto-servernum", "node", "/opt/navigator-smoke/run.mjs"]
