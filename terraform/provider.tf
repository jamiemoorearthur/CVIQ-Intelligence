terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.13"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      # AKS auto-creates ContainerInsights solutions that Terraform doesn't manage.
      # Without this, terraform destroy fails on the resource group deletion step.
      prevent_deletion_if_contains_resources = false
    }
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }

  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}
