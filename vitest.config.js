import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Habilita funções globais, como `describe` e `it`
    environment: 'node', // Usa o ambiente Node.js
    coverage: {
      provider: 'istanbul', // Gera relatórios de cobertura
      reportsDirectory: './coverage', // Define o diretório de saída
    },
  },
});
