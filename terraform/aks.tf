resource "azurerm_log_analytics_workspace" "law" {
  name                = local.law_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_kubernetes_cluster" "aks" {
  name                = local.aks_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = local.aks_name

  # System node pool — runs Kubernetes system pods + the CV Reviewer API
  default_node_pool {
    name       = "system"
    node_count = var.node_count
    vm_size    = var.node_vm_size

    upgrade_settings {
      max_surge = "10%"
    }
  }

  # System-assigned managed identity — used to grant ACR pull and Key Vault access
  identity {
    type = "SystemAssigned"
  }

  # OIDC issuer was enabled on first apply; Azure prevents disabling it once on
  oidc_issuer_enabled = true

  # Key Vault Secrets Provider — mounts secrets from Key Vault into pods via CSI driver
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  # Container Insights — sends pod logs and metrics to Log Analytics
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
  }

  # Azure CNI — pods get real VNet IPs; required for Azure network policies
  network_profile {
    network_plugin = "azure"
    network_policy = "azure"
  }

  # Automatic patch upgrades — OS security patches applied without manual intervention
  automatic_upgrade_channel = "patch"
  node_os_upgrade_channel   = "NodeImage"

  tags = var.tags
}
