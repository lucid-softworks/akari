# Translation Key Management Script

This script provides a streamlined CLI for managing translation keys across all language files.

## Usage

```bash
npm run add-translations
```

## Workflow

The script follows a simple, intuitive workflow:

1. **Section?** - Enter the section name (e.g., `common`, `messages`, `settings`)
   - If section doesn't exist, it suggests similar ones or creates a new one
2. **Key?** - Enter the translation key (e.g., `newFeature`, `welcomeMessage`)
   - If key already exists, it shows an error and exits
3. **Value?** - Enter the English translation value
   - This is required and cannot be empty
4. **Add other languages?** - Choose whether to add translations for other languages
   - If yes, select from a numbered list of available languages
   - Enter the translation for the selected language

## Features

- **Smart section detection** - Suggests similar sections if you mistype
- **Duplicate prevention** - Checks if keys already exist
- **Auto-creation** - Creates new sections automatically
- **Language selection** - Shows language names and flags for easy selection
- **Minimal output** - Only shows success/error messages, no verbose logging

## Example Session

```
🌍 Translation Manager

Section? common
Key? newFeature
Value? New feature description

Add translations for other languages? (y/n): y

Available languages:
1. 🇪🇸 Español (Spanish)
2. 🇫🇷 Français (French)
3. 🇩🇪 Deutsch (German)
...

Select language (number): 1
🇪🇸 Español value: Descripción de nueva función

✅ Done!
```

## Tips

- Use tab completion for section names (if your terminal supports it)
- Section names are case-insensitive
- You can skip adding other languages by answering 'n'
- The script automatically handles all file formatting
