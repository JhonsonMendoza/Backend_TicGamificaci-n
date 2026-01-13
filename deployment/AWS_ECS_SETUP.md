# Instrucciones para desplegar en AWS ECS

## 1. Preparar AWS CLI

```bash
# Instalar AWS CLI
pip install awscli

# Configurar credenciales
aws configure
```

## 2. Crear ECR Repository

```bash
aws ecr create-repository \
  --repository-name tesis-backend \
  --region us-east-1

# Guardar el URI (lo necesitarás después)
```

## 3. Autenticarse y pushear imagen

```bash
# Get login command
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t tesis-backend:latest .
docker tag tesis-backend:latest \
  <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/tesis-backend:latest

# Push
docker push \
  <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/tesis-backend:latest
```

## 4. Crear RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier tesis-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password "TuContraseñaSegura123!" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --publicly-accessible false \
  --region us-east-1
```

## 5. Crear VPC y Security Groups

```bash
# Crear VPC (o usar la default)
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text)

# Crear security group para RDS
RDS_SG=$(aws ec2 create-security-group \
  --group-name tesis-rds-sg \
  --description "Security group for Tesis RDS" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Crear security group para ECS
ECS_SG=$(aws ec2 create-security-group \
  --group-name tesis-ecs-sg \
  --description "Security group for Tesis ECS" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Permitir tráfico entre ECS y RDS
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG
```

## 6. Crear ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name tesis-cluster \
  --region us-east-1
```

## 7. Registrar Task Definition

Editar `aws-ecs-task-definition.json` reemplazando:
- `<AWS_ACCOUNT_ID>` con tu ID de cuenta
- `<REGION>` con tu región (ej: us-east-1)
- `tesis-postgres.XXXXXX.rds.amazonaws.com` con el endpoint de tu RDS

```bash
aws ecs register-task-definition \
  --cli-input-json file://deployment/aws-ecs-task-definition.json \
  --region us-east-1
```

## 8. Crear ECS Service

```bash
aws ecs create-service \
  --cluster tesis-cluster \
  --service-name tesis-backend-service \
  --task-definition tesis-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=tesis-backend,containerPort=3000" \
  --region us-east-1
```

## 9. Crear Load Balancer (ALB)

```bash
# Crear ALB
ALB=$(aws elbv2 create-load-balancer \
  --name tesis-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups $ECS_SG \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Crear Target Group
TG=$(aws elbv2 create-target-group \
  --name tesis-backend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --health-check-path /health \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Crear Listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG
```

## 10. Verificar despliegue

```bash
# Ver servicios
aws ecs list-services --cluster tesis-cluster

# Ver tareas
aws ecs list-tasks --cluster tesis-cluster --service-name tesis-backend-service

# Ver detalles de tarea
aws ecs describe-tasks \
  --cluster tesis-cluster \
  --tasks <task-arn> \
  --query 'tasks[0].containers[0].lastStatus'

# Ver logs
aws logs tail /ecs/tesis-backend --follow
```

## 11. Escalar automáticamente

```bash
# Crear Auto Scaling target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/tesis-cluster/tesis-backend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Crear política de escalado por CPU
aws application-autoscaling put-scaling-policy \
  --policy-name cpu-scaling \
  --service-namespace ecs \
  --resource-id service/tesis-cluster/tesis-backend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration \
  TargetValue=70.0,PredefinedMetricSpecification="{PredefinedMetricType=ECSServiceAverageCPUUtilization}"
```

## Troubleshooting

### Task no inicia
```bash
aws ecs describe-tasks --cluster tesis-cluster --tasks <task-arn> \
  --query 'tasks[0].containers[0].[lastStatus, stopCode, reason]'
```

### Ver logs
```bash
aws logs get-log-events \
  --log-group-name /ecs/tesis-backend \
  --log-stream-name "ecs/tesis-backend/<task-id>"
```
