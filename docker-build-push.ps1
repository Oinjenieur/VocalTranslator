# Variables
$IMAGE_NAME = "oinjedock/vocaltranslator"
$TAG = "latest"

# Construire l'image Docker
Write-Host "Building Docker image $IMAGE_NAME`:$TAG..."
docker build -t $IMAGE_NAME`:$TAG .

# Se connecter à Docker Hub
Write-Host "Please log in to Docker Hub"
docker login

# Pousser l'image vers Docker Hub
Write-Host "Pushing image to Docker Hub..."
docker push $IMAGE_NAME`:$TAG

Write-Host "Done! Image pushed to $IMAGE_NAME`:$TAG" 