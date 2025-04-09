# Script to initialize git repository and push to GitHub
# Run this script after setting up the project

# Initialize git repository
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: Vocal Translator with voice cloning"

# Set remote repository
git remote add origin https://github.com/Oinjenieur/VocalTranslator.git

# Push to GitHub
git push -u origin master

Write-Host "Repository has been pushed to GitHub. Next steps:"
Write-Host "1. Build and push Docker image:"
Write-Host "   docker build -t oinjedock/vocaltranslator:latest ."
Write-Host "   docker push oinjedock/vocaltranslator:latest"
Write-Host "2. Or use docker-compose to start the application locally:"
Write-Host "   docker-compose up -d" 