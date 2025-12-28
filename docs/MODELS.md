# Model Specifications

## IRT Model Families

### Binary Item Models

#### Rasch Model (1PL with Fixed Discrimination)

**Model**: P(Y_ij = 1 | θ_j) = logit^(-1)(θ_j - b_i)

- Discrimination fixed at a = 1
- Only item difficulty (b_i) is estimated per item
- Assumes equal discrimination across items

**Use cases**: When items are designed to have equal discrimination

**Configuration**:
```yaml
model:
  model_family: rasch_1pl
```

#### 1PL Model (Common Slope)

**Model**: P(Y_ij = 1 | θ_j) = logit^(-1)(a(θ_j - b_i))

- Common discrimination (a) estimated from data
- Item difficulty (b_i) varies by item
- More flexible than Rasch

**Use cases**: Items may have common discrimination that differs from 1

**Configuration**:
```yaml
model:
  model_family: irt_1pl_common_slope
```

#### 2PL Model

**Model**: P(Y_ij = 1 | θ_j) = logit^(-1)(a_i(θ_j - b_i))

- Item-specific discrimination (a_i)
- Item-specific difficulty (b_i)
- Most common IRT model

**Configuration**:
```yaml
model:
  model_family: irt_2pl
```

#### 3PL Model

**Model**: P(Y_ij = 1 | θ_j) = c_i + (1 - c_i) × logit^(-1)(a_i(θ_j - b_i))

- Adds lower asymptote (guessing parameter c_i)
- Useful for multiple-choice items

**Configuration**:
```yaml
model:
  model_family: irt_3pl
  priors:
    guessing_alpha: 5.0
    guessing_beta: 17.0
```

### Ordinal Item Models

#### Graded Response Model (GRM)

**Model**: P(Y_ij ≥ k | θ_j) = logit^(-1)(a_i θ_j - τ_ik)

- For ordinal responses (e.g., Likert scales)
- Ordered thresholds τ_i1 < τ_i2 < ... < τ_i(K-1)

**Configuration**:
```yaml
model:
  model_family: grm
```

**Item metadata**:
```typescript
{
  item_id: 'item1',
  item_type: 'ordinal',
  categories: [1, 2, 3, 4, 5]
}
```

#### Generalized Partial Credit Model (GPCM)

**Model**: Category-specific step difficulties

**Configuration**:
```yaml
model:
  model_family: gpcm
```

## Prior Specifications

### Default Priors

```yaml
priors:
  theta_mean: 0.0
  theta_sd: 1.0
  discrimination_mean: 0.0  # lognormal(0, 1) → median = 1
  discrimination_sd: 1.0
  difficulty_mean: 0.0
  difficulty_sd: 2.0
  guessing_alpha: 5.0       # beta(5, 17) → mean ≈ 0.23
  guessing_beta: 17.0
```

### Custom Priors

```yaml
priors:
  theta_sd: 1.5              # Allow more variance in abilities
  discrimination_sd: 0.5     # More concentrated around median
  difficulty_sd: 1.0         # Tighter prior on difficulties
```

## Multilevel Extensions

### Random Intercept Model

```yaml
model:
  model_type: multilevel_irt
  multilevel: random_intercept
```

**Model**: θ_j = θ_group[j] + θ_within[j]

### Random Loading Model

```yaml
model:
  multilevel: random_loading
```

**Model**: Factor loadings vary by group

## Link Functions

### Logit (Default)

```yaml
model:
  link: logit
```

More common, better performance with sparse data.

### Probit

```yaml
model:
  link: probit
```

Theoretical advantages in some contexts.

## Estimation Settings

### NUTS Sampler (Recommended)

```yaml
estimation:
  sampler: nuts
  chains: 4
  iterations: 2000
  warmup: 1000
  thin: 1
  seed: 12345
  adapt_delta: 0.95       # Increase for complex models
  max_treedepth: 12       # Increase if hitting limit
  parallel_chains: true
```

### Guidelines

- **Simple models** (Rasch, 1PL, 2PL): adapt_delta = 0.95
- **Complex models** (3PL, multilevel): adapt_delta = 0.99
- **Ordinal models**: adapt_delta = 0.99, increase iterations

## Model Selection

### Information Criteria

- **LOO-CV** (Leave-One-Out Cross-Validation): Preferred
- **WAIC**: Alternative, similar to LOO

### Dimension Selection

```yaml
dimension_selection:
  method: grid_search
  min_dimensions: 1
  max_dimensions: 5
  comparison_metric: loo
```

## Complete Example Configurations

### Simple 2PL Analysis

```yaml
model:
  model_type: irt
  model_family: irt_2pl
  link: logit
  dimensions: 1
  multilevel: none

estimation:
  sampler: nuts
  chains: 4
  iterations: 2000
  warmup: 1000
  seed: 12345
```

### Ordinal GRM with Custom Priors

```yaml
model:
  model_type: irt
  model_family: grm
  link: logit
  dimensions: 1
  multilevel: none
  priors:
    theta_sd: 1.0
    discrimination_mean: 0.0
    discrimination_sd: 0.5

estimation:
  sampler: nuts
  chains: 4
  iterations: 3000
  warmup: 1500
  adapt_delta: 0.99
  seed: 12345
```

### Multilevel 2PL

```yaml
model:
  model_type: multilevel_irt
  model_family: irt_2pl
  link: logit
  dimensions: 1
  multilevel: random_intercept

estimation:
  sampler: nuts
  chains: 4
  iterations: 3000
  warmup: 1500
  adapt_delta: 0.99
  max_treedepth: 14
  seed: 12345
```
