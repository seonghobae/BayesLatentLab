/**
 * Simple 2PL IRT Analysis Example
 */

import { runAnalysis, createDefaultConfig, ResponseData, ItemMetadata } from '../src';

async function main() {
  console.log('BayesLatentLab - Simple 2PL Example\n');

  // Generate sample data
  const persons = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
  const items = ['item1', 'item2', 'item3', 'item4', 'item5'];

  const responses: ResponseData[] = [];
  persons.forEach(person => {
    items.forEach(item => {
      // Simulate response based on simple probability
      responses.push({
        person_id: person,
        item_id: item,
        response: Math.random() > 0.4 ? 1 : 0
      });
    });
  });

  const itemMetadata: ItemMetadata[] = items.map(item => ({
    item_id: item,
    item_type: 'binary'
  }));

  // Configure analysis
  const config = createDefaultConfig();
  config.model.model_family = 'irt_2pl';
  config.estimation.chains = 4;
  config.estimation.iterations = 1000;
  config.estimation.warmup = 500;

  console.log('Configuration:');
  console.log('  Model:', config.model.model_family);
  console.log('  Chains:', config.estimation.chains);
  console.log('  Iterations:', config.estimation.iterations);
  console.log('\n');

  // Run analysis
  console.log('Running analysis...\n');
  const result = await runAnalysis({
    responses,
    items: itemMetadata,
    config
  });

  // Display results
  if (result.success) {
    console.log('✓ Analysis completed successfully!\n');
    
    if (result.results) {
      console.log('Model ID:', result.results.model_id);
      console.log('Timestamp:', result.results.timestamp);
      console.log('Converged:', result.results.convergence.converged);
      console.log('Divergences:', result.results.convergence.divergences);
    }
    
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log('  -', w));
    }
  } else {
    console.log('✗ Analysis failed\n');
    console.log('Errors:');
    result.errors.forEach(e => console.log('  -', e));
  }
}

main().catch(console.error);
