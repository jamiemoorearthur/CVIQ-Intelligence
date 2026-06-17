#!/usr/bin/env bash
# setup.sh — one-time cluster bootstrap
# Run this after `terraform apply` and `az aks get-credentials ...`
set -euo pipefail

RESOURCE_GROUP="cvreviewer-rg"
CLUSTER_NAME="cvreviewer-aks"
STORAGE_ACCOUNT="cvreviewersa5xzbx"
NAMESPACE="cv-reviewer"

echo "==> Getting KV addon client ID"
KV_ADDON_CLIENT_ID=$(az aks show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --query "addonProfiles.azureKeyvaultSecretsProvider.identity.clientId" \
  -o tsv)
echo "    KV addon client ID: $KV_ADDON_CLIENT_ID"

echo "==> Getting storage account key"
STORAGE_KEY=$(az storage account keys list \
  --resource-group "$RESOURCE_GROUP" \
  --account-name "$STORAGE_ACCOUNT" \
  --query "[0].value" \
  -o tsv)

echo "==> Applying namespace"
kubectl apply -f namespace.yaml

echo "==> Creating azure-storage-secret (for ChromaDB Azure File Share)"
kubectl create secret generic azure-storage-secret \
  --namespace "$NAMESPACE" \
  --from-literal=azurestorageaccountname="$STORAGE_ACCOUNT" \
  --from-literal=azurestorageaccountkey="$STORAGE_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Applying SecretProviderClass"
kubectl apply -f secret-provider-class.yaml

echo "==> Applying storage PV/PVC"
kubectl apply -f storage.yaml

echo "==> Applying deployment and service"
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

echo ""
echo "==> Done. Check rollout:"
echo "    kubectl rollout status deployment/cv-reviewer -n $NAMESPACE"
echo ""
echo "==> Get public IP (may take 1-2 min for LB provisioning):"
echo "    kubectl get svc cv-reviewer -n $NAMESPACE"
