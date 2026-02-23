# PMP CTF AttackBox - Focused Security Terminal
FROM debian:bookworm

# Avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Update and install available tools
RUN apt-get update && apt-get install -y \
    # Core utilities
    bash \
    coreutils \
    findutils \
    grep \
    sed \
    gawk \
    less \
    vim \
    nano \
    tree \
    htop \
    file \
    wget \
    curl \
    ca-certificates \
    git \
    docker.io \
    tmux \
    sudo \
    locales \
    unzip \
    xxd \
    # Network tools
    net-tools \
    iproute2 \
    iputils-ping \
    traceroute \
    dnsutils \
    netcat-openbsd \
    socat \
    tcpdump \
    nmap \
    masscan \
    hping3 \
    tshark \
    wireshark-common \
    libpcap-dev \
    libcap2-bin \
    # Web tools
    httpie \
    jq \
    dirb \
    # Password & Crypto
    hydra \
    john \
    hashcat \
    openssl \
    perl \
    # Python & scripting
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install sqlmap via pip
RUN pip3 install --break-system-packages sqlmap 2>/dev/null || pip3 install sqlmap

# Additional offensive/analysis python toolkit for advanced CTF phases
RUN pip3 install --break-system-packages \
    scapy \
    pyiso8583 \
    impacket \
    scipy \
    pwntools

# Install Nikto from source (Debian bookworm does not provide a nikto package)
RUN git clone --depth 1 https://github.com/sullo/nikto.git /opt/nikto \
    && ln -sf /opt/nikto/program/nikto.pl /usr/local/bin/nikto \
    && chmod +x /opt/nikto/program/nikto.pl

# Nikto runtime Perl dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjson-perl \
    libxml-writer-perl \
    && rm -rf /var/lib/apt/lists/*

# Set locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8

# Install ffuf
RUN curl -sL https://github.com/ffuf/ffuf/releases/download/v2.1.0/ffuf_2.1.0_linux_amd64.tar.gz | tar xz -C /usr/local/bin ffuf \
    && chmod +x /usr/local/bin/ffuf

# Install ttyd for web terminal
RUN curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /usr/local/bin/ttyd \
    && chmod +x /usr/local/bin/ttyd

# Create common wordlists directory with inline content
RUN mkdir -p /usr/share/wordlists && \
    echo -e "admin\napi\nauth\nhealth\nstatus\nconfig\nkeys\nlogin\nregister\nusers\naccounts\ntransaction\ntransactions\nhsm\nchallenge\nauthenticate\nverify\ncheck\nprocess\nbin-table\nbalance\nauthorize\nencrypt\ndecrypt\ntokenize\ndetokenize" > /usr/share/wordlists/pmp-api.txt && \
    curl -sL "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/common.txt" -o /usr/share/wordlists/common.txt || echo "api\nhealth\nstatus" > /usr/share/wordlists/common.txt

# Create attackbox user
RUN useradd -m -s /bin/bash attacker && \
    echo "attacker:pmp2026" | chpasswd && \
    usermod -aG sudo attacker && \
    adduser attacker wireshark

# Allow packet capture without full root shell
RUN setcap cap_net_raw,cap_net_admin+eip /usr/bin/tshark && \
    setcap cap_net_raw,cap_net_admin+eip /usr/bin/tcpdump

WORKDIR /opt/attackbox

# Copy configuration files
COPY docker/ctf-attackbox/scripts/entrypoint.sh /entrypoint.sh
COPY docker/ctf-attackbox/scripts/lab.sh /usr/local/bin/lab
COPY docker/ctf-attackbox/scripts/tools.sh /usr/local/bin/tools
COPY docker/ctf-attackbox/scripts/smoke-tools.sh /usr/local/bin/smoke-tools
COPY docker/ctf-attackbox/samples /opt/attackbox/samples
COPY backend/api-gateway/src/data/ctf /opt/attackbox/ctf-data
COPY docker/ctf-attackbox/config/.bashrc /home/attacker/.bashrc
COPY docker/ctf-attackbox/config/.bashrc /root/.bashrc
COPY docker/ctf-attackbox/config/banner.sh /etc/profile.d/01-banner.sh
COPY docker/ctf-attackbox/config/aliases.sh /etc/profile.d/02-aliases.sh

RUN chmod +x /entrypoint.sh /usr/local/bin/lab /usr/local/bin/tools /usr/local/bin/smoke-tools \
    /opt/attackbox/samples/timing-attack.py \
    /etc/profile.d/01-banner.sh /etc/profile.d/02-aliases.sh

# Set permissions
RUN chown -R attacker:attacker /home/attacker /opt/attackbox

# Validate toolchain against the official manifest.
RUN /usr/local/bin/smoke-tools

ENV TERM=xterm-256color \
    SHELL=/bin/bash \
    COLORTERM=truecolor

EXPOSE 7681

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://127.0.0.1:7681/ > /dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
