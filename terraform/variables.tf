variable "databricks_host" {
  type = string
}

variable "databricks_account_id" {
  type = string
}

variable "databricks_client_id" {
  type = string
}

variable "databricks_client_secret" {
  type      = string
  sensitive = true
}
