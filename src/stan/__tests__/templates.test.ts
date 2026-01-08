/**
 * Tests for Stan template generation
 */

import { generateStanModel, getDefaultPriors } from '../templates.js';
import type { ModelSpecification } from '../../types/index.js';

describe('Stan Templates', () => {
  describe('generateStanModel', () => {
    it('should generate Rasch model code', () => {
      const spec: ModelSpecification = {
        model_type: 'irt',
        model_family: 'rasch_1pl',
        link: 'logit',
        dimensions: 1,
        multilevel: 'none'
      };

      const code = generateStanModel(spec);
      
      expect(code).toContain('data {');
      expect(code).toContain('parameters {');
      expect(code).toContain('model {');
      expect(code).toContain('difficulty');
      expect(code).toContain('theta');
      // Rasch model has fixed discrimination (not a parameter)
      expect(code).not.toContain('vector<lower=0>[I] discrimination');
    });

    it('should generate 2PL model code', () => {
      const spec: ModelSpecification = {
        model_type: 'irt',
        model_family: 'irt_2pl',
        link: 'logit',
        dimensions: 1,
        multilevel: 'none'
      };

      const code = generateStanModel(spec);
      
      expect(code).toContain('discrimination');
      expect(code).toContain('difficulty');
      expect(code).toContain('vector<lower=0>[I] discrimination');
    });

    it('should generate 3PL model code', () => {
      const spec: ModelSpecification = {
        model_type: 'irt',
        model_family: 'irt_3pl',
        link: 'logit',
        dimensions: 1,
        multilevel: 'none'
      };

      const code = generateStanModel(spec);
      
      expect(code).toContain('discrimination');
      expect(code).toContain('difficulty');
      expect(code).toContain('guessing');
      expect(code).toContain('prior_guessing_alpha');
    });

    it('should generate GRM model code', () => {
      const spec: ModelSpecification = {
        model_type: 'irt',
        model_family: 'grm',
        link: 'logit',
        dimensions: 1,
        multilevel: 'none'
      };

      const code = generateStanModel(spec);
      
      expect(code).toContain('thresholds');
      expect(code).toContain('ordered[K-1]');
      expect(code).toContain('ordered_logistic');
    });

    it('should generate GPCM model code', () => {
      const spec: ModelSpecification = {
        model_type: 'irt',
        model_family: 'gpcm',
        link: 'logit',
        dimensions: 1,
        multilevel: 'none'
      };

      const code = generateStanModel(spec);
      
      expect(code).toContain('step_difficulty');
      expect(code).toContain('categorical_logit');
    });
  });

  describe('getDefaultPriors', () => {
    it('should return priors for Rasch model', () => {
      const priors = getDefaultPriors('rasch_1pl');
      
      expect(priors).toHaveProperty('prior_theta_sd');
      expect(priors).toHaveProperty('prior_difficulty_mean');
      expect(priors).toHaveProperty('prior_difficulty_sd');
      expect(priors).not.toHaveProperty('prior_discrimination_mean');
    });

    it('should return priors for 2PL model', () => {
      const priors = getDefaultPriors('irt_2pl');
      
      expect(priors).toHaveProperty('prior_discrimination_mean');
      expect(priors).toHaveProperty('prior_discrimination_sd');
      expect(priors).toHaveProperty('prior_difficulty_mean');
      expect(priors).toHaveProperty('prior_difficulty_sd');
    });

    it('should return priors for 3PL model', () => {
      const priors = getDefaultPriors('irt_3pl');
      
      expect(priors).toHaveProperty('prior_guessing_alpha');
      expect(priors).toHaveProperty('prior_guessing_beta');
    });
  });
});
