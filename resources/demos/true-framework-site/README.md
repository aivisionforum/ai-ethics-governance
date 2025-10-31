# TRUE Framework Demo Snapshot

This directory contains a static snapshot of the TRUE Framework openness evaluator published at https://csheargm.github.io/true_framework/.

## Contents
- `index.html` and supporting JavaScript/CSS files copied from the upstream TRUE Framework repository.

## Regenerating
1. Update `projects/true-framework-app/` from upstream (see its `UPSTREAM.md`).
2. Copy the static assets into this directory, overwriting the existing files.
3. Copy the same assets into `docs/true-framework-demo/` to refresh the GitHub Pages mirror.
4. Open `index.html` locally or serve the folder with any static web server (`python -m http.server`) to verify functionality.
