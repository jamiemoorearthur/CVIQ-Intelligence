terraform {
  # State lives in a bootstrap storage account that is NOT managed by this Terraform config.
  # It survives terraform destroy so the next provision starts with known state.
  #
  # One-time bootstrap (handled automatically by aks-provision.yml, or run manually):
  #   az group create --name cvreviewer-bootstrap --location uksouth
  #   az storage account create --name cvreviewertfstate \
  #     --resource-group cvreviewer-bootstrap --sku Standard_LRS --min-tls-version TLS1_2
  #   az storage container create --name tfstate --account-name cvreviewertfstate
  backend "azurerm" {
    resource_group_name  = "cvreviewer-bootstrap"
    storage_account_name = "cvreviewertfstate"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}
