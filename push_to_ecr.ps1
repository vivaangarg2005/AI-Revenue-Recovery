$ErrorActionPreference = "Stop"
aws ecr create-repository --repository-name api-image --region ap-south-1
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 676259471736.dkr.ecr.ap-south-1.amazonaws.com
docker tag api-image:latest 676259471736.dkr.ecr.ap-south-1.amazonaws.com/api-image:latest
docker push 676259471736.dkr.ecr.ap-south-1.amazonaws.com/api-image:latest
