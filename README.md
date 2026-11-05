# Hoot's Word Quiz 🦉

A friendly eleven plus vocabulary quiz for the iPad. It works offline once installed.

App address: **https://suhaneyankita.github.io/hoot-word-quiz/**

## Putting it on the iPad (once)

1. Open the address above in **Safari** on the iPad.
2. Tap the **Share** button (square with an arrow) → **Add to Home Screen** → **Add**.
3. Open it from the owl icon. It now works with no internet.

## Adding new words

Send Claude a photo or a list of words and ask it to add them. Claude:

1. Writes the meaning, synonyms, antonyms and a sentence for each word.
2. Adds them to `Word List.xlsx`.
3. Runs `bash tools/publish.sh`.

The next time the iPad is online and the app is opened, the new words arrive ("🎁 new words arrived!"). Her progress is kept.

## Seeing her progress

- On the iPad, **press and hold Hoot** on the start screen for 2 seconds to open the **Grown-ups corner**. It lists the words to practise.
- Tap **Send progress to Mac 📤** and AirDrop the file to the Mac.
- Ask Claude to import it (`.venv/bin/python tools/import_progress.py <file> "Word List.xlsx"`). This fills in Status, Times asked, Times wrong, Correct in a row and Last seen.

## For developers

- `app/` is the published site (plain HTML/CSS/JS). Logic lives in `app/js/*.js` with no DOM access.
- Run the tests with `npm test` and `.venv/bin/pytest -q tests`.
- To run it locally, use `python3 -m http.server 8765 -d app`.
- `Word List.xlsx` is kept on the Mac only and isn't published.
