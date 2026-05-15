#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
STACK_DIR="$BUILD_DIR/vpc"
DOTENV_FILE="$SCRIPT_DIR/.env"
CONTEXT_FILE="$STACK_DIR/vpc-context.autovars.tfvars"

DEFAULT_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-west-1}}"
DEFAULT_VPC_CIDR="10.10.0.0/16"
DEFAULT_AZ_COUNT=2
DEFAULT_PROJECT="tofu-test"
DEFAULT_ENVIRONMENT="dev"
DEFAULT_OWNER="${USER:-unknown}"
DEFAULT_MANAGED_BY="opentofu"
DEFAULT_SUBNET_NEWBITS=4
DEFAULT_BASTION_INSTANCE_TYPE="t3.micro"
DEFAULT_BASTION_PUBLIC_KEY_PATH="$HOME/.ssh/id_ed25519.pub"
DEFAULT_DB_INSTANCE_CLASS="db.t3.micro"
DEFAULT_DB_ALLOCATED_STORAGE_GB=20
DEFAULT_DB_USERNAME="postgres"
DEFAULT_DB_PASSWORD="password"
DEFAULT_DB_NAME="tofu_test"

ACTION="apply"
REGION=""
VPC_CIDR="$DEFAULT_VPC_CIDR"
AZ_COUNT="$DEFAULT_AZ_COUNT"
PROJECT="$DEFAULT_PROJECT"
ENVIRONMENT="$DEFAULT_ENVIRONMENT"
OWNER=""
MANAGED_BY="$DEFAULT_MANAGED_BY"
SUBNET_NEWBITS="$DEFAULT_SUBNET_NEWBITS"
BASTION_SSH_CIDR=""
BASTION_PUBLIC_KEY_PATH="$DEFAULT_BASTION_PUBLIC_KEY_PATH"
BASTION_INSTANCE_TYPE="$DEFAULT_BASTION_INSTANCE_TYPE"
DB_INSTANCE_CLASS="$DEFAULT_DB_INSTANCE_CLASS"
DB_ALLOCATED_STORAGE_GB="$DEFAULT_DB_ALLOCATED_STORAGE_GB"
DB_USERNAME="$DEFAULT_DB_USERNAME"
DB_PASSWORD="$DEFAULT_DB_PASSWORD"
DB_NAME="$DEFAULT_DB_NAME"

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
  provision-vpc.sh [apply|destroy] [options]

Subcommands:
  apply     Write the VPC OpenTofu stack, then plan and apply it.
  destroy   Use the saved stack files, then destroy the VPC stack.
  connect   Print the exact SSH and psql commands for the current stack.
  tunnel    Open a local SSH tunnel to RDS and run psql on your machine.

Options:
  --region REGION       AWS region. Default: AWS_REGION, AWS_DEFAULT_REGION, or us-west-1
  --vpc-cidr CIDR       VPC CIDR block. Default: 10.10.0.0/16
  --az-count N          Number of Availability Zones. Default: 2
  --project NAME        Human-readable project tag. Default: tofu-test
  --environment NAME    Human-readable environment tag. Default: dev
  --owner NAME          Human-readable owner tag. Default: local user
  --managed-by NAME     Tag for the provisioning tool. Default: opentofu
  --subnet-newbits N    cidrsubnet newbits for public/private subnets. Default: 4
  --bastion-ssh-cidr CIDR
                        Public CIDR allowed to SSH to the bastion. Auto-detected as your public IP if omitted.
  --bastion-public-key-path PATH
                        Local SSH public key used to create the EC2 key pair. Default: ~/.ssh/id_ed25519.pub
  --bastion-instance-type TYPE
                        EC2 instance type for the bastion. Default: t3.micro
  --db-instance-class CLASS
                        RDS instance class. Default: db.t3.micro
  --db-allocated-storage-gb N
                        RDS storage size in GiB. Default: 20
  --db-username NAME    RDS master username. Default: postgres
  --db-password VALUE   RDS master password. Default: password
  --db-name NAME        Initial PostgreSQL database name. Default: tofu_test
  --help                Show this help
EOF
}

source_bootstrap_env() {
  if [[ -f "$DOTENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$DOTENV_FILE"
    set +a
    unset AWS_PROFILE
  else
    die "missing .env file: $DOTENV_FILE. Copy .env.example to .env and fill in your AWS credentials."
  fi
}

resolve_region() {
  if [[ -z "${REGION:-}" ]]; then
    if [[ -n "${AWS_REGION:-}" ]]; then
      REGION="$AWS_REGION"
    elif [[ -n "${AWS_DEFAULT_REGION:-}" ]]; then
      REGION="$AWS_DEFAULT_REGION"
    else
      REGION="$DEFAULT_REGION"
    fi
  fi
}

resolve_owner() {
  if [[ -z "${OWNER:-}" ]]; then
    OWNER="${USER:-$DEFAULT_OWNER}"
  fi
}

detect_public_ip() {
  local ip=""

  if command -v curl >/dev/null 2>&1; then
    ip="$(curl -fsS https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)"
  fi

  if [[ -z "$ip" ]] && command -v wget >/dev/null 2>&1; then
    ip="$(wget -qO- https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)"
  fi

  if [[ -z "$ip" ]] && command -v python3 >/dev/null 2>&1; then
    ip="$(python3 - <<'PY'
import sys
import urllib.request

try:
    with urllib.request.urlopen("https://checkip.amazonaws.com", timeout=10) as response:
        sys.stdout.write(response.read().decode("utf-8").strip())
except Exception:
    sys.exit(1)
PY
)"
  fi

  if [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    printf '%s' "$ip"
    return 0
  fi

  return 1
}

resolve_bastion_ssh_cidr() {
  if [[ -z "${BASTION_SSH_CIDR:-}" ]]; then
    if BASTION_SSH_CIDR="$(detect_public_ip)"; then
      log "Detected public IP for bastion SSH: ${BASTION_SSH_CIDR}/32"
      BASTION_SSH_CIDR="${BASTION_SSH_CIDR}/32"
    else
      if [[ -t 0 ]]; then
        read -r -p "Public IP/CIDR allowed to SSH to the bastion (example 203.0.113.10/32): " BASTION_SSH_CIDR
      else
        die "could not auto-detect your public IP. Pass --bastion-ssh-cidr CIDR."
      fi
    fi
  fi

  if [[ -z "${BASTION_SSH_CIDR:-}" ]]; then
    die "bastion SSH CIDR cannot be empty."
  fi

  if [[ "$BASTION_SSH_CIDR" != */* ]]; then
    BASTION_SSH_CIDR="${BASTION_SSH_CIDR}/32"
  fi
}

resolve_bastion_public_key_path() {
  if [[ -z "${BASTION_PUBLIC_KEY_PATH:-}" ]]; then
    BASTION_PUBLIC_KEY_PATH="$DEFAULT_BASTION_PUBLIC_KEY_PATH"
  fi

  if [[ ! -f "$BASTION_PUBLIC_KEY_PATH" ]]; then
    if [[ -t 0 ]]; then
      read -r -p "Path to your SSH public key [${BASTION_PUBLIC_KEY_PATH}]: " input_key_path
      if [[ -n "${input_key_path:-}" ]]; then
        BASTION_PUBLIC_KEY_PATH="$input_key_path"
      fi
    fi
  fi

  [[ -f "$BASTION_PUBLIC_KEY_PATH" ]] || die "missing SSH public key file: $BASTION_PUBLIC_KEY_PATH"
}

derive_private_key_path() {
  local public_key_path="$1"
  local private_key_path="${public_key_path%.pub}"
  printf '%s' "$private_key_path"
}

shell_quote() {
  printf '%q' "$1"
}

wait_for_local_port() {
  local host="$1"
  local port="$2"
  local pid="$3"
  local attempt

  for attempt in $(seq 1 30); do
    if (exec 3<>"/dev/tcp/${host}/${port}") 2>/dev/null; then
      exec 3>&-
      exec 3<&-
      return 0
    fi

    if ! kill -0 "$pid" 2>/dev/null; then
      return 1
    fi

    sleep 1
  done

  return 1
}

quote_hcl_string() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '"%s"' "$value"
}

read_bootstrap_value() {
  local key="$1"
  local path="$STACK_DIR/bootstrap.auto.tfvars"

  [[ -f "$path" ]] || die "missing $path. Run apply first."

  python3 - "$path" "$key" <<'PY'
import ast
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
key = sys.argv[2]
pattern = re.compile(rf'^{re.escape(key)}\s*=\s*(.+?)\s*$')

for line in path.read_text(encoding="utf-8").splitlines():
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        continue
    match = pattern.match(stripped)
    if not match:
        continue
    raw = match.group(1)
    if raw and raw[0] in "\"'":
        print(ast.literal_eval(raw))
    else:
        print(raw)
    raise SystemExit(0)

raise SystemExit(1)
PY
}

verify_identity() {
  need_cmd aws
  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    die "AWS identity verification failed. Run setup-tools.sh after creating .env."
  fi
}

write_static_stack_files() {
  mkdir -p "$STACK_DIR"

  cat > "$STACK_DIR/versions.tf" <<'EOF'
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
EOF

  cat > "$STACK_DIR/provider.tf" <<'EOF'
provider "aws" {
  region = var.aws_region
}
EOF

  cat > "$STACK_DIR/variables.tf" <<'EOF'
variable "aws_region" {
  description = "AWS region for the VPC."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.10.0.0/16"
}

variable "az_count" {
  description = "Number of Availability Zones to use."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2
    error_message = "az_count must be at least 2."
  }
}

variable "project" {
  description = "Human-readable project tag."
  type        = string
  default     = "tofu-test"
}

variable "environment" {
  description = "Human-readable environment tag."
  type        = string
  default     = "dev"
}

variable "owner" {
  description = "Human-readable owner tag."
  type        = string
  default     = ""
}

variable "managed_by" {
  description = "Tag for the provisioning tool."
  type        = string
  default     = "opentofu"
}

variable "subnet_newbits" {
  description = "cidrsubnet() newbits used to derive public and private subnets."
  type        = number
  default     = 4
}

variable "bastion_ssh_cidr" {
  description = "Public CIDR allowed to SSH to the bastion host."
  type        = string
}

variable "bastion_public_key_path" {
  description = "Local SSH public key path used to create the EC2 key pair."
  type        = string
}

variable "bastion_instance_type" {
  description = "EC2 instance type for the bastion host."
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "RDS instance class for PostgreSQL."
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage_gb" {
  description = "Allocated storage for the RDS instance in GiB."
  type        = number
  default     = 20
}

variable "db_username" {
  description = "RDS master username."
  type        = string
  default     = "postgres"

  validation {
    condition     = can(regex("^[A-Za-z][A-Za-z0-9]{0,15}$", var.db_username))
    error_message = "db_username must start with a letter and be 1-16 alphanumeric characters."
  }
}

variable "db_password" {
  description = "RDS master password."
  type        = string
  default     = "password"
}

variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "tofu_test"
}
EOF

  cat > "$STACK_DIR/main.tf" <<'EOF'
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  az_names = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  public_subnets = {
    for idx, az in local.az_names :
    az => {
      cidr = cidrsubnet(var.vpc_cidr, var.subnet_newbits, idx)
    }
  }

  private_subnets = {
    for idx, az in local.az_names :
    az => {
      cidr = cidrsubnet(var.vpc_cidr, var.subnet_newbits, idx + var.az_count)
    }
  }

  common_tags = {
    project     = var.project
    environment = var.environment
    owner       = var.owner
    managed_by  = var.managed_by
  }
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-vpc"
  })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-igw"
  })
}

resource "aws_subnet" "public" {
  for_each = local.public_subnets

  vpc_id                  = aws_vpc.this.id
  availability_zone       = each.key
  cidr_block              = each.value.cidr
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-${replace(each.key, "-", "")}-public"
  })
}

resource "aws_subnet" "private" {
  for_each = local.private_subnets

  vpc_id                  = aws_vpc.this.id
  availability_zone       = each.key
  cidr_block              = each.value.cidr
  map_public_ip_on_launch = false

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-${replace(each.key, "-", "")}-private"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-public-rt"
  })
}

resource "aws_route" "public_default" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-private-rt"
  })
}

resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private

  subnet_id      = each.value.id
  route_table_id = aws_route_table.private.id
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-s3-endpoint"
  })
}

resource "aws_security_group" "bastion" {
  name        = "${var.project}-${var.environment}-bastion"
  description = "SSH access for the bastion host."
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "SSH from the configured public CIDR"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.bastion_ssh_cidr]
  }

  egress {
    description      = "Allow all outbound traffic"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-bastion"
  })
}

resource "aws_security_group" "db" {
  name        = "${var.project}-${var.environment}-db"
  description = "PostgreSQL access for the bastion host."
  vpc_id      = aws_vpc.this.id

  ingress {
    description     = "PostgreSQL from the bastion security group"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    description      = "Allow all outbound traffic"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-db"
  })
}

resource "aws_key_pair" "bastion" {
  key_name   = "${var.project}-${var.environment}-bastion"
  public_key = file(pathexpand(var.bastion_public_key_path))
}

resource "aws_instance" "bastion" {
  ami                         = data.aws_ssm_parameter.al2023_ami.value
  instance_type               = var.bastion_instance_type
  subnet_id                   = aws_subnet.public[local.az_names[0]].id
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  key_name                    = aws_key_pair.bastion.key_name
  associate_public_ip_address = true
  user_data_replace_on_change = true

  user_data = <<-EOF_USER_DATA
#!/bin/bash
set -euo pipefail
dnf -y update
dnf -y install postgresql15
EOF_USER_DATA

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-bastion"
  })
}

resource "aws_db_subnet_group" "postgres" {
  name       = "${var.project}-${var.environment}-postgres"
  subnet_ids = [for az in local.az_names : aws_subnet.private[az].id]

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-postgres"
  })
}

resource "aws_db_instance" "postgres" {
  identifier              = "${var.project}-${var.environment}-postgres"
  engine                  = "postgres"
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage_gb
  storage_type            = "gp3"
  db_name                 = var.db_name
  username                = var.db_username
  password                = var.db_password
  port                    = 5432
  publicly_accessible     = false
  multi_az                = false
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true
  auto_minor_version_upgrade = true
  backup_retention_period  = 0
  db_subnet_group_name    = aws_db_subnet_group.postgres.name
  vpc_security_group_ids  = [aws_security_group.db.id]

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-postgres"
  })
}
EOF

  cat > "$STACK_DIR/outputs.tf" <<'EOF'
output "aws_region" {
  value = var.aws_region
}

output "vpc_id" {
  value = aws_vpc.this.id
}

output "vpc_cidr" {
  value = aws_vpc.this.cidr_block
}

output "availability_zones" {
  value = local.az_names
}

output "public_subnet_ids" {
  value = [for az in local.az_names : aws_subnet.public[az].id]
}

output "private_subnet_ids" {
  value = [for az in local.az_names : aws_subnet.private[az].id]
}

output "public_route_table_id" {
  value = aws_route_table.public.id
}

output "private_route_table_id" {
  value = aws_route_table.private.id
}

output "db_security_group_id" {
  value = aws_security_group.db.id
}

output "bastion_security_group_id" {
  value = aws_security_group.bastion.id
}

output "bastion_instance_id" {
  value = aws_instance.bastion.id
}

output "bastion_public_ip" {
  value = aws_instance.bastion.public_ip
}

output "bastion_public_dns" {
  value = aws_instance.bastion.public_dns
}

output "bastion_ssh_user" {
  value = "ec2-user"
}

output "bastion_key_pair_name" {
  value = aws_key_pair.bastion.key_name
}

output "rds_instance_identifier" {
  value = aws_db_instance.postgres.identifier
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "rds_port" {
  value = aws_db_instance.postgres.port
}

output "rds_db_name" {
  value = aws_db_instance.postgres.db_name
}

output "rds_username" {
  value = aws_db_instance.postgres.username
}

output "s3_gateway_endpoint_id" {
  value = aws_vpc_endpoint.s3.id
}
EOF

}

write_bootstrap_tfvars() {
  cat > "$STACK_DIR/bootstrap.auto.tfvars" <<EOF
aws_region              = $(quote_hcl_string "$REGION")
vpc_cidr                = $(quote_hcl_string "$VPC_CIDR")
az_count                = $AZ_COUNT
project                 = $(quote_hcl_string "$PROJECT")
environment             = $(quote_hcl_string "$ENVIRONMENT")
owner                   = $(quote_hcl_string "$OWNER")
managed_by              = $(quote_hcl_string "$MANAGED_BY")
subnet_newbits          = $SUBNET_NEWBITS
bastion_ssh_cidr        = $(quote_hcl_string "$BASTION_SSH_CIDR")
bastion_public_key_path = $(quote_hcl_string "$BASTION_PUBLIC_KEY_PATH")
bastion_instance_type   = $(quote_hcl_string "$BASTION_INSTANCE_TYPE")
db_instance_class       = $(quote_hcl_string "$DB_INSTANCE_CLASS")
db_allocated_storage_gb = $DB_ALLOCATED_STORAGE_GB
db_username             = $(quote_hcl_string "$DB_USERNAME")
db_password             = $(quote_hcl_string "$DB_PASSWORD")
db_name                 = $(quote_hcl_string "$DB_NAME")
EOF
}

write_context_file() {
  local output_json_file
  output_json_file="$(mktemp)"
  tofu -chdir="$STACK_DIR" output -json > "$output_json_file"
  python3 - "$output_json_file" "$CONTEXT_FILE" <<'PY'
import json
import pathlib
import sys

def to_hcl(value, indent=0):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, str):
        return json.dumps(value)
    if isinstance(value, list):
        if not value:
            return "[]"
        inner = ",\n".join(
            "  " * (indent + 1) + to_hcl(item, indent + 1)
            for item in value
        )
        return "[\n" + inner + "\n" + "  " * indent + "]"
    if isinstance(value, dict):
        if not value:
            return "{}"
        inner = "\n".join(
            "  " * (indent + 1) + f"{key} = {to_hcl(value[key], indent + 1)}"
            for key in sorted(value)
        )
        return "{\n" + inner + "\n" + "  " * indent + "}"
    raise TypeError(f"unsupported type: {type(value)!r}")

output_path = pathlib.Path(sys.argv[1])
context_path = pathlib.Path(sys.argv[2])
data = json.loads(output_path.read_text())
preferred_order = [
    "aws_region",
    "vpc_id",
    "vpc_cidr",
    "availability_zones",
    "public_subnet_ids",
    "private_subnet_ids",
    "public_route_table_id",
    "private_route_table_id",
    "db_security_group_id",
    "bastion_security_group_id",
    "bastion_instance_id",
    "bastion_public_ip",
    "bastion_public_dns",
    "bastion_ssh_user",
    "bastion_key_pair_name",
    "rds_instance_identifier",
    "rds_endpoint",
    "rds_port",
    "rds_db_name",
    "rds_username",
    "s3_gateway_endpoint_id",
]

lines = ["# Generated by provision-vpc.sh. Do not edit manually.\n"]
seen = set()
for key in preferred_order:
    if key in data:
        lines.append(f"{key} = {to_hcl(data[key]['value'])}\n")
        seen.add(key)

for key in sorted(k for k in data if k not in seen):
    lines.append(f"{key} = {to_hcl(data[key]['value'])}\n")

context_path.write_text("".join(lines), encoding="utf-8")
PY
  rm -f "$output_json_file"
}

print_connection_commands() {
  need_cmd tofu
  [[ -f "$STACK_DIR/terraform.tfstate" ]] || die "missing stack state in $STACK_DIR. Run apply first."

  local public_key_path private_key_path bastion_public_ip bastion_ssh_user rds_endpoint rds_db_name rds_username
  public_key_path="$(read_bootstrap_value bastion_public_key_path)"
  private_key_path="$(derive_private_key_path "$public_key_path")"
  bastion_public_ip="$(tofu -chdir="$STACK_DIR" output -raw bastion_public_ip)"
  bastion_ssh_user="$(tofu -chdir="$STACK_DIR" output -raw bastion_ssh_user)"
  rds_endpoint="$(tofu -chdir="$STACK_DIR" output -raw rds_endpoint)"
  rds_db_name="$(tofu -chdir="$STACK_DIR" output -raw rds_db_name)"
  rds_username="$(tofu -chdir="$STACK_DIR" output -raw rds_username)"

  log ""
  log "Connection details for this stack:"
  log "  Bastion public IP: $bastion_public_ip"
  log "  Bastion SSH user: $bastion_ssh_user"
  log "  Bastion private key: $private_key_path"
  log "  RDS endpoint: $rds_endpoint"
  log "  RDS database: $rds_db_name"
  log "  RDS user: $rds_username"
  log ""
  log "SSH into the bastion:"
  log "ssh -i $(shell_quote "$private_key_path") -o IdentitiesOnly=yes ${bastion_ssh_user}@${bastion_public_ip}"
  log ""
  log "Run psql on the bastion:"
  log "psql \"host=${rds_endpoint} port=5432 dbname=${rds_db_name} user=${rds_username} sslmode=require\" -W"
  log ""
  log "If you kept the demo password, enter: password"
  log ""
  log "Optional SSH tunnel from your laptop:"
  log "ssh -i $(shell_quote "$private_key_path") -o IdentitiesOnly=yes -L 5432:${rds_endpoint}:5432 ${bastion_ssh_user}@${bastion_public_ip}"
  log "Then on your laptop:"
  log "psql \"host=127.0.0.1 port=5432 dbname=${rds_db_name} user=${rds_username} sslmode=require\" -W"
  log ""
  log "One-command local tunnel:"
  log "./setup_vpc.sh tunnel"
}

tunnel_stack() {
  need_cmd tofu
  need_cmd ssh
  need_cmd psql
  [[ -f "$STACK_DIR/terraform.tfstate" ]] || die "missing stack state in $STACK_DIR. Run apply first."

  local public_key_path private_key_path bastion_public_ip bastion_ssh_user rds_endpoint rds_db_name rds_username local_port tunnel_pid
  public_key_path="$(read_bootstrap_value bastion_public_key_path)"
  private_key_path="$(derive_private_key_path "$public_key_path")"
  bastion_public_ip="$(tofu -chdir="$STACK_DIR" output -raw bastion_public_ip)"
  bastion_ssh_user="$(tofu -chdir="$STACK_DIR" output -raw bastion_ssh_user)"
  rds_endpoint="$(tofu -chdir="$STACK_DIR" output -raw rds_endpoint)"
  rds_db_name="$(tofu -chdir="$STACK_DIR" output -raw rds_db_name)"
  rds_username="$(tofu -chdir="$STACK_DIR" output -raw rds_username)"
  local_port="15432"

  log "Opening SSH tunnel on localhost:${local_port} ..."

  ssh -i "$private_key_path" \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -N \
    -L "${local_port}:${rds_endpoint}:5432" \
    "${bastion_ssh_user}@${bastion_public_ip}" &
  tunnel_pid=$!

  cleanup() {
    kill "$tunnel_pid" >/dev/null 2>&1 || true
    wait "$tunnel_pid" >/dev/null 2>&1 || true
  }

  trap cleanup EXIT INT TERM

  if ! wait_for_local_port 127.0.0.1 "$local_port" "$tunnel_pid"; then
    die "SSH tunnel did not come up."
  fi

  log "Tunnel is up. Launching psql ..."

  set +e
  PGPASSWORD="${DB_PASSWORD}" psql \
    "host=127.0.0.1 port=${local_port} dbname=${rds_db_name} user=${rds_username} sslmode=require" \
    -v ON_ERROR_STOP=1
  local psql_status=$?
  set -e

  cleanup
  trap - EXIT INT TERM
  return "$psql_status"
}

apply_stack() {
  need_cmd tofu
  need_cmd aws
  need_cmd python3
  verify_identity
  resolve_region
  resolve_owner
  resolve_bastion_ssh_cidr
  resolve_bastion_public_key_path
  export AWS_REGION="$REGION"
  export AWS_DEFAULT_REGION="$REGION"
  write_static_stack_files
  write_bootstrap_tfvars
  tofu -chdir="$STACK_DIR" fmt -recursive
  tofu -chdir="$STACK_DIR" init -upgrade
  tofu -chdir="$STACK_DIR" validate
  tofu -chdir="$STACK_DIR" plan -out="$STACK_DIR/plan.bin"
  tofu -chdir="$STACK_DIR" apply -auto-approve "$STACK_DIR/plan.bin"
  rm -f "$STACK_DIR/plan.bin"
  write_context_file
  log "Wrote VPC context file to $CONTEXT_FILE"
  print_connection_commands
}

destroy_stack() {
  need_cmd tofu
  need_cmd aws
  verify_identity
  write_static_stack_files
  [[ -f "$STACK_DIR/bootstrap.auto.tfvars" ]] || die "missing $STACK_DIR/bootstrap.auto.tfvars. Run apply once or restore the saved stack files before destroy."
  tofu -chdir="$STACK_DIR" fmt -recursive
  tofu -chdir="$STACK_DIR" init -upgrade
  tofu -chdir="$STACK_DIR" destroy -auto-approve
  rm -f "$CONTEXT_FILE"
  log "Removed VPC context file at $CONTEXT_FILE"
}

connect_stack() {
  need_cmd tofu
  [[ -f "$STACK_DIR/terraform.tfstate" ]] || die "missing stack state in $STACK_DIR. Run apply first."
  print_connection_commands
}

source_bootstrap_env

if [[ $# -gt 0 && ${1:0:1} != "-" ]]; then
  ACTION="$1"
  shift
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --vpc-cidr)
      VPC_CIDR="${2:-}"
      shift 2
      ;;
    --az-count)
      AZ_COUNT="${2:-}"
      shift 2
      ;;
    --project)
      PROJECT="${2:-}"
      shift 2
      ;;
    --environment)
      ENVIRONMENT="${2:-}"
      shift 2
      ;;
    --owner)
      OWNER="${2:-}"
      shift 2
      ;;
    --managed-by)
      MANAGED_BY="${2:-}"
      shift 2
      ;;
    --subnet-newbits)
      SUBNET_NEWBITS="${2:-}"
      shift 2
      ;;
    --bastion-ssh-cidr)
      BASTION_SSH_CIDR="${2:-}"
      shift 2
      ;;
    --bastion-public-key-path)
      BASTION_PUBLIC_KEY_PATH="${2:-}"
      shift 2
      ;;
    --bastion-instance-type)
      BASTION_INSTANCE_TYPE="${2:-}"
      shift 2
      ;;
    --db-instance-class)
      DB_INSTANCE_CLASS="${2:-}"
      shift 2
      ;;
    --db-allocated-storage-gb)
      DB_ALLOCATED_STORAGE_GB="${2:-}"
      shift 2
      ;;
    --db-username)
      DB_USERNAME="${2:-}"
      shift 2
      ;;
    --db-password)
      DB_PASSWORD="${2:-}"
      shift 2
      ;;
    --db-name)
      DB_NAME="${2:-}"
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

case "$ACTION" in
  apply)
    apply_stack
    ;;
  destroy)
    destroy_stack
    ;;
  connect)
    connect_stack
    ;;
  tunnel)
    tunnel_stack
    ;;
  *)
    die "unknown subcommand: $ACTION"
    ;;
esac
