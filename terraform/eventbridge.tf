resource "aws_iam_role" "scheduler" {
  name = "Amazon_EventBridge_Scheduler_LAMBDA_88395009df"
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Principal = {
        Service = "scheduler.amazonaws.com"
      }

      Action = "sts:AssumeRole"

      Condition = {
        StringEquals = {
          "aws:SourceAccount" = "396608769994"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "scheduler_lambda" {
  name = "sharadar-scheduler-lambda-invoke"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Action = [
        "lambda:InvokeFunction"
      ]

      Resource = aws_lambda_function.sharadar_ingest.arn
    }]
  })
}

resource "aws_scheduler_schedule" "sharadar_daily" {
  name        = "sharadar-prod-daily"
  description = "Sep_09_26 r_potential interview prep"

  schedule_expression          = "cron(30 6 * * ? *)"
  schedule_expression_timezone = "America/Vancouver"

  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 10
  }

  target {
    arn      = aws_lambda_function.sharadar_ingest.arn
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      run_mode = "prod"
    })

    retry_policy {
      maximum_event_age_in_seconds = 21600
      maximum_retry_attempts       = 3
    }
  }
}
