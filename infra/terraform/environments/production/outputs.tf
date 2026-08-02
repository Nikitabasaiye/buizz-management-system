output "application_public_ip" {
  value       = aws_eip.app.public_ip
  description = "Create A records for buizz.com, www, api, and admin-api pointing here."
}

output "ec2_instance_id" {
  value = aws_instance.app.id
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "github_terraform_role_arn" {
  value = aws_iam_role.github_terraform.arn
}

output "ecr_registry" {
  value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "media_cloudfront_domain" {
  value = try(aws_cloudfront_distribution.media[0].domain_name, null)
}

output "rds_endpoint" {
  value     = aws_db_instance.mysql.address
  sensitive = true
}

output "valkey_endpoint" {
  value     = aws_elasticache_replication_group.valkey.primary_endpoint_address
  sensitive = true
}
