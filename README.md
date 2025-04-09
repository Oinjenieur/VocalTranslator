# VocalTranslator

Une application web qui permet de traduire des messages vocaux entre différentes langues en temps réel.

## Fonctionnalités

- Reconnaissance vocale dans plusieurs langues
- Traduction automatique
- Synthèse vocale pour la lecture des traductions
- Interface utilisateur simple et intuitive
- Prise en charge de nombreuses langues

## Installation

1. Cloner le dépôt
   ```
   git clone https://github.com/Oinjenieur/VocalTranslator.git
   cd VocalTranslator
   ```

2. Installer les dépendances
   ```
   pip install -r requirements.txt
   ```

3. Lancer l'application
   ```
   python app.py
   ```

4. Accéder à l'application dans votre navigateur à l'adresse `http://localhost:5000`

## Docker

L'application est également disponible sous forme d'image Docker :

```
docker pull oinjedock/vocaltranslator:latest
docker run -p 5000:5000 oinjedock/vocaltranslator:latest
```

## Contributions

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence

MIT 