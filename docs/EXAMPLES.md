# Example Analyses

## Example 1: Basic 2PL IRT Analysis

```typescript
import { runAnalysis, createDefaultConfig } from 'bayes-latent-lab';

// Simulate some response data
const responses = [];
const persons = ['p1', 'p2', 'p3', 'p4', 'p5'];
const items = ['item1', 'item2', 'item3', 'item4', 'item5'];

persons.forEach(person => {
  items.forEach(item => {
    responses.push({
      person_id: person,
      item_id: item,
      response: Math.random() > 0.5 ? 1 : 0
    });
  });
});

// Define item metadata
const itemMetadata = items.map(item => ({
  item_id: item,
  item_type: 'binary' as const
}));

// Configure analysis
const config = createDefaultConfig();
config.model.model_family = 'irt_2pl';

// Run analysis
const result = await runAnalysis({
  responses,
  items: itemMetadata,
  config
});

console.log('Success:', result.success);
console.log('Warnings:', result.warnings);
```

## Example 2: Graded Response Model for Likert Data

```typescript
import { exampleConfigs } from 'bayes-latent-lab';

// 5-point Likert scale data
const likertResponses = [
  { person_id: 'p1', item_id: 'q1', response: 4 },
  { person_id: 'p1', item_id: 'q2', response: 5 },
  { person_id: 'p1', item_id: 'q3', response: 3 },
  { person_id: 'p2', item_id: 'q1', response: 2 },
  { person_id: 'p2', item_id: 'q2', response: 3 },
  { person_id: 'p2', item_id: 'q3', response: 2 },
  // ... more responses
];

const likertItems = [
  {
    item_id: 'q1',
    item_type: 'ordinal' as const,
    categories: [1, 2, 3, 4, 5],
    category_labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
  },
  {
    item_id: 'q2',
    item_type: 'ordinal' as const,
    categories: [1, 2, 3, 4, 5]
  },
  {
    item_id: 'q3',
    item_type: 'ordinal' as const,
    categories: [1, 2, 3, 4, 5]
  }
];

const config = exampleConfigs.grm();

const result = await runAnalysis({
  responses: likertResponses,
  items: likertItems,
  config
});
```

## Example 3: DIF Analysis by Gender

```typescript
import { exampleConfigs } from 'bayes-latent-lab';

// Responses with group membership
const responses = [
  { person_id: 'p1', item_id: 'item1', response: 1, group_id: 'male' },
  { person_id: 'p1', item_id: 'item2', response: 0, group_id: 'male' },
  { person_id: 'p2', item_id: 'item1', response: 1, group_id: 'female' },
  { person_id: 'p2', item_id: 'item2', response: 1, group_id: 'female' },
  // ... more responses
];

const items = [
  { item_id: 'item1', item_type: 'binary' as const },
  { item_id: 'item2', item_type: 'binary' as const, anchor_item: true },
  { item_id: 'item3', item_type: 'binary' as const, anchor_item: true },
  // ... more items
];

const config = exampleConfigs.withDIF();
config.dif = {
  method: 'irt_lr',
  reference_group: 'male',
  focal_groups: ['female'],
  anchor_items: ['item2', 'item3'],
  test_parameters: ['discrimination', 'difficulty'],
  multiple_comparison_correction: 'holm',
  effect_size: true
};

const result = await runAnalysis({ responses, items, config });

if (result.success && result.results?.dif_results) {
  console.log('DIF Analysis Results:');
  console.log('Flagged items:', result.results.dif_results.flagged_items);
  
  Object.entries(result.results.dif_results.item_results).forEach(([itemId, itemResult]) => {
    console.log(`${itemId}: p=${itemResult.p_value.toFixed(4)}, flagged=${itemResult.flagged}`);
    if (itemResult.effect_size) {
      console.log(`  Effect size: ${itemResult.effect_size.toFixed(3)}`);
    }
  });
}
```

## Example 4: Test Equating with Anchor Items

```typescript
import { exampleConfigs } from 'bayes-latent-lab';

// Two forms with common anchor items
const responses = [
  // Form A responses
  { person_id: 'pa1', item_id: 'item1', response: 1, form_id: 'form_a' },
  { person_id: 'pa1', item_id: 'item2', response: 0, form_id: 'form_a' },
  { person_id: 'pa1', item_id: 'anchor1', response: 1, form_id: 'form_a' },
  // Form B responses
  { person_id: 'pb1', item_id: 'item3', response: 1, form_id: 'form_b' },
  { person_id: 'pb1', item_id: 'item4', response: 1, form_id: 'form_b' },
  { person_id: 'pb1', item_id: 'anchor1', response: 0, form_id: 'form_b' },
  // ... more responses
];

const items = [
  { item_id: 'item1', item_type: 'binary' as const },
  { item_id: 'item2', item_type: 'binary' as const },
  { item_id: 'item3', item_type: 'binary' as const },
  { item_id: 'item4', item_type: 'binary' as const },
  { item_id: 'anchor1', item_type: 'binary' as const, anchor_item: true },
  { item_id: 'anchor2', item_type: 'binary' as const, anchor_item: true },
];

const config = exampleConfigs.withEquating();
config.equating = {
  method: 'separate_linking',
  linking_method: 'stocking_lord',
  base_form: 'form_a',
  target_forms: ['form_b'],
  anchor_items: ['anchor1', 'anchor2'],
  compute_se: true,
  sensitivity_analysis: true
};

const result = await runAnalysis({ responses, items, config });

if (result.success && result.results?.equating_results) {
  console.log('Equating Results:');
  console.log('Linking coefficients:');
  console.log('  Slope (A):', result.results.equating_results.linking_coefficients.slope);
  console.log('  Intercept (B):', result.results.equating_results.linking_coefficients.intercept);
  
  console.log('\nConversion table (sample):');
  result.results.equating_results.conversion_table.slice(0, 10).forEach(entry => {
    console.log(`  Raw: ${entry.raw_score}, θ: ${entry.theta.toFixed(2)}, Equated: ${entry.equated_score}`);
  });
  
  if (result.results.equating_results.anchor_diagnostics) {
    console.log('\nAnchor diagnostics:');
    console.log('  Recommended anchors:', 
      result.results.equating_results.anchor_diagnostics.recommended_anchors);
  }
}
```

## Example 5: YAML Configuration

```typescript
import { loadConfigFromYAML } from 'bayes-latent-lab';
import * as fs from 'fs';

// Create a YAML configuration file
const yamlConfig = `
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
  seed: 42
  adapt_delta: 0.95
  max_treedepth: 12
  parallel_chains: true

dif:
  method: irt_lr
  reference_group: control
  focal_groups: [treatment]
  anchor_items: [item1, item2, item3]
  test_parameters: [discrimination, difficulty]
  multiple_comparison_correction: holm
  effect_size: true
`;

// Save to file
fs.writeFileSync('analysis_config.yaml', yamlConfig);

// Load configuration
const config = loadConfigFromYAML(yamlConfig);

// Use in analysis
const result = await runAnalysis({ responses, items, config });
```

## Example 6: Data Validation and Quality Checks

```typescript
import { 
  validateResponseData, 
  validateItemMetadata,
  generateDataSummary,
  checkDataQuality 
} from 'bayes-latent-lab';

// Validate responses
const responseValidation = validateResponseData(responses);
if (!responseValidation.valid) {
  console.error('Response validation errors:', responseValidation.errors);
  responseValidation.warnings.forEach(w => console.warn('Warning:', w));
}

// Validate items
const itemValidation = validateItemMetadata(items);
if (!itemValidation.valid) {
  console.error('Item validation errors:', itemValidation.errors);
}

// Generate summary
const summary = generateDataSummary(responses, items);
console.log('Data Summary:');
console.log('  Persons:', summary.n_persons);
console.log('  Items:', summary.n_items);
console.log('  Responses:', summary.n_responses);
console.log('  Missing rate:', (summary.missing_rate * 100).toFixed(1) + '%');

// Check quality
const qualityCheck = checkDataQuality(summary);
qualityCheck.warnings.forEach(w => console.warn('Quality warning:', w));

// Examine item summaries
summary.item_summaries.forEach(item => {
  console.log(`\nItem ${item.item_id}:`);
  console.log('  Type:', item.item_type);
  console.log('  Responses:', item.n_responses);
  console.log('  Missing rate:', (item.missing_rate * 100).toFixed(1) + '%');
  
  if (item.mean !== undefined) {
    console.log('  Mean:', item.mean.toFixed(3));
    console.log('  SD:', item.sd?.toFixed(3));
  }
  
  if (item.category_frequencies) {
    console.log('  Category frequencies:', item.category_frequencies);
  }
  
  if (item.sparse_categories && item.sparse_categories.length > 0) {
    console.log('  ⚠️  Sparse categories:', item.sparse_categories);
  }
});
```

## Example 7: Accessing Stan Model Code

```typescript
import { generateStanModel, getDefaultPriors } from 'bayes-latent-lab';

const config = {
  model_type: 'irt' as const,
  model_family: 'irt_2pl' as const,
  link: 'logit' as const,
  dimensions: 1,
  multilevel: 'none' as const
};

// Generate Stan code
const stanCode = generateStanModel(config);
console.log('Generated Stan Model:');
console.log(stanCode);

// Get default priors
const priors = getDefaultPriors('irt_2pl');
console.log('\nDefault priors:', priors);
```

## Running the Examples

Save any of these examples to a `.ts` file and run with:

```bash
npm run build
node dist/your-example.js
```

Or use ts-node for development:

```bash
npx ts-node examples/your-example.ts
```
