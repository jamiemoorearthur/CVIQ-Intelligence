variable "project_name" {
  description = "Base name for all resources"
  type        = string
  default     = "cv-reviewer"
}

variable "location" {
  description = "Azure region to deploy resources"
  type        = string
  default     = "UK South"
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default = {
    environment = "Dev"
    project     = "cv-reviewer"
    owner       = "seyi"
  }
}

# ACR
variable "acr_sku" {
  description = "SKU for Azure Container Registry (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
}

# Key Vault
variable "kv_sku" {
  description = "SKU for Azure Key Vault (standard or premium)"
  type        = string
  default     = "standard"
}

# Storage
variable "storage_replication_type" {
  description = "Replication type for the storage account (LRS, GRS, RAGRS)"
  type        = string
  default     = "LRS"
}

# AKS
variable "node_count" {
  description = "Number of nodes in the default node pool"
  type        = number
  default     = 1
}

variable "node_vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_D2s_v5"
}

# Image tag — passed in by CI/CD when pushing a new build
variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# Secrets — passed in at apply time, never hardcoded
variable "openai_api_key" {
  description = "OpenAI API key — stored in Key Vault and mounted into pods via CSI driver"
  type        = string
  sensitive   = true
}

variable "langfuse_public_key" {
  description = "Langfuse public key for observability"
  type        = string
  sensitive   = true
  default     = ""
}

variable "langfuse_secret_key" {
  description = "Langfuse secret key for observability"
  type        = string
  sensitive   = true
  default     = ""
}

# Azure credentials
variable "subscription_id" {
  description = "Azure Subscription ID used by Terraform"
  type        = string
}

variable "tenant_id" {
  description = "Azure Tenant ID used by Terraform"
  type        = string
}
