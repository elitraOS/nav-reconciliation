#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
REPO_NAME="nav-reconciliation-production"
IMAGE_TAG="frontend-latest"
FRONTEND_DIR="$(cd "$(dirname "$0")/../../frontend" && pwd)"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Get AWS account ID ────────────────────────────────────────────────────────
echo "Fetching AWS account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_URI="${REGISTRY}/${REPO_NAME}:${IMAGE_TAG}"

echo "Account : ${ACCOUNT_ID}"
echo "Region  : ${REGION}"
echo "Image   : ${IMAGE_URI}"

# ── Create ECR repo if it doesn't exist ──────────────────────────────────────
echo ""
echo "Ensuring ECR repository exists..."
aws ecr describe-repositories --repository-names "${REPO_NAME}" --region "${REGION}" > /dev/null 2>&1 || \
  aws ecr create-repository --repository-name "${REPO_NAME}" --region "${REGION}" > /dev/null
echo "ECR repo ready: ${REPO_NAME}"

# ── Login to ECR ──────────────────────────────────────────────────────────────
echo ""
echo "Logging in to ECR..."
aws ecr get-login-password --region "${REGION}" | \
  docker login --username AWS --password-stdin "${REGISTRY}"

# ── Build Docker image ────────────────────────────────────────────────────────
echo ""
echo "Building Docker image..."
docker build -f "${ROOT_DIR}/docker/frontend.Dockerfile" -t "${REPO_NAME}:latest" "${ROOT_DIR}"

# ── Tag and push ──────────────────────────────────────────────────────────────
echo ""
echo "Pushing image to ECR..."
docker tag "${REPO_NAME}:latest" "${IMAGE_URI}"
docker push "${IMAGE_URI}"

echo ""
echo "Image pushed: ${IMAGE_URI}"

echo ""
echo "Done! Run terraform to deploy:"
echo "  cd ${SCRIPT_DIR} && terraform apply"
