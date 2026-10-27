import { describe, it, expect } from 'vitest';
import { HeuristicRecipeParserAdapter } from '../infrastructure/parsers/heuristic-recipe-parser.adapter.ts';

describe('HeuristicRecipeParserAdapter', () => {
  const parser = new HeuristicRecipeParserAdapter();

  it('parses bilingual Spanish caption into a structured draft with normalized units', async () => {
    const draft = await parser.parse(
      [
        'Ramen de Miso con Pollo',
        'Para 4 personas',
        'Tiempo de preparación: 30 minutos',
        'Ingredientes:',
        '2 tazas de fideos de soba',
        '1 cucharada de aceite de ajonjolí',
        '500 gramos de pescado',
        '1 diente de ajo',
        '',
        'Preparación:',
        'Calentar el caldo de miso.',
        'Cocinar los fideos.',
        'Servir el pollo.',
      ].join('\n')
    );

    expect(draft.parser_used).toBe('heuristic');
    expect(draft.title).toBe('Ramen de Miso con Pollo');
    expect(draft.servings).toBe(4);
    expect(draft.prep_time_minutes).toBe(30);
    expect(draft.ingredients).toEqual([
      { name: 'fideos de soba', amount: 2, unit: 'cup' },
      { name: 'aceite de ajonjolí', amount: 1, unit: 'tbsp' },
      { name: 'pescado', amount: 500, unit: 'grams' },
      { name: 'ajo', amount: 1, unit: 'clove' },
    ]);
    expect(draft.steps).toHaveLength(3);
    expect(draft.steps?.map(s => s.step_number)).toEqual([1, 2, 3]);
  });

  it('parses English caption and applies bilingual unit synonym normalization', async () => {
    const draft = await parser.parse(
      [
        'Creamy Garlic Pasta',
        'Ingredients',
        '2 tbsp butter',
        '1 g flour',
        '1 chorrito of milk',
        '',
        'Steps',
        'Melt butter in pan.',
        'Add flour and milk.',
      ].join('\n')
    );

    expect(draft.parser_used).toBe('heuristic');
    expect(draft.ingredients).toEqual([
      { name: 'butter', amount: 2, unit: 'tbsp' },
      { name: 'flour', amount: 1, unit: 'grams' },
      { name: 'milk', amount: 1, unit: 'splash' },
    ]);
  });

  it('detects equipment entries from the equipment section', async () => {
    const draft = await parser.parse(
      [
        'Chicken Curry',
        'Equipamiento',
        'Batidora de vaso',
        'Ingredientes:',
        '1 pechuga de pollo',
        'Preparación:',
        'Mix and cook.',
      ].join('\n')
    );

    expect(draft.equipment).toEqual([{ name: 'Batidora de vaso' }]);
  });

  it('returns a heuristic draft with defaults when text has no structure beyond a title', async () => {
    const draft = await parser.parse('Solo un texto sin estructura');

    expect(draft.parser_used).toBe('heuristic');
    expect(draft.title).toBe('Solo un texto sin estructura');
    expect(draft.servings).toBe(2);
    expect(draft.prep_time_minutes).toBe(20);
  });
});
