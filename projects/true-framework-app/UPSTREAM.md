# Upstream Source

- Repository: https://github.com/csheargm/true_framework
- Commit: 9bf5556fa7faa296e8abb35f492945540cfb92b3 (retrieved 2025-10-21)
- License: README states MIT; upstream repository does not currently include a standalone LICENSE file.

# Sync Process

1. Fetch the latest upstream snapshot into `upstream/true_framework/`:
   ```bash
   git clone https://github.com/csheargm/true_framework.git upstream/true_framework
   ```
   (or `git pull` inside the cached clone if it already exists.)
2. Copy the repository contents into `projects/true-framework-app/`, overwriting existing files while reviewing diffs for local adjustments.
3. Update this file with the new commit SHA and retrieval date before committing changes.

# Local Adjustments

- Added this `UPSTREAM.md` to track provenance and licensing context.
