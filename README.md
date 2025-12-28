# BayesLatentLab

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/seonghobae/BayesLatentLab)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Bayesian Multilevel IRT/CFA/EFA + Test Equating/Linking + DIF + Local Dependence Analysis Tool**

BayesLatentLab is a comprehensive analysis toolkit for psychometric modeling that integrates Item Response Theory (IRT), Confirmatory Factor Analysis (CFA), Exploratory Factor Analysis (EFA), test equating/linking, Differential Item Functioning (DIF) detection, and local dependence diagnostics into a unified workflow.

## Features

### Core Capabilities

- **Multiple IRT Model Families**
  - Rasch (1PL with fixed discrimination)
  - 1PL (common-slope, estimated)
  - 2PL, 3PL, 4PL, 5PL models
  - Graded Response Model (GRM) for ordinal data
  - Generalized Partial Credit Model (GPCM)
  - Nominal Response Model (NRM)

- **Multilevel Extensions**
  - Random intercept models
  - Random loading models
  - Crossed random effects
  - Group-level variance decomposition

- **Test Equating & Linking**
  - Concurrent calibration
  - Separate calibration with linking
  - Fixed Item Parameter Calibration (FIPC)
  - Multiple linking methods: Mean/Mean, Mean/Sigma, Stocking-Lord, Haebara
  - Anchor drift and DIF diagnostics
  - Conversion tables with standard errors

- **DIF Detection**
  - IRT Likelihood Ratio tests
  - Wald and Lord's tests
  - Bayesian DIF analysis
  - Effect size computation
  - Multiple comparison correction (Bonferroni, Holm, FDR)
  - Anchor purification procedures

- **Fit Diagnostics**
  - Item fit: Infit/Outfit (Rasch), S-X² (Orlando & Thissen)
  - Person fit: Zh statistic (Drasgow et al.)
  - Local dependence detection (Q3 statistics)
  - Testlet identification and suggestions

- **Dimension Selection**
  - Grid search with LOO/WAIC comparison
  - Shrinkage-based methods
  - Automatic optimal dimension detection

## Installation

### Prerequisites

- Node.js >= 18.0.0
- CmdStan (for Bayesian estimation)

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

## Quick Start

### 1. Basic IRT Analysis

```typescript
import { runAnalysis, createDefaultConfig } from 'bayes-latent-lab';

// Prepare your data
const responses = [
  { person_id: 'p1', item_id: 'item1', response: 1 },
  { person_id: 'p1', item_id: 'item2', response: 0 },
  // ... more responses
];

const items = [
  { item_id: 'item1', item_type: 'binary' },
  { item_id: 'item2', item_type: 'binary' },
  // ... more items
];

// Configure analysis
const config = createDefaultConfig();
config.model.model_family = 'irt_2pl';
config.estimation.chains = 4;
config.estimation.iterations = 2000;

// Run analysis
const result = await runAnalysis({ responses, items, config });

if (result.success) {
  console.log('Analysis completed successfully');
  console.log(result.results);
} else {
  console.error('Analysis failed:', result.errors);
}
```

### 2. Ordinal Data with GRM

```typescript
import { exampleConfigs } from 'bayes-latent-lab';

const config = exampleConfigs.grm();

const items = [
  { 
    item_id: 'item1', 
    item_type: 'ordinal',
    categories: [1, 2, 3, 4, 5]
  },
  // ... more ordinal items
];

const result = await runAnalysis({ responses, items, config });
```

### 3. DIF Analysis

```typescript
import { exampleConfigs } from 'bayes-latent-lab';

const config = exampleConfigs.withDIF();
config.dif = {
  method: 'irt_lr',
  reference_group: 'male',
  focal_groups: ['female'],
  anchor_items: ['item1', 'item2', 'item3'],
  test_parameters: ['discrimination', 'difficulty'],
  multiple_comparison_correction: 'holm',
  effect_size: true
};

const result = await runAnalysis({ responses, items, config });

if (result.success && result.results?.dif_results) {
  console.log('Flagged DIF items:', result.results.dif_results.flagged_items);
}
```

### 4. Test Equating

```typescript
import { exampleConfigs } from 'bayes-latent-lab';

const config = exampleConfigs.withEquating();
config.equating = {
  method: 'separate_linking',
  linking_method: 'stocking_lord',
  base_form: 'form_a',
  target_forms: ['form_b'],
  anchor_items: ['item1', 'item2', 'item3'],
  compute_se: true,
  sensitivity_analysis: true
};

const result = await runAnalysis({ responses, items, config });

if (result.success && result.results?.equating_results) {
  console.log('Linking coefficients:', result.results.equating_results.linking_coefficients);
  console.log('Conversion table:', result.results.equating_results.conversion_table);
}
```

## Configuration

### YAML-Based Configuration

BayesLatentLab supports YAML configuration files for reproducible analyses:

```yaml
model:
  model_type: irt
  model_family: irt_2pl
  link: logit
  dimensions: 1
  multilevel: none
  priors:
    theta_sd: 1.0
    discrimination_mean: 0.0
    discrimination_sd: 1.0
    difficulty_mean: 0.0
    difficulty_sd: 2.0

estimation:
  sampler: nuts
  chains: 4
  iterations: 2000
  warmup: 1000
  thin: 1
  seed: 12345
  adapt_delta: 0.95
  max_treedepth: 12
  parallel_chains: true
```

Load and use configuration:

```typescript
import { loadConfigFromYAML } from 'bayes-latent-lab';
import * as fs from 'fs';

const yamlContent = fs.readFileSync('config.yaml', 'utf-8');
const config = loadConfigFromYAML(yamlContent);

const result = await runAnalysis({ responses, items, config });
```

## Project Structure

```
BayesLatentLab/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── data/            # Data validation and preprocessing
│   ├── models/          # Model specification and configuration
│   ├── stan/            # Stan model templates
│   ├── diagnostics/     # Fit statistics and diagnostics
│   ├── dif/             # DIF detection methods
│   ├── equating/        # Test equating and linking
│   ├── reports/         # Report generation (future)
│   ├── workflow.ts      # Main analysis orchestration
│   └── index.ts         # Main entry point
├── docs/                # Documentation
├── examples/            # Example analyses
├── tests/               # Test suites
├── package.json
├── tsconfig.json
└── README.md
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Model Specifications](docs/MODELS.md)
- [API Reference](docs/API.md)
- [Examples](docs/EXAMPLES.md)

## Development

### Run Tests

```bash
npm test
```

### Lint Code

```bash
npm run lint
```

### Build

```bash
npm run build
```

## Roadmap

### Version 0.1 (Current)
- ✅ Core IRT models (Rasch, 1PL, 2PL, 3PL, GRM, GPCM)
- ✅ Data validation and preprocessing
- ✅ Stan model template generation
- ✅ DIF detection framework
- ✅ Equating/linking framework
- ✅ Fit diagnostics (Infit/Outfit, Zh, S-X²)

### Version 0.2 (Planned)
- CFA/EFA implementations
- Nominal response models (NRM)
- Exploratory MIRT with shrinkage
- Posterior predictive checks

### Version 0.3 (Planned)
- Multilevel CFA
- Multilevel MIRT
- Random DIF models

### Version 0.4 (Planned)
- Local dependence resolution (testlet models)
- Dimension selection automation
- Complete reporting system

## References

Key methodological references:

1. **DIF Detection**:
   - Cohen, A. S., Kim, S.-H., & Wollack, J. A. (1996). An investigation of the likelihood ratio test for detection of differential item functioning. *Applied Psychological Measurement, 20*(1), 15–26.

2. **Person Fit**:
   - Drasgow, F., Levine, M. V., & Williams, E. A. (1985). Appropriateness measurement with polychotomous item response models and standardized indices. *British Journal of Mathematical and Statistical Psychology, 38*(1), 67–86.

3. **Item Fit**:
   - Orlando, M., & Thissen, D. (2000). Likelihood-based item-fit indices for dichotomous item response theory models. *Applied Psychological Measurement, 24*(1), 50–64.

4. **Test Equating**:
   - Stocking, M. L., & Lord, F. M. (1983). Developing a common metric in item response theory. *Applied Psychological Measurement, 7*(2), 201–210.
   - König, C., et al. (2021). The Benefits of Fixed Item Parameter Calibration. *Educational Measurement: Issues and Practice*.

5. **Model Comparison**:
   - Vehtari, A., Gelman, A., & Gabry, J. (2017). Practical Bayesian model evaluation using leave-one-out cross-validation and WAIC. *Statistics and Computing, 27*(5), 1413–1432.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Citation

If you use BayesLatentLab in your research, please cite:

```bibtex
@software{bayeslatentlab2024,
  title = {BayesLatentLab: Bayesian Multilevel IRT/CFA/EFA Analysis Tool},
  author = {BayesLatentLab Contributors},
  year = {2024},
  url = {https://github.com/seonghobae/BayesLatentLab},
  version = {0.1.0}
}
```

## Contact

For questions, issues, or suggestions, please open an issue on GitHub or contact the maintainers.

---

**Note**: This is version 0.1.0, implementing the foundational structure. Full Stan integration and advanced features are under active development.
