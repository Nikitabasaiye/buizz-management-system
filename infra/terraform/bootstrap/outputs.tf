output "state_bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "backend_init_command" {
  value = "terraform init -backend-config=\"bucket=${aws_s3_bucket.terraform_state.id}\" -backend-config=\"key=production/terraform.tfstate\" -backend-config=\"region=${var.aws_region}\" -backend-config=\"use_lockfile=true\" -backend-config=\"encrypt=true\""
}
