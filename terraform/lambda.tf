variable "lambda_image_uri" {
  type = string
}

resource "aws_iam_role" "sharadar_lambda" {
  name        = "sharadar-lambda-execution-role"
  description = "Allows Lambda functions to call AWS services on your behalf."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.sharadar_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "sharadar_lambda_policy" {
  name = "sharadar-lambda-execution-rolePolicy"
  role = aws_iam_role.sharadar_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = [
          "arn:aws:ssm:us-west-2:396608769994:parameter/r-potential/sharadar/api-key",
          "arn:aws:ssm:us-west-2:396608769994:parameter/r-potential/databricks/client-id",
          "arn:aws:ssm:us-west-2:396608769994:parameter/r-potential/databricks/client-secret"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::project-1-sharadar-fundamentals/r_potential/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = "arn:aws:s3:::project-1-sharadar-fundamentals"
      }
    ]
  })
}

resource "aws_lambda_function" "sharadar_ingest" {
  function_name = "sharadar-ingest-dev"
  role          = aws_iam_role.sharadar_lambda.arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri

  memory_size = 1024
  timeout     = 600

  environment {
    variables = {
      SSM_PARAMETER_NAME             = "/r-potential/sharadar/api-key"
      S3_BUCKET                      = "project-1-sharadar-fundamentals"
      S3_PREFIX                      = "r_potential/dev/bronze/sf1/incremental"
      DATABRICKS_HOST                = "https://dbc-28615879-fb1b.cloud.databricks.com"
      DATABRICKS_ACCOUNT_ID          = "f70846d4-3a21-408f-bbc9-89f4dc9c6e2c"
      DATABRICKS_CLIENT_ID_PARAM     = "/r-potential/databricks/client-id"
      DATABRICKS_CLIENT_SECRET_PARAM = "/r-potential/databricks/client-secret"
      DATABRICKS_JOB_ID              = "911010530956642"
    }
  }
}
