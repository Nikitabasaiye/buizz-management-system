variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "github_repository" {
  type        = string
  description = "GitHub owner/repository, for example devopsbuizz/buizz-management-system."
  default     = "devopsbuizz/buizz-management-system"
}

variable "repository_clone_url" {
  type    = string
  default = "https://github.com/devopsbuizz/buizz-management-system.git"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "cache_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "alert_email" {
  type        = string
  description = "Email for CloudWatch alarm notifications. Leave empty to skip the subscription."
  default     = ""
}

variable "protect_data_from_destroy" {
  type        = bool
  description = "Enable RDS deletion protection. Keep true in production."
  default     = true
}

variable "enable_cloudfront" {
  type        = bool
  description = "Create CloudFront media delivery after AWS verifies the account."
  default     = false
}
