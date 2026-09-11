import json
import os
import io
from datetime import datetime, timezone, timedelta

import boto3
import polars as pl
import requests


# ============================================================
# CONFIG
# ============================================================

SSM_PARAMETER_NAME = os.getenv(
    "SSM_PARAMETER_NAME",
    "/r-potential/sharadar/api-key",
)

S3_BUCKET = os.getenv(
    "S3_BUCKET",
    "project-1-sharadar-fundamentals",
)

S3_PREFIX = os.getenv(
    "S3_PREFIX",
    "r_potential/dev/bronze/sf1/incremental",
)

HISTORICAL_KEY = os.getenv(
    "HISTORICAL_KEY",
    "r_potential/parquet_output/SHARADAR_SF1_3.parquet",
)

DATABRICKS_HOST = os.getenv(
    "DATABRICKS_HOST"
)

DATABRICKS_JOB_ID = os.getenv(
    "DATABRICKS_JOB_ID"
)

DATABRICKS_ACCOUNT_ID = os.getenv(
    "DATABRICKS_ACCOUNT_ID"
)

DATABRICKS_CLIENT_ID_PARAM = os.getenv(
    "DATABRICKS_CLIENT_ID_PARAM",
    "/r-potential/databricks/client-id",
)

DATABRICKS_CLIENT_SECRET_PARAM = os.getenv(
    "DATABRICKS_CLIENT_SECRET_PARAM",
    "/r-potential/databricks/client-secret",
)

SHARADAR_BASE_URL = (
    "https://data.nasdaq.com/api/v3/datatables/SHARADAR/SF1"
)

ssm = boto3.client("ssm")
s3 = boto3.client("s3")


# ============================================================
# SSM
# ============================================================

def get_ssm_parameter(name):
    response = ssm.get_parameter(
        Name=name,
        WithDecryption=True,
    )

    return response["Parameter"]["Value"]


def get_api_key():
    return get_ssm_parameter(
        SSM_PARAMETER_NAME
    )


# ============================================================
# SHARADAR FETCH
# ============================================================

def fetch_updates(
    api_key,
    start_date,
    end_date=None,
    per_page=10000,
    max_pages=200,
):
    chunks = []
    cursor_id = None

    for iteration in range(max_pages):

        params = {
            "api_key": api_key,
            "lastupdated.gte": start_date,
            "qopts.per_page": per_page,
        }

        if end_date:
            params["lastupdated.lte"] = end_date

        if cursor_id:
            params["qopts.cursor_id"] = cursor_id

        print(
            f"Fetching page {iteration + 1}: "
            f"{start_date} → {end_date or 'latest'}"
        )

        response = requests.get(
            SHARADAR_BASE_URL,
            params=params,
            timeout=60,
        )

        response.raise_for_status()

        datatable = response.json()["datatable"]

        columns = [
            c["name"]
            for c in datatable["columns"]
        ]

        rows = datatable["data"]

        if not rows:
            break

        chunks.append(
            pl.DataFrame(
                rows,
                schema=columns,
                orient="row",
            )
        )

        cursor_id = (
            datatable
            .get("meta", {})
            .get("next_cursor_id")
        )

        if not cursor_id:
            break

    if not chunks:
        return pl.DataFrame()

    return pl.concat(
        chunks,
        how="diagonal_relaxed",
    )


# ============================================================
# SUMMARY
# ============================================================

def summarize_updates(df):

    if df.is_empty():
        return {
            "rows": 0,
            "unique_tickers": 0,
            "dimensions": [],
            "min_lastupdated": None,
            "max_lastupdated": None,
        }

    return {
        "rows": df.height,

        "unique_tickers": (
            df
            .select("ticker")
            .drop_nulls()
            .unique()
            .height
        ),

        "dimensions": (
            df
            .select("dimension")
            .drop_nulls()
            .unique()
            .sort("dimension")
            .to_series()
            .to_list()
        ),

        "min_lastupdated": str(
            df
            .select(
                pl.col("lastupdated").min()
            )
            .item()
        ),

        "max_lastupdated": str(
            df
            .select(
                pl.col("lastupdated").max()
            )
            .item()
        ),
    }


# ============================================================
# FIRST 5 ROWS
# ============================================================

def preview_rows(df, n=5):

    if df.is_empty():
        print("No rows to preview.")
        return []

    preferred_cols = [
        "ticker",
        "dimension",
        "calendardate",
        "datekey",
        "lastupdated",
        "revenue",
        "eps",
        "netinc",
        "assets",
    ]

    selected_cols = [
        col
        for col in preferred_cols
        if col in df.columns
    ]

    preview_df = (
        df
        .select(selected_cols)
        .head(n)
    )

    print("")
    print("========================================")
    print(f"FIRST {n} ROWS")
    print("========================================")
    print(preview_df)
    print("========================================")
    print("")

    return preview_df.to_dicts()


# ============================================================
# FIND LATEST INCREMENTAL FILE
# ============================================================

def get_latest_incremental_key():

    paginator = s3.get_paginator(
        "list_objects_v2"
    )

    latest_object = None

    for page in paginator.paginate(
        Bucket=S3_BUCKET,
        Prefix=S3_PREFIX + "/",
    ):

        for obj in page.get(
            "Contents",
            [],
        ):

            if not obj["Key"].endswith(
                ".parquet"
            ):
                continue

            if (
                latest_object is None
                or obj["LastModified"]
                > latest_object["LastModified"]
            ):
                latest_object = obj

    if latest_object:
        return latest_object["Key"]

    return None


# ============================================================
# MAX(lastupdated)
# ============================================================

def get_max_lastupdated_from_parquet(
    s3_key
):

    print(
        f"Reading checkpoint from "
        f"s3://{S3_BUCKET}/{s3_key}"
    )

    response = s3.get_object(
        Bucket=S3_BUCKET,
        Key=s3_key,
    )

    parquet_bytes = (
        response["Body"].read()
    )

    df = pl.read_parquet(
        io.BytesIO(parquet_bytes),
        columns=["lastupdated"],
    )

    if df.is_empty():
        raise ValueError(
            f"No rows found in {s3_key}"
        )

    max_date = (
        df
        .select(
            pl.col("lastupdated")
            .cast(pl.Utf8)
            .str.to_date()
            .max()
        )
        .item()
    )

    return max_date


# ============================================================
# PROD CHECKPOINT
# ============================================================

def determine_prod_start_date():

    latest_incremental = (
        get_latest_incremental_key()
    )

    if latest_incremental:

        max_lastupdated = (
            get_max_lastupdated_from_parquet(
                latest_incremental
            )
        )

        checkpoint_source = (
            latest_incremental
        )

    else:

        max_lastupdated = (
            get_max_lastupdated_from_parquet(
                HISTORICAL_KEY
            )
        )

        checkpoint_source = (
            HISTORICAL_KEY
        )

    start_date = (
        max_lastupdated
        - timedelta(days=1)
    )

    print("")
    print("Production checkpoint:")
    print(
        f"Source: {checkpoint_source}"
    )
    print(
        f"MAX(lastupdated): {max_lastupdated}"
    )
    print(
        f"Fetch starts: {start_date}"
    )
    print("")

    return (
        start_date.strftime("%Y-%m-%d"),
        str(max_lastupdated),
        checkpoint_source,
    )


# ============================================================
# DATABRICKS AUTH
# ============================================================

def get_databricks_access_token():

    if not DATABRICKS_ACCOUNT_ID:
        raise ValueError(
            "DATABRICKS_ACCOUNT_ID is not configured"
        )

    client_id = get_ssm_parameter(
        DATABRICKS_CLIENT_ID_PARAM
    )

    client_secret = get_ssm_parameter(
        DATABRICKS_CLIENT_SECRET_PARAM
    )

    token_url = (
        "https://accounts.cloud.databricks.com/"
        f"oidc/accounts/{DATABRICKS_ACCOUNT_ID}/v1/token"
    )

    token_response = requests.post(
        token_url,
        auth=(
            client_id,
            client_secret,
        ),
        data={
            "grant_type": "client_credentials",
            "scope": "all-apis",
        },
        timeout=30,
    )

    if not token_response.ok:
        print(
            f"Databricks OAuth failed: "
            f"{token_response.status_code} "
            f"{token_response.text}"
        )

    token_response.raise_for_status()

    print(
        "Databricks OAuth authentication successful"
    )

    return token_response.json()[
        "access_token"
    ]


# ============================================================
# TRIGGER DATABRICKS JOB
# ============================================================

def trigger_databricks_job():

    if not DATABRICKS_HOST:
        raise ValueError(
            "DATABRICKS_HOST is not configured"
        )

    if not DATABRICKS_JOB_ID:
        raise ValueError(
            "DATABRICKS_JOB_ID is not configured"
        )

    access_token = (
        get_databricks_access_token()
    )

    response = requests.post(
        (
            f"{DATABRICKS_HOST.rstrip('/')}"
            "/api/2.1/jobs/run-now"
        ),
        headers={
            "Authorization":
                f"Bearer {access_token}",

            "Content-Type":
                "application/json",
        },
        json={
            "job_id":
                int(DATABRICKS_JOB_ID)
        },
        timeout=30,
    )

    if not response.ok:
        print(
            f"Databricks Jobs API failed: "
            f"{response.status_code} "
            f"{response.text}"
        )

    response.raise_for_status()

    result = response.json()

    print("")
    print(
        "Databricks job triggered successfully"
    )
    print(
        f"Databricks run_id: "
        f"{result.get('run_id')}"
    )
    print("")

    return result


# ============================================================
# MAIN HANDLER
# ============================================================

def lambda_handler(event, context):

    run_mode = event.get(
        "run_mode",
        "test",
    )

    if run_mode not in [
        "test",
        "prod",
        "auth_test",
        "job_test",
    ]:
        raise ValueError(
            "run_mode must be "
            "'test', 'prod', 'auth_test', or 'job_test'"
        )

    # ========================================================
    # JOB TEST MODE
    # ========================================================

    if run_mode == "job_test":

        print("")
        print(
            "========================================"
        )
        print(
            "DATABRICKS JOB TRIGGER TEST"
        )
        print(
            "========================================"
        )
        print(
            "Sharadar fetch: DISABLED"
        )
        print(
            "S3 write: DISABLED"
        )
        print(
            "Databricks job trigger: ENABLED"
        )
        print(
            "========================================"
        )
        print("")

        result = (
            trigger_databricks_job()
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message":
                    "Databricks job triggered successfully",

                "run_mode":
                    "job_test",

                "databricks_run":
                    result,
            }),
        }

    # ========================================================
    # AUTH TEST MODE
    # ========================================================

    if run_mode == "auth_test":

        print("")
        print(
            "========================================"
        )
        print(
            "DATABRICKS AUTH TEST"
        )
        print(
            "========================================"
        )
        print(
            "Sharadar fetch: DISABLED"
        )
        print(
            "S3 write: DISABLED"
        )
        print(
            "Databricks job trigger: DISABLED"
        )
        print(
            "OAuth authentication: ENABLED"
        )
        print(
            "========================================"
        )
        print("")

        access_token = (
            get_databricks_access_token()
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message":
                    "Databricks OAuth authentication successful",

                "run_mode":
                    "auth_test",

                "token_received":
                    bool(access_token),
            }),
        }

    # Only Sharadar modes need API key
    api_key = get_api_key()

    today = (
        datetime
        .now(timezone.utc)
        .date()
        .strftime("%Y-%m-%d")
    )

    # ========================================================
    # TEST MODE
    # ========================================================

    if run_mode == "test":

        start_date = event.get(
            "start_date",
            today,
        )

        end_date = event.get(
            "end_date",
            today,
        )

        if start_date > end_date:
            raise ValueError(
                "start_date cannot be after end_date"
            )

        print("")
        print(
            "========================================"
        )
        print(
            "TEST MODE"
        )
        print(
            "========================================"
        )
        print(
            "Checkpoint lookup: DISABLED"
        )
        print(
            "S3 write: DISABLED"
        )
        print(
            "Databricks trigger: DISABLED"
        )
        print(
            f"Requested range: "
            f"{start_date} → {end_date}"
        )
        print(
            "========================================"
        )
        print("")

        updates = fetch_updates(
            api_key=api_key,
            start_date=start_date,
            end_date=end_date,
        )

        summary = summarize_updates(
            updates
        )

        preview = preview_rows(
            updates,
            n=5,
        )

        print("TEST SUMMARY:")
        print(
            json.dumps(
                summary,
                indent=2,
            )
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message":
                    "Test preview complete",

                "run_mode":
                    "test",

                "start_date":
                    start_date,

                "end_date":
                    end_date,

                "summary":
                    summary,

                "preview":
                    preview,
            }),
        }

    # ========================================================
    # PROD MODE
    # ========================================================

    print("")
    print(
        "========================================"
    )
    print(
        "PRODUCTION MODE"
    )
    print(
        "========================================"
    )
    print(
        "Checkpoint lookup: ENABLED"
    )
    print(
        "Checkpoint: MAX(lastupdated)"
    )
    print(
        "1-day overlap: ENABLED"
    )
    print(
        "S3 write: ENABLED"
    )
    print(
        "Databricks trigger: ENABLED"
    )
    print(
        "========================================"
    )
    print("")

    (
        start_date,
        checkpoint_lastupdated,
        checkpoint_source,
    ) = determine_prod_start_date()

    updates = fetch_updates(
        api_key=api_key,
        start_date=start_date,
        end_date=today,
    )

    summary = summarize_updates(
        updates
    )

    preview = preview_rows(
        updates,
        n=5,
    )

    print(
        "PRODUCTION SUMMARY:"
    )
    print(
        json.dumps(
            summary,
            indent=2,
        )
    )

    # ========================================================
    # NOTHING TO INGEST
    # ========================================================

    if updates.is_empty():

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message":
                    "No production updates found",

                "run_mode":
                    "prod",

                "checkpoint_lastupdated":
                    checkpoint_lastupdated,

                "checkpoint_source":
                    checkpoint_source,

                "start_date":
                    start_date,

                "end_date":
                    today,

                "summary":
                    summary,

                "preview":
                    preview,

                "databricks_triggered":
                    False,
            }),
        }

    # ========================================================
    # WRITE INCREMENTAL PARQUET
    # ========================================================

    now = datetime.now(
        timezone.utc
    )

    date_partition = (
        now.strftime("%Y-%m-%d")
    )

    timestamp = (
        now.strftime(
            "%Y%m%dT%H%M%SZ"
        )
    )

    s3_key = (
        f"{S3_PREFIX}/"
        f"date={date_partition}/"
        f"sf1_{timestamp}.parquet"
    )

    buffer = io.BytesIO()

    updates.write_parquet(
        buffer
    )

    buffer.seek(0)

    s3.put_object(
        Bucket=S3_BUCKET,
        Key=s3_key,
        Body=buffer.getvalue(),
    )

    print("")
    print(
        f"Wrote {updates.height} rows"
    )
    print(
        f"s3://{S3_BUCKET}/{s3_key}"
    )
    print("")

    # ========================================================
    # TRIGGER DATABRICKS
    # ========================================================

    print(
        "Triggering Databricks pipeline..."
    )

    databricks_run = (
        trigger_databricks_job()
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message":
                "Production ingest complete",

            "run_mode":
                "prod",

            "checkpoint_lastupdated":
                checkpoint_lastupdated,

            "checkpoint_source":
                checkpoint_source,

            "start_date":
                start_date,

            "end_date":
                today,

            "ingested":
                summary,

            "preview":
                preview,

            "s3_key":
                s3_key,

            "databricks_triggered":
                True,

            "databricks_run":
                databricks_run,
        }),
    }
