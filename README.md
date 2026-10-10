# TyporaX

Practice typing by copying out real books. Pick a classic, or upload your own novel, and pick up exactly where you left off.

- **Popular books**: opening excerpts of public-domain classics, ready to type.
- **Your own text**: upload a `.txt` file or paste anything. Project Gutenberg licence headers are stripped automatically.
- **Typewriter sound**: soft sounds synthesised in the browser (Web Audio), with a "Soft keys" alternative and a volume control.
- **Page or open book**: a toggle above the text switches between a single page and a two-page spread (wide windows only).
- **Start anywhere**: "Start from..." jumps to a detected chapter or section, any point in the book (slider), or a phrase you search for.
- **Sound switch**: turn the typing sound on or off in Settings (or with the speaker button).
- **Live speed**: a faint WPM readout floats above the cursor (toggle it in Settings).
- **Quick fixes**: `Backspace` removes a letter, `Ctrl+Backspace` removes the whole word.
- **Optional tour**: first-time visitors are asked whether they want a short, skippable tour; the `?` button replays it.
- **Easy on the eyes**: warm "Paper" theme and a dark "Lamplight" theme.
- **Resume anywhere**: uploaded books live in IndexedDB and your place is saved in localStorage, all inside your browser.

## Run it

No build step. Open `index.html` directly, or serve the folder:

```bash
python -m http.server 5173
```

Then visit <http://localhost:5173>.

## Notes

- Typing is ASCII-only: curly quotes become straight quotes, em dashes become `--`, accents are dropped.
- Paragraph breaks are shown as `↵` and need the Enter key, like a real typewriter.
- Data is per browser and per origin. Clearing site data removes your library and progress.
