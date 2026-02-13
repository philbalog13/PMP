# ~/.bashrc - Kali-style configuration for PMP CTF AttackBox

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# History settings
HISTCONTROL=ignoreboth
HISTSIZE=10000
HISTFILESIZE=20000
shopt -s histappend

# Check window size after each command
shopt -s checkwinsize

# Make less more friendly for non-text input files
[ -x /usr/bin/lesspipe ] && eval "$(SHELL=/bin/sh lesspipe)"

# Kali-style colors
RED='\[\033[1;31m\]'
GREEN='\[\033[1;32m\]'
YELLOW='\[\033[1;33m\]'
BLUE='\[\033[1;34m\]'
PURPLE='\[\033[1;35m\]'
CYAN='\[\033[1;36m\]'
WHITE='\[\033[1;37m\]'
RESET='\[\033[0m\]'

# Kali-style prompt with colors
if [ "$EUID" -eq 0 ]; then
    # Root prompt (red)
    PS1="${RED}┌──(${WHITE}root${RED}💀${WHITE}pmp-attackbox${RED})─[${CYAN}\w${RED}]\n${RED}└─${WHITE}# ${RESET}"
else
    # User prompt (blue/green)
    PS1="${BLUE}┌──(${GREEN}\u${BLUE}@${GREEN}pmp-attackbox${BLUE})─[${CYAN}\w${BLUE}]\n${BLUE}└─${GREEN}\$ ${RESET}"
fi

# Enable color support for ls and add handy aliases
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
    alias dir='dir --color=auto'
    alias vdir='vdir --color=auto'
    alias grep='grep --color=auto'
    alias fgrep='fgrep --color=auto'
    alias egrep='egrep --color=auto'
fi

# Colored GCC warnings and errors
export GCC_COLORS='error=01;31:warning=01;35:note=01;36:caret=01;32:locus=01:quote=01'

# ls aliases
alias ll='ls -alF --color=auto'
alias la='ls -A --color=auto'
alias l='ls -CF --color=auto'
alias lh='ls -lh --color=auto'

# Directory navigation
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'

# Safety aliases
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

# Network aliases
alias ports='netstat -tulanp'
alias myip='curl -s ifconfig.me'
alias listening='lsof -i -P -n | grep LISTEN'

# PMP CTF targets
export PMP_GATEWAY_URL="http://api-gateway:8000"
export PMP_HSM_URL="http://hsm-simulator:8011"
export PMP_SWITCH_URL="http://sim-network-switch:8004"
export PMP_ISSUER_URL="http://sim-issuer-service:8005"
export PMP_POS_URL="http://sim-pos-service:8002"
export PMP_ACS_URL="http://acs-simulator:8013"
export PMP_FRAUD_URL="http://sim-fraud-detection:8007"

# Quick attack aliases
alias gw='curl -sS "$PMP_GATEWAY_URL"'
alias hsm='curl -sS "$PMP_HSM_URL"'
alias switch='curl -sS "$PMP_SWITCH_URL"'
alias issuer='curl -sS "$PMP_ISSUER_URL"'
alias pos='curl -sS "$PMP_POS_URL"'
alias acs='curl -sS "$PMP_ACS_URL"'
alias fraud='curl -sS "$PMP_FRAUD_URL"'

# Useful functions
extract() {
    if [ -f "$1" ]; then
        case "$1" in
            *.tar.bz2)   tar xjf "$1"   ;;
            *.tar.gz)    tar xzf "$1"   ;;
            *.bz2)       bunzip2 "$1"   ;;
            *.rar)       unrar x "$1"   ;;
            *.gz)        gunzip "$1"    ;;
            *.tar)       tar xf "$1"    ;;
            *.tbz2)      tar xjf "$1"   ;;
            *.tgz)       tar xzf "$1"   ;;
            *.zip)       unzip "$1"     ;;
            *.Z)         uncompress "$1";;
            *.7z)        7z x "$1"      ;;
            *)           echo "'$1' cannot be extracted" ;;
        esac
    else
        echo "'$1' is not a valid file"
    fi
}

# Quick scan function
quickscan() {
    nmap -sV -sC -O "$1"
}

# Export PATH
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Enable programmable completion
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi
