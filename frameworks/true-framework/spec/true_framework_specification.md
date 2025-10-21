# TRUE Framework for Open LLM Reproducibility Evaluation

## Overview
**TRUE** (Transparent, Reproducible, Understandable, Executable) is a scorecard framework to evaluate the openness and reproducibility of open-source LLMs. It aims to help researchers, developers, and policymakers assess how "open" a model truly is—beyond just licensing.

---

## Dimensions & Scoring
The TRUE framework scores a model across four categories. The total possible score is **30 points**.

### 1. Transparent (Max 10 pts)
Evaluates whether critical components of the model's development are openly disclosed.

| Subcomponent                  | Points | Criteria                                      |
|------------------------------|--------|-----------------------------------------------|
| Open license (MIT/Apache)    | 2      | Permissive license clearly published          |
| Model weights                | 2      | Downloadable full weights                     |
| Inference code               | 2      | Full inference pipeline publicly shared       |
| Training code                | 2      | Full training scripts publicly available      |
| Dataset disclosure           | 2      | Datasets listed or described in detail        |

### 2. Reproducible (Max 10 pts)
Measures how feasible it is to retrain the model.

| Subcomponent                        | Points | Criteria                                            |
|------------------------------------|--------|-----------------------------------------------------|
| Hardware/training setup disclosed  | 2      | GPUs, FLOPs, cluster specs disclosed                |
| Training pipeline + configs        | 2      | Config files, data pipeline, environment setup      |
| Intermediate checkpoints or logs   | 2      | Evidence of training steps/checkpoints shared       |
| Cost or training time disclosed    | 2      | Compute cost or time to train made public           |
| Community-verified replication     | 2      | 3rd-party reproducibility attempt exists            |

### 3. Understandable (Max 6 pts)
Is the model well-documented for others to understand and trust?

| Subcomponent           | Points | Criteria                                                  |
|-----------------------|--------|-----------------------------------------------------------|
| Model card & usage    | 2      | Documentation clearly explains usage and design           |
| Architecture design   | 2      | Model structure explained in paper or docs                |
| Dataset provenance    | 2      | Licensing, source, and curation process documented        |

### 4. Executable (Max 4 pts)
Can users run or fine-tune the model locally?

| Subcomponent                   | Points | Criteria                                               |
|-------------------------------|--------|--------------------------------------------------------|
| Inference is locally runnable | 2      | Model loads and runs with shared instructions          |
| Fine-tuning pipeline runnable | 2      | Fine-tuning scripts or configs usable on public infra  |

---

## Interpreting Scores

| Tier       | Score Range | Description                              |
|------------|-------------|------------------------------------------|
| Platinum   | 28–30       | Fully open and reproducible              |
| Gold       | 21–27       | Strong openness, minor gaps              |
| Silver     | 11–20       | Some transparency, low reproducibility   |
| Bronze     | 0–10        | Minimal openness                         |

---

## Example: Mistral-7B (as of Oct 2025)

| Category       | Score | Justification                                                                 |
|----------------|-------|------------------------------------------------------------------------------|
| Transparent    | 6     | MIT license, weights, inference code open, but no training code or datasets |
| Reproducible   | 2     | No training setup disclosed, no cost info, partial 3rd-party runs            |
| Understandable | 3     | Docs and benchmarks exist, but minimal dataset clarity                       |
| Executable     | 2     | Inference runs easily, fine-tuning not fully supported                       |
| **Total**      | 13/30 | Silver tier                                                                  |

---

## Usage Instructions

1. **Gather model artifacts**: repo, docs, HuggingFace page, arXiv paper.
2. **Assign partial or full points** using tables above.
3. **Tally score** and classify into Bronze/Silver/Gold/Platinum.
4. Optionally include a scoring note explaining partial credit.

---

## Implementation/Demo
A working implementation and demo of the TRUE framework is available at: https://csheargm.github.io/true_framework/

- Use heuristics (e.g. LICENSE file, `.bin` weights, `train.py`) for automation.
- Partial credit is allowed where information is incomplete but indicative.
- Intended for **foundation LLMs**, not tools or wrappers.

---

## Follow-Up
To support the adoption of TRUE:
- Launch a community leaderboard for reproducibility.
- Develop GitHub actions to auto-score LLM repos.
- Use TRUE in research, conferences, and open source grant assessments.

