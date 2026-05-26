#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_REGION="us-west-1"

log() {
  printf '%s\n' "$*"
}

warn() {
  printf 'warning: %s\n' "$*" >&2
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

usage() {
  cat <<'EOF'
Usage:
  setup-tools.sh [options]

Options:
  --env-file PATH    Local .env file to load. Default: ./.env
  --help             Show this help
EOF
}

detect_os() {
  case "$(uname -s)" in
    Darwin) printf '%s\n' "darwin" ;;
    Linux) printf '%s\n' "linux" ;;
    *) die "unsupported operating system: $(uname -s)" ;;
  esac
}

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64) printf '%s\n' "x86_64" ;;
    aarch64|arm64) printf '%s\n' "aarch64" ;;
    *) die "unsupported architecture: $(uname -m)" ;;
  esac
}

ensure_tofu() {
  if command -v tofu >/dev/null 2>&1; then
    return 0
  fi

  if command -v brew >/dev/null 2>&1; then
    log "Installing OpenTofu with Homebrew"
    brew install opentofu
  else
    case "$(detect_os)" in
      darwin|linux)
        local tmpdir
        tmpdir="$(mktemp -d)"
        curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o "$tmpdir/install-opentofu.sh"
        chmod +x "$tmpdir/install-opentofu.sh"
        if ! "$tmpdir/install-opentofu.sh" --install-method standalone; then
          warn "Retrying OpenTofu install with integrity verification disabled"
          "$tmpdir/install-opentofu.sh" --install-method standalone --skip-verify
        fi
        rm -rf "$tmpdir"
        ;;
    esac
  fi

  command -v tofu >/dev/null 2>&1 || die "OpenTofu install completed but tofu is still unavailable in PATH"
}

ensure_aws_cli() {
  if command -v aws >/dev/null 2>&1; then
    return 0
  fi

  if command -v brew >/dev/null 2>&1; then
    log "Installing AWS CLI with Homebrew"
    brew install awscli
  else
    case "$(detect_os)" in
      darwin)
        local tmpdir
        tmpdir="$(mktemp -d)"
        curl --proto '=https' --tlsv1.2 -fsSL https://awscli.amazonaws.com/AWSCLIV2.pkg -o "$tmpdir/AWSCLIV2.pkg"
        sudo installer -pkg "$tmpdir/AWSCLIV2.pkg" -target /
        rm -rf "$tmpdir"
        ;;
      linux)
        local tmpdir arch pkg
        tmpdir="$(mktemp -d)"
        arch="$(detect_arch)"
        case "$arch" in
          x86_64) pkg="awscli-exe-linux-x86_64.zip" ;;
          aarch64) pkg="awscli-exe-linux-aarch64.zip" ;;
        esac
        curl --proto '=https' --tlsv1.2 -fsSL "https://awscli.amazonaws.com/${pkg}" -o "$tmpdir/awscliv2.zip"
        unzip -q "$tmpdir/awscliv2.zip" -d "$tmpdir"
        mkdir -p "$HOME/.local/bin" "$HOME/.local/aws-cli"
        "$tmpdir/aws/install" --bin-dir "$HOME/.local/bin" --install-dir "$HOME/.local/aws-cli" --update
        export PATH="$HOME/.local/bin:$PATH"
        rm -rf "$tmpdir"
        ;;
    esac
  fi

  command -v aws >/dev/null 2>&1 || die "AWS CLI install completed but aws is still unavailable in PATH"
}

load_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    die "missing .env file: $ENV_FILE. Copy .env.example to .env and fill in your AWS credentials."
  fi

  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
}

resolve_region() {
  if [[ -z "${AWS_REGION:-}" && -n "${AWS_DEFAULT_REGION:-}" ]]; then
    AWS_REGION="$AWS_DEFAULT_REGION"
  fi

  if [[ -z "${AWS_REGION:-}" ]]; then
    AWS_REGION="$DEFAULT_REGION"
  fi

  AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-$AWS_REGION}"
}

validate_credentials() {
  if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
    die ".env must define AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."
  fi
}

verify_current_identity() {
  log "Current AWS identity:"
  aws sts get-caller-identity
}

run_setup() {
  ensure_tofu
  ensure_aws_cli
  load_env_file
  resolve_region
  validate_credentials

  # The .env bootstrap uses raw access keys, not a named AWS profile.
  unset AWS_PROFILE

  export AWS_REGION
  export AWS_DEFAULT_REGION
  export AWS_ACCESS_KEY_ID
  export AWS_SECRET_ACCESS_KEY
  if [[ -n "${AWS_SESSION_TOKEN:-}" ]]; then
    export AWS_SESSION_TOKEN
  fi

  log "OpenTofu: $(command -v tofu)"
  tofu version
  log "AWS CLI: $(command -v aws)"
  aws --version

  verify_current_identity
}

ENV_FILE="$SCRIPT_DIR/.env"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

run_setup
