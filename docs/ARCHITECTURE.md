# Architecture Overview

## System Design

BayesLatentLab follows a modular architecture designed for extensibility and maintainability.

### High-Level Architecture

```
┌─────────────┐
│   User API  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Workflow   │  ◄── Main orchestration layer
│ Orchestrator│
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│   Data   │   │  Models  │   │   Stan   │   │   DIF    │   │ Equating │
│ Validation│   │   Spec   │   │Templates │   │ Analysis │   │ Linking  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  CmdStan    │
                              │  Inference  │
                              └─────────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │ Diagnostics │
                              │  & Reports  │
                              └─────────────┘
```

## Module Descriptions

### 1. Data Validation Module
Validates input data, checks quality, generates summaries.

### 2. Model Specification Module
YAML-based declarative model configuration.

### 3. Stan Template Library
Generates Stan code for various IRT model families.

### 4. DIF Analysis Module
Multiple methods for detecting differential item functioning.

### 5. Equating & Linking Module
Test equating with various linking methods.

### 6. Diagnostics Module
Item fit, person fit, and local dependence diagnostics.

### 7. Workflow Orchestrator
Coordinates the complete analysis pipeline.

See full documentation for detailed module descriptions.
