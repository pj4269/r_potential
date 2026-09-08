# Get the currently authenticated Databricks workspace user
data "databricks_current_user" "me" {}


# -----------------------------
# Unity Catalog schemas
# -----------------------------

# Bronze = raw ingested/source data
resource "databricks_schema" "bronze" {
  catalog_name = "r_potential_project"
  name         = "bronze"
}

# Silver = cleaned, standardized, validated data
resource "databricks_schema" "silver" {
  catalog_name = "r_potential_project"
  name         = "silver"
}

# Gold = analytics-ready / product-ready data
resource "databricks_schema" "gold" {
  catalog_name = "r_potential_project"
  name         = "gold"
}

# Monitoring = pipeline health, quality, freshness, and run metrics
resource "databricks_schema" "monitoring" {
  catalog_name = "r_potential_project"
  name         = "monitoring"
}


# -----------------------------
# Account-level identity setup
# -----------------------------

# Create an account-level data engineering group
# Using the account provider makes this group usable by Unity Catalog
resource "databricks_group" "data_engineers" {
  provider     = databricks.account
  display_name = "data_engineers"
}

# Look up the trial user in the Databricks account
data "databricks_user" "trial_user" {
  provider  = databricks.account
  user_name = "contactmqg@gmail.com"
}

# Add the trial user to the data_engineers group
resource "databricks_group_member" "trial_user_data_engineers" {
  provider  = databricks.account
  group_id  = databricks_group.data_engineers.id
  member_id = data.databricks_user.trial_user.id
}



# -----------------------------
# Workspace assignment
# -----------------------------

# Give the data_engineers group access to this Databricks workspace
resource "databricks_mws_permission_assignment" "data_engineers_workspace" {
  provider     = databricks.account
  workspace_id = "7474649659438931"
  principal_id = databricks_group.data_engineers.id
  permissions  = ["USER"]
}


# -----------------------------
# Unity Catalog permissions:  grant the data_engineers group access to the catalog and schemas.
# -----------------------------

# Allow the group to use the project catalog
resource "databricks_grants" "project_catalog" {
  catalog = "r_potential_project"

  grant {
    principal  = databricks_group.data_engineers.display_name
    privileges = ["USE_CATALOG"]
  }
}

# Bronze: engineers can use schema and modify data
resource "databricks_grants" "bronze" {
  schema = databricks_schema.bronze.id

  grant {
    principal  = databricks_group.data_engineers.display_name
    privileges = ["USE_SCHEMA", "CREATE_TABLE", "SELECT", "MODIFY"]
  }
}

# Silver
resource "databricks_grants" "silver" {
  schema = databricks_schema.silver.id

  grant {
    principal  = databricks_group.data_engineers.display_name
    privileges = ["USE_SCHEMA", "CREATE_TABLE", "SELECT", "MODIFY"]
  }
}

# Gold
resource "databricks_grants" "gold" {
  schema = databricks_schema.gold.id

  grant {
    principal  = databricks_group.data_engineers.display_name
    privileges = ["USE_SCHEMA", "CREATE_TABLE", "SELECT", "MODIFY"]
  }
}

# Monitoring
resource "databricks_grants" "monitoring" {
  schema = databricks_schema.monitoring.id

  grant {
    principal  = databricks_group.data_engineers.display_name
    privileges = ["USE_SCHEMA", "CREATE_TABLE", "SELECT", "MODIFY"]
  }
}




# 
# -----------------------------
# Databricks Job : pipeline/job is manually working on UI, now codifying it on Terraform: reference  absolute paths of notebooks.
# -----------------------------

resource "databricks_job" "financial_pipeline" {
  name = "r_potential_financial_pipeline"

  task {
    task_key = "01_bronze_ingest"

    notebook_task {
      notebook_path = "/Workspace/Users/contactmqg@gmail.com/01_bronze_ingest"
      source        = "WORKSPACE"
    }
  }

  task {
    task_key = "02_silver_transform"

    depends_on {
      task_key = "01_bronze_ingest"
    }

    notebook_task {
      notebook_path = "/Workspace/Users/contactmqg@gmail.com/02_silver_transform"
      source        = "WORKSPACE"
    }
  }

  task {
    task_key = "03_validate_silver"

    depends_on {
      task_key = "02_silver_transform"
    }

    notebook_task {
      notebook_path = "/Workspace/Users/contactmqg@gmail.com/03_validate_silver"
      source        = "WORKSPACE"
    }
  }

  task {
    task_key = "04_gold_publish"

    depends_on {
      task_key = "03_validate_silver"
    }

    notebook_task {
      notebook_path = "/Workspace/Users/contactmqg@gmail.com/04_gold_publish"
      source        = "WORKSPACE"
    }
  }
}


