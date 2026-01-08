# API Reference

## Core Functions

### `runAnalysis(input: AnalysisInput): Promise<AnalysisOutput>`

Main entry point for running a complete analysis workflow.

**Parameters:**
- `input.responses`: Array of response data
- `input.items`: Array of item metadata
- `input.config`: Analysis configuration

**Returns:** Promise resolving to analysis results

**Example:**

```typescript
const result = await runAnalysis({ responses, items, config });
```

## Configuration Functions

### `createDefaultConfig(): AnalysisConfiguration`

Creates a default configuration for 2PL IRT analysis.

**Returns:** Default analysis configuration

### `loadConfigFromYAML(yamlString: string): AnalysisConfiguration`

Load configuration from YAML string.

**Parameters:**
- `yamlString`: YAML configuration string

**Returns:** Parsed analysis configuration

### `saveConfigToYAML(config: AnalysisConfiguration): string`

Save configuration to YAML string.

**Parameters:**
- `config`: Analysis configuration

**Returns:** YAML string

### Example Configurations

```typescript
import { exampleConfigs } from 'bayes-latent-lab';

// Simple 2PL
const config1 = exampleConfigs.simple2PL();

// Rasch model
const config2 = exampleConfigs.rasch();

// GRM for ordinal data
const config3 = exampleConfigs.grm();

// Multilevel 2PL
const config4 = exampleConfigs.multilevel2PL();

// With DIF analysis
const config5 = exampleConfigs.withDIF();

// With equating
const config6 = exampleConfigs.withEquating();
```

## Data Validation Functions

### `validateResponseData(data: unknown[]): ValidationResult`

Validate response data format and content.

**Parameters:**
- `data`: Array of response objects

**Returns:** Validation result with errors and warnings

### `validateItemMetadata(metadata: unknown[]): ValidationResult`

Validate item metadata format and content.

**Parameters:**
- `metadata`: Array of item metadata objects

**Returns:** Validation result with errors and warnings

### `generateDataSummary(responses: ResponseData[], items: ItemMetadata[]): DataSummary`

Generate summary statistics for the dataset.

**Parameters:**
- `responses`: Array of response data
- `items`: Array of item metadata

**Returns:** Data summary object

### `checkDataQuality(summary: DataSummary): ValidationResult`

Check data quality and identify potential issues.

**Parameters:**
- `summary`: Data summary object

**Returns:** Validation result with quality warnings

## Stan Template Functions

### `generateStanModel(spec: ModelSpecification): string`

Generate Stan model code from specification.

**Parameters:**
- `spec`: Model specification

**Returns:** Stan model code as string

### `getDefaultPriors(family: IRTModelFamily): { [key: string]: number }`

Get default prior specifications for a model family.

**Parameters:**
- `family`: IRT model family name

**Returns:** Dictionary of prior parameters

## DIF Analysis Functions

### `runDIFAnalysis(config: DIFConfiguration, ...): Promise<DIFResults>`

Run differential item functioning analysis.

**Parameters:**
- `config`: DIF configuration
- Additional parameters for item parameters and group data

**Returns:** Promise resolving to DIF results

### `purifyAnchors(...): Promise<string[]>`

Perform anchor purification to identify stable anchor items.

**Returns:** Promise resolving to list of purified anchor items

## Equating Functions

### `runEquating(config: EquatingConfiguration, ...): Promise<EquatingResults>`

Run test equating and linking analysis.

**Parameters:**
- `config`: Equating configuration
- Form data

**Returns:** Promise resolving to equating results

## Diagnostics Functions

### `computeItemFit(itemResponses: ItemResponse[], method): { [itemId: string]: ItemFitStatistics }`

Compute item fit statistics.

**Parameters:**
- `itemResponses`: Array of item response data
- `method`: Fit method ('infit_outfit' or 's_x2')

**Returns:** Dictionary of item fit statistics

### `computePersonFit(patterns: ResponsePattern[], method): { [personId: string]: PersonFitStatistics }`

Compute person fit statistics.

**Parameters:**
- `patterns`: Array of response patterns
- `method`: Fit method ('zh')

**Returns:** Dictionary of person fit statistics

### `computeLocalDependence(itemResponses, residuals): { [itemPair: string]: number }`

Compute local dependence (Q3) statistics.

**Parameters:**
- `itemResponses`: Item response data
- `residuals`: Residuals from model

**Returns:** Dictionary of Q3 values for item pairs

### `identifyLDPairs(q3Matrix, threshold): [string, string][]`

Identify item pairs with high local dependence.

**Parameters:**
- `q3Matrix`: Q3 statistics matrix
- `threshold`: Threshold for flagging (default: 0.2)

**Returns:** Array of flagged item pairs

### `suggestTestlets(ldPairs, minTestletSize): { [testletId: string]: string[] }`

Suggest testlet groupings based on local dependence.

**Parameters:**
- `ldPairs`: Array of locally dependent item pairs
- `minTestletSize`: Minimum testlet size (default: 2)

**Returns:** Dictionary of suggested testlets

## Utility Functions

### `calculateICC(theta, discrimination, difficulty, guessing?, upperAsymptote?): number`

Calculate item characteristic curve value.

### `calculateTCC(theta, items): number`

Calculate test characteristic curve value.

### `calculateItemInformation(theta, discrimination, difficulty): number`

Calculate item information at a theta value.

### `calculateTestInformation(theta, items): number`

Calculate test information at a theta value.

### `calculateSEM(theta, items): number`

Calculate standard error of measurement at a theta value.

### `rawScoreToTheta(rawScore, items, ...): number`

Convert raw score to theta estimate.

### `calculateReliability(thetas, items): number`

Calculate test reliability coefficient.

## Type Definitions

See `src/types/index.ts` for complete type definitions.

### Key Types

- `ItemType`: 'binary' | 'ordinal' | 'nominal' | 'continuous'
- `ModelType`: 'irt' | 'mirt' | 'cfa' | 'efa' | 'emirt' | 'multilevel_irt' | 'multilevel_cfa'
- `IRTModelFamily`: 'rasch_1pl' | 'irt_1pl_common_slope' | 'irt_2pl' | 'irt_3pl' | 'irt_4pl' | 'irt_5pl' | 'grm' | 'gpcm' | 'pcm' | 'nrm'
- `DIFMethod`: 'irt_lr' | 'wald' | 'lord' | 'bayesian'
- `EquatingMethod`: 'concurrent' | 'separate_linking' | 'fipc'
- `LinkingMethod`: 'mean_mean' | 'mean_sigma' | 'stocking_lord' | 'haebara'

## Error Handling

All functions that can fail return structured errors:

```typescript
interface AnalysisOutput {
  success: boolean;
  results?: ModelResults;
  errors: string[];
  warnings: string[];
}
```

Check `success` before accessing `results`:

```typescript
const result = await runAnalysis(input);

if (result.success) {
  console.log(result.results);
} else {
  console.error('Errors:', result.errors);
}

// Always check warnings
if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

## Version Information

```typescript
import { VERSION, NAME } from 'bayes-latent-lab';

console.log(`${NAME} v${VERSION}`);
// Output: BayesLatentLab v0.1.0
```
