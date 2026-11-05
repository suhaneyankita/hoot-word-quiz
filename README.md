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

## Saving progress to GitHub automatically

1. On GitHub, signed in as suhaneyankita, go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name it "Hoot iPad" and set an expiry of up to a year. Under **Repository access** choose **Only select repositories → hoot-word-quiz**. Under **Permissions → Contents**, choose **Read and write**. Then generate it and copy it.
3. On the iPad, open the **Grown-ups corner** (press and hold Hoot), paste the key under **Save progress to GitHub** and tap **Connect**.

After every quiz, if the iPad is online, the app saves `progress/progress.json` to the repository. To copy it into the spreadsheet, ask Claude to run `bash tools/update_progress.sh`. If the iPad is ever lost, delete the key on GitHub on the same page.

## Seeing her progress

- On the iPad, **press and hold Hoot** on the start screen for 2 seconds to open the **Grown-ups corner**. It lists the words to practise.
- Tap **Send progress to Mac 📤** and AirDrop the file to the Mac.
- Ask Claude to import it (`.venv/bin/python tools/import_progress.py <file> "Word List.xlsx"`). This fills in Status, Times asked, Times wrong, Correct in a row and Last seen.

## For developers

- `app/` is the published site (plain HTML/CSS/JS), copied to the `gh-pages` branch by `tools/publish.sh`. Logic lives in `app/js/*.js` with no DOM access.
- Run the tests with `npm test` and `.venv/bin/pytest -q tests`.
- To run it locally, use `python3 -m http.server 8765 -d app`.
- `Word List.xlsx` is the master word list (with her progress after imports). It is in this public repo but is not part of the website.
