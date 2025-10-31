# Upstream Source

- Repository: https://github.com/csheargm/true_framework_spec
- Commit: 0a6e7bb04e8e0f114492a6518c0f62931054a3c0 (retrieved 2025-10-21)
- License: MIT (see `LICENSE`)

# Sync Process

1. From the repository root, fetch updates:
   ```bash
   git clone https://github.com/csheargm/true_framework_spec.git upstream/true_framework_spec
   ```
   or pull updates if the temporary `upstream/` cache already exists.
2. Copy the `spec/` directory, `LICENSE`, and `README.md` (renamed `README.upstream.md`) into `frameworks/true-framework/`.
3. Update this file with the new commit SHA and retrieval date.
4. Review upstream changes for structural differences before committing.

# Local Adjustments

- Added `README.md` and this `UPSTREAM.md` to explain how the specification is organized inside this repository.
