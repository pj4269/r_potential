variable "databricks_host" {
  type = string
}

variable "databricks_token" {
  type      = string
  sensitive = true
}



variable "databricks_account_id" {
  type = string
}
