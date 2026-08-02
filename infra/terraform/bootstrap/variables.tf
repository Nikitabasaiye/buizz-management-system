variable "aws_region" {
  type        = string
  description = "AWS region for the Terraform state bucket."
  default     = "ap-south-1"
}

variable "state_bucket_name" {
  type        = string
  description = "Globally unique S3 bucket name, for example buizz-terraform-state-123456789012."
}
