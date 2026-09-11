# rPotential Data Platform Demo

A small end-to-end financial data platform built around Sharadar fundamentals, AWS, Databricks, and Terraform.

The goal was to take a production-style data pipeline from ingestion all the way to a dashboard, while keeping the infrastructure reproducible and easy to operate.

---

## Architecture

```text
Sharadar API
   ↓
AWS Lambda
   ↓
S3
   ↓
Databricks
   ↓
Bronze → Silver → Validate → Gold → Monitoring
   ↓
Alerts + Dashboard
```

Terraform manages the AWS and Databricks infrastructure, and HCP Terraform stores remote state.

---

## Daily Flow

```text
EventBridge Scheduler
        ↓
Lambda runs incremental ingest
        ↓
New Sharadar rows written to S3
        ↓
Lambda triggers Databricks
        ↓
Bronze
  ↓
Silver
  ↓
Validate
  ↓
Gold
  ↓
Monitoring
        ↓
Dashboard / Alerts
```

---

## Databricks Pipeline

### 01 — Bronze

Loads the historical and incremental Sharadar data into the canonical Delta table.

Incremental rows are merged into Bronze rather than blindly appended.

### 02 — Silver

Creates the cleaned downstream dataset.

Current Silver logic removes rows where important fields like `ticker` or `calendardate` are missing.

### 03 — Validate

Runs basic data-quality checks such as:

- missing key values
- duplicate records
- expected key uniqueness

### 04 — Gold

Creates the product-ready dataset used by the dashboard.

For this demo, the Gold layer focuses on annual fundamentals (`MRY`).

### 05 — Monitoring

Stores a summary of each pipeline run, including:

- Bronze row count
- Silver row count
- Gold row count
- latest update date
- pipeline status

This makes it easier to see whether the pipeline is healthy and whether the data is fresh.

---

## AWS Ingestion

The ingestion layer runs automatically.

```text
EventBridge
    ↓
Lambda
    ├── reads secrets from SSM
    ├── calls Sharadar
    ├── writes incremental Parquet to S3
    └── triggers Databricks
```

Secrets are stored in AWS Systems Manager Parameter Store instead of being committed to the repository.

---

## Infrastructure as Code

Terraform manages the infrastructure for the project.

```text
Terraform
   ├── Lambda
   ├── IAM roles and policies
   ├── EventBridge Scheduler
   ├── Databricks schemas
   ├── Databricks permissions
   └── Databricks jobs
```

Some resources were originally created manually and later imported into Terraform.

The final goal was to reach a clean:

```text
No changes. Your infrastructure matches the configuration.
```

That means the Terraform code and the deployed infrastructure are aligned.

---

## Dashboard

The Gold dataset feeds a Databricks dashboard with examples such as:

- Top companies by market cap
- Top companies by revenue
- P/E vs ROE
- Revenue trends
- P/E distribution
- ROE distribution
- Revenue vs net income

The dashboard is mainly there to show that the pipeline produces something usable, not just that data moves from one place to another.

---

## Tech Stack

```text
AWS
├── Lambda
├── S3
├── EventBridge Scheduler
├── IAM
└── SSM Parameter Store

Databricks
├── Delta Lake
├── Unity Catalog
├── Jobs
├── SQL
├── Monitoring
└── Dashboard

Infrastructure
├── Terraform
├── HCP Terraform
└── GitHub Actions
```

---


