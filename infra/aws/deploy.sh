#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
REPO_NAME="nav-reconciliation-production"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Get AWS account ID ────────────────────────────────────────────────────────
echo "==> Fetching AWS account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "    Account : ${ACCOUNT_ID}"
echo "    Region  : ${REGION}"
echo "    Registry: ${REGISTRY}"

# ── Bootstrap ECR repo via Terraform (if not exists) ─────────────────────────
echo ""
echo "==> Bootstrapping ECR repository..."
cd "${SCRIPT_DIR}"
terraform init -input=false > /dev/null
terraform apply -target=aws_ecr_repository.main -auto-approve -input=false
echo "    ECR repo ready."

# ── Login to ECR ──────────────────────────────────────────────────────────────
echo ""
echo "==> Logging in to ECR..."
aws ecr get-login-password --region "${REGION}" | \
  docker login --username AWS --password-stdin "${REGISTRY}" 2>&1 | grep -v "WARNING"

# ── Build & push frontend ─────────────────────────────────────────────────────
echo ""
echo "==> Building frontend image..."
FRONTEND_IMAGE="${REGISTRY}/${REPO_NAME}:frontend-latest"
docker build -f "${ROOT_DIR}/docker/frontend.Dockerfile" -t "${FRONTEND_IMAGE}" "${ROOT_DIR}"
echo "==> Pushing frontend image..."
docker push "${FRONTEND_IMAGE}"
echo "    Pushed: ${FRONTEND_IMAGE}"

# ── Build & push backend ──────────────────────────────────────────────────────
echo ""
echo "==> Building backend image..."
BACKEND_IMAGE="${REGISTRY}/${REPO_NAME}:backend-latest"
docker build -f "${ROOT_DIR}/docker/backend.Dockerfile" -t "${BACKEND_IMAGE}" "${ROOT_DIR}"
echo "==> Pushing backend image..."
docker push "${BACKEND_IMAGE}"
echo "    Pushed: ${BACKEND_IMAGE}"

# ── Terraform apply ───────────────────────────────────────────────────────────
echo ""
echo "==> Deploying infrastructure with Terraform..."
terraform apply -auto-approve -input=false

echo ""
echo "==> Deploy complete!"
