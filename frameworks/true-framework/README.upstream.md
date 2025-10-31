# TRUE Framework

**Transparent, Reproducible, Understandable, Executable** - A scorecard framework for evaluating the openness and reproducibility of open-source Large Language Models.

[![Implementation/Demo](https://img.shields.io/badge/Implementation%2FDemo-blue)](https://csheargm.github.io/true_framework/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

The TRUE Framework provides a standardized methodology to assess how "open" an LLM truly is—beyond just licensing. It evaluates models across four critical dimensions:

- **Transparent**: Are critical components openly disclosed?
- **Reproducible**: Can the model be retrained?
- **Understandable**: Is the model well-documented?
- **Executable**: Can users run or fine-tune locally?

Models are scored out of 30 points and categorized into tiers: Platinum (28-30), Gold (21-27), Silver (11-20), or Bronze (0-10).

## Why TRUE?

As the LLM ecosystem grows, "open source" means different things to different projects. Some release only weights, others include training code, and few provide complete reproducibility. TRUE offers:

- **Standardized evaluation** for comparing models
- **Transparency** for researchers and developers
- **Clarity** for model creators
- **Guidance** for grant assessments and research funding

## How TRUE Fills the Gap

While several frameworks exist for evaluating AI models, TRUE addresses specific gaps in evaluating LLM openness and reproducibility:

### Comparison with Existing Frameworks

| Framework | Focus | Approach | Key Gap TRUE Addresses |
|-----------|-------|----------|------------------------|
| **OSI Open Source AI Definition (OSAID)** | Binary compliance (open vs. not open) | Checklist-based qualification | No gradation or scoring system; binary pass/fail doesn't capture partial openness |
| **Model Openness Framework (MOF)** | Artifact completeness across 3 classes | Class-based (I, II, III) classification | Limited to 3 broad categories; doesn't quantify specific gaps or provide actionable scoring |
| **Responsible AI Scorecards** | Ethics, fairness, bias, safety | Multi-stakeholder compliance reporting | Focuses on ethical deployment, not reproducibility or scientific openness |
| **LLM Evaluation Tools** (DeepEval, Evidently, OpenAI Evals) | Model performance and output quality | Benchmark testing and accuracy metrics | Evaluates what models do, not how open or reproducible they are |
| **Hugging Face Open LLM Leaderboard** | Model performance comparison | Standardized benchmarks | Performance-focused; doesn't assess code, data, or training transparency |

### What Makes TRUE Different

#### 1. Quantitative Scoring with Granularity

- TRUE provides a 30-point scale with 13 distinct subcomponents
- Unlike MOF's 3 classes or OSAID's binary approach, TRUE allows fine-grained comparison
- Partial credit captures incremental transparency improvements

#### 2. LLM-Specific Focus

- Purpose-built for foundation LLMs, not general AI systems
- Evaluates training reproducibility, not just inference performance
- Addresses specific LLM development artifacts (checkpoints, training configs, dataset composition)

#### 3. Actionable Guidance

- Each subcomponent has clear 2-point criteria
- Model creators know exactly what to release to improve scores
- Researchers can identify specific gaps in openness

#### 4. Four-Tier Classification

- Platinum/Gold/Silver/Bronze tiers provide intuitive categorization
- Enables quick comparison without losing numerical precision
- Balances granularity with accessibility

#### 5. Reproducibility-First Design

- Unlike performance leaderboards, TRUE prioritizes scientific reproducibility
- Emphasizes training transparency, not just inference capability
- Explicitly rewards community-verified replication attempts

#### 6. Complementary to Existing Standards

- Works alongside OSI and MOF definitions
- Can be automated (unlike manual compliance checklists)
- Provides quantitative metrics for frameworks that are qualitative

### The Gap TRUE Fills

**Problem**: Most "open source" LLMs fall into a gray area—they're not completely closed, but far from
fully reproducible. Existing frameworks either:

- Label them binary "open" or "not open" (OSAID)
- Place them in broad buckets (MOF Classes)
- Focus on performance rather than openness (Leaderboards)
- Emphasize ethics over reproducibility (Responsible AI)

**TRUE's Solution**: A numerical, granular scorecard specifically designed to measure and compare LLM
openness across the dimensions that matter for scientific reproducibility—transparency, reproducibility,
understandability, and executability.

This enables:

- **Researchers** to quickly assess if they can reproduce a model
- **Developers** to identify specific gaps in their releases
- **Funders** to require minimum TRUE scores for grants
- **Community** to track industry progress toward genuine openness

## Quick Links

- **[Full Specification](spec/true_framework_specification.md)** - Complete scoring criteria and methodology
- **[Implementation Repository](https://github.com/csheargm/true_framework)** - Automated scoring tools and CLI
- **[Examples](spec/true_framework_specification.md#example-mistral-7b-as-of-oct-2025)** - See how popular models score

## Scoring Summary

The framework evaluates 30 points across four categories:

| Category | Max Points | Focus Area |
|----------|------------|------------|
| **Transparent** | 10 | License, weights, code, dataset disclosure |
| **Reproducible** | 10 | Hardware specs, training configs, checkpoints |
| **Understandable** | 6 | Documentation, architecture, data provenance |
| **Executable** | 4 | Local inference and fine-tuning capability |

### Tier Classification

- **Platinum (28-30)**: Fully open and reproducible
- **Gold (21-27)**: Strong openness with minor gaps
- **Silver (11-20)**: Some transparency, limited reproducibility
- **Bronze (0-10)**: Minimal openness

## Using the Framework

### Manual Evaluation

1. Gather model artifacts (repository, documentation, papers)
2. Score against criteria in the [specification](spec/true_framework_specification.md)
3. Calculate total score and determine tier
4. Document justifications for each score

### Automated Evaluation

Use the [implementation repository](https://github.com/csheargm/true_framework) for automated scoring:

```bash
# Install the TRUE Framework CLI
pip install true-framework

# Score a model repository
true-score --repo https://github.com/owner/model-repo

# Generate a report
true-score --repo https://github.com/owner/model-repo --output report.json
```

## Example Evaluation

**Mistral-7B** (as of October 2025):

- **Transparent**: 6/10 - MIT license, weights and inference code available, but no training code or datasets
- **Reproducible**: 2/10 - No training setup disclosed
- **Understandable**: 3/6 - Documentation exists but minimal dataset clarity
- **Executable**: 2/4 - Inference works, fine-tuning not fully supported

**Total**: 13/30 (Silver Tier)

## Contributing

We welcome contributions to improve the TRUE Framework specification. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute

- Propose improvements to scoring criteria
- Submit example evaluations of popular models
- Report ambiguities or edge cases
- Suggest new subcomponents or dimensions

## Implementation/Demo

A working implementation and demo of the TRUE framework is available at: https://csheargm.github.io/true_framework/

The reference implementation of this specification is maintained in the [true_framework repository](https://github.com/csheargm/true_framework), which includes:

- Command-line tools for automated scoring
- GitHub Actions for continuous evaluation
- Community leaderboard infrastructure
- Integration with HuggingFace and GitHub APIs

## Future Roadmap

- Community leaderboard for LLM reproducibility
- GitHub Actions for automatic repository scoring
- Integration with research conferences and grant assessments
- Extension to multimodal and specialized models
- Versioning system for specification updates

## Citation

If you use the TRUE Framework in your research or evaluation process, please cite:

```bibtex
@misc{true_framework_2025,
  title={TRUE Framework: A Scorecard for Open LLM Reproducibility},
  author={TRUE Framework Contributors},
  year={2025},
  howpublished={\url{https://github.com/csheargm/true_framework_spec}}
}
```

## License

This specification is released under the MIT License. See [LICENSE](LICENSE) for details.

## Contact

- **Issues**: [GitHub Issues](https://github.com/csheargm/true_framework_spec/issues)
- **Implementation**: [true_framework repository](https://github.com/csheargm/true_framework)

---

**Note**: This is the specification repository. For the implementation and automated scoring tools, visit the [true_framework repository](https://github.com/csheargm/true_framework).
