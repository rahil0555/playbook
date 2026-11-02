# Pip's voice clips

Generated files, not written by hand. Run `npm run voice:generate` with the ElevenLabs key set (see
[.env.example](../../../.env.example) and the "Pip's voice" section of the main README) and this folder fills with
one mp3 per fixed line, plus a rewritten `manifest.json`.

Until then `manifest.json` lists no clips and leaves `dynamic` off, so the app says every line with the browser's
own voice and makes no request to the voice service at all.
