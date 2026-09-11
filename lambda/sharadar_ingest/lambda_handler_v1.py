import json
import os
import io
from datetime import datetime, timezone

import boto3
import polars as pl
import requests


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
    "r_potential/bronze/sf1/incremental",
)

SHARADAR_BASE_URL = (
    "https://data.nasdaq.com/api/v3/datatables/SHARADAR/SF1"
)

ssm = boto3.client("ssm")
s3 = boto3.client("s3")


def get_api_key():
    response = ssm.get_parameter(
        Name=SSM_PARAMETER_NAME,
        WithDecryption=True,
    )
    return response["Parameter"]["Value"]


def fetch_updates(api_key, since_date, per_page=10000, max_pages=200):
    chunks = []
    cursor_id = None

    for iteration in range(max_pages):
        params = {
            "api_key": api_key,
            "lastupdated.gte": since_date,
            "qopts.per_page": per_page,
        }

        if cursor_id:
            params["qopts.cursor_id"] = cursor_id

        print(f"Fetching page {iteration + 1}")

        response = requests.get(
            SHARADAR_BASE_URL,
            params=params,
            timeout=60,
        )
        response.raise_for_status()

        datatable = response.json()["datatable"]

        columns = [c["name"] for c in datatable["columns"]]
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


def lambda_handler(event, context):
    api_key = get_api_key()

    since_date = event.get("since_date")

    if not since_date:
        raise ValueError(
            "since_date is required, for example 2026-09-08"
        )

    updates = fetch_updates(
        api_key=api_key,
        since_date=since_date,
    )

    if updates.is_empty():
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "No updates found",
                "since_date": since_date,
                "rows": 0,
            }),
        }

    now = datetime.now(timezone.utc)

    date_partition = now.strftime("%Y-%m-%d")
    timestamp = now.strftime("%Y%m%dT%H%M%SZ")

    s3_key = (
        f"{S3_PREFIX}/"
        f"date={date_partition}/"
        f"sf1_{timestamp}.parquet"
    )

    buffer = io.BytesIO()
    updates.write_parquet(buffer)
    buffer.seek(0)

    s3.put_object(
        Bucket=S3_BUCKET,
        Key=s3_key,
        Body=buffer.getvalue(),
    )

    print(
        f"Wrote {updates.height} rows "
        f"to s3://{S3_BUCKET}/{s3_key}"
    )

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Sharadar incremental ingest complete",
            "since_date": since_date,
            "rows": updates.height,
            "s3_key": s3_key,
        }),
    }
