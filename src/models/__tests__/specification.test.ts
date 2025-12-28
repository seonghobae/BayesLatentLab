/**
 * Tests for model specification
 */

import {
  createDefaultConfig,
  loadConfigFromYAML,
  saveConfigToYAML,
  exampleConfigs
} from '../specification';

describe('Model Specification', () => {
  describe('createDefaultConfig', () => {
    it('should create valid default configuration', () => {
      const config = createDefaultConfig();
      
      expect(config.model).toBeDefined();
      expect(config.estimation).toBeDefined();
      expect(config.model.model_family).toBe('irt_2pl');
      expect(config.estimation.chains).toBe(4);
    });
  });

  describe('YAML serialization', () => {
    it('should serialize and deserialize config', () => {
      const config = createDefaultConfig();
      const yaml = saveConfigToYAML(config);
      const restored = loadConfigFromYAML(yaml);
      
      expect(restored.model.model_family).toBe(config.model.model_family);
      expect(restored.estimation.chains).toBe(config.estimation.chains);
    });

    it('should handle custom configuration', () => {
      const yamlStr = `
model:
  model_type: irt
  model_family: rasch_1pl
  link: logit
  dimensions: 1
  multilevel: none

estimation:
  sampler: nuts
  chains: 2
  iterations: 1000
  warmup: 500
  thin: 1
  seed: 42
`;
      
      const config = loadConfigFromYAML(yamlStr);
      expect(config.model.model_family).toBe('rasch_1pl');
      expect(config.estimation.chains).toBe(2);
      expect(config.estimation.iterations).toBe(1000);
    });
  });

  describe('example configs', () => {
    it('should provide simple 2PL config', () => {
      const config = exampleConfigs.simple2PL();
      expect(config.model.model_family).toBe('irt_2pl');
    });

    it('should provide Rasch config', () => {
      const config = exampleConfigs.rasch();
      expect(config.model.model_family).toBe('rasch_1pl');
    });

    it('should provide GRM config', () => {
      const config = exampleConfigs.grm();
      expect(config.model.model_family).toBe('grm');
      expect(config.estimation.adapt_delta).toBe(0.99);
    });

    it('should provide multilevel config', () => {
      const config = exampleConfigs.multilevel2PL();
      expect(config.model.multilevel).toBe('random_intercept');
      expect(config.estimation.adapt_delta).toBe(0.99);
    });

    it('should provide DIF config', () => {
      const config = exampleConfigs.withDIF();
      expect(config.dif).toBeDefined();
      expect(config.dif?.method).toBe('irt_lr');
    });

    it('should provide equating config', () => {
      const config = exampleConfigs.withEquating();
      expect(config.equating).toBeDefined();
      expect(config.equating?.method).toBe('separate_linking');
    });
  });
});
