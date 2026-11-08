import { describe, it, expect } from 'vitest';
import {
  MenuDomainError,
  InvalidMenuPayloadError,
  UnknownMenuRecipeError,
  MenuNotFoundError,
} from '../domain/errors/menu-domain.error.ts';
import { RecipeDomainError } from '../domain/errors/recipe-domain.error.ts';
import { parseWeekStart, WEEK_START_ERROR_MESSAGE } from '../domain/value-objects/week-start.vo.ts';
import { MealEntry, MAX_MEAL_NOTE_LENGTH } from '../domain/value-objects/meal-entry.vo.ts';
import { WeeklyMenu } from '../domain/entities/weekly-menu.entity.ts';

describe('Menu domain errors', () => {
  it('all extend MenuDomainError, RecipeDomainError (AGENTS.md R4) and Error, keeping their own class', () => {
    const errors = [
      new InvalidMenuPayloadError('bad'),
      new UnknownMenuRecipeError('recipe-x'),
      new MenuNotFoundError('2026-11-09'),
    ];
    for (const e of errors) {
      expect(e).toBeInstanceOf(MenuDomainError);
      expect(e).toBeInstanceOf(RecipeDomainError);
      expect(e).toBeInstanceOf(Error);
    }
    expect(errors[1]).toBeInstanceOf(UnknownMenuRecipeError);
    expect(errors[1].name).toBe('UnknownMenuRecipeError');
    expect(errors[1].message).toContain('recipe-x');
    expect(errors[2].message).toContain('2026-11-09');
  });
});

describe('WeekStart', () => {
  it('accepts a Monday in YYYY-MM-DD format', () => {
    expect(parseWeekStart('2026-11-09')).toBe('2026-11-09');
  });

  it.each([
    ['2026-11-11', 'a Wednesday'],
    ['2026-11-08', 'a Sunday'],
    ['11/09/2026', 'a non-ISO format'],
    ['2026-02-30', 'an impossible date'],
    ['2026-1-5', 'missing zero padding'],
    ['', 'an empty string'],
  ])('rejects %s (%s)', value => {
    expect(() => parseWeekStart(value)).toThrow(InvalidMenuPayloadError);
    expect(() => parseWeekStart(value)).toThrow(WEEK_START_ERROR_MESSAGE);
  });

  it('rejects non-string values', () => {
    expect(() => parseWeekStart(20261109)).toThrow(InvalidMenuPayloadError);
  });
});

describe('MealEntry', () => {
  it('creates a valid entry and trims the note', () => {
    const entry = MealEntry.create({ day: 'monday', slot: 'lunch', recipe_id: 'r1', note: '  leftovers ' });
    expect(entry.day).toBe('monday');
    expect(entry.slot).toBe('lunch');
    expect(entry.note).toBe('leftovers');
  });

  it('turns an empty note into undefined', () => {
    expect(MealEntry.create({ day: 'monday', slot: 'lunch', recipe_id: 'r1', note: '   ' }).note).toBeUndefined();
  });

  it('rejects an unknown day, listing allowed values', () => {
    expect(() => MealEntry.create({ day: 'funday', slot: 'lunch', recipe_id: 'r1' })).toThrow(
      /Invalid meal day "funday".*monday, tuesday, wednesday, thursday, friday, saturday, sunday/
    );
  });

  it('rejects an unknown slot, listing allowed values', () => {
    expect(() => MealEntry.create({ day: 'monday', slot: 'brunch', recipe_id: 'r1' })).toThrow(
      /Invalid meal slot "brunch".*breakfast, lunch, snack, dinner/
    );
  });

  it('rejects an empty recipe_id', () => {
    expect(() => MealEntry.create({ day: 'monday', slot: 'lunch', recipe_id: ' ' })).toThrow(InvalidMenuPayloadError);
  });

  it('accepts a note of exactly the maximum length and rejects a longer one', () => {
    const max = 'a'.repeat(MAX_MEAL_NOTE_LENGTH);
    expect(MealEntry.create({ day: 'monday', slot: 'lunch', recipe_id: 'r1', note: max }).note).toBe(max);
    expect(() =>
      MealEntry.create({ day: 'monday', slot: 'lunch', recipe_id: 'r1', note: max + 'a' })
    ).toThrow(`Meal note cannot be longer than ${MAX_MEAL_NOTE_LENGTH} characters.`);
  });
});

describe('WeeklyMenu', () => {
  it('accepts flexible slots and stores exactly the given entries, sorted by day then slot', () => {
    const menu = WeeklyMenu.create({
      userId: 'u1',
      week_start: '2026-11-09',
      meals: [
        { day: 'wednesday', slot: 'breakfast', recipe_id: 'r3' },
        { day: 'monday', slot: 'dinner', recipe_id: 'r2' },
        { day: 'monday', slot: 'lunch', recipe_id: 'r1' },
      ],
    });
    expect(menu.meals.map(m => `${m.day}:${m.slot}`)).toEqual([
      'monday:lunch',
      'monday:dinner',
      'wednesday:breakfast',
    ]);
  });

  it('accepts an empty menu', () => {
    const menu = WeeklyMenu.create({ userId: 'u1', week_start: '2026-11-09', meals: [] });
    expect(menu.meals).toEqual([]);
  });

  it('rejects two entries for the same day and slot, naming them', () => {
    expect(() =>
      WeeklyMenu.create({
        userId: 'u1',
        week_start: '2026-11-09',
        meals: [
          { day: 'tuesday', slot: 'dinner', recipe_id: 'r1' },
          { day: 'tuesday', slot: 'dinner', recipe_id: 'r2' },
        ],
      })
    ).toThrow(/Duplicate meal for tuesday dinner/);
  });

  it('rejects a non-Monday week start', () => {
    expect(() => WeeklyMenu.create({ userId: 'u1', week_start: '2026-11-11', meals: [] })).toThrow(
      WEEK_START_ERROR_MESSAGE
    );
  });

  it('rejects a missing meals array', () => {
    expect(() =>
      WeeklyMenu.create({ userId: 'u1', week_start: '2026-11-09', meals: undefined as unknown as [] })
    ).toThrow(InvalidMenuPayloadError);
  });

  it('lists unique recipe IDs and applies title snapshots', () => {
    const menu = WeeklyMenu.create({
      userId: 'u1',
      week_start: '2026-11-09',
      meals: [
        { day: 'monday', slot: 'lunch', recipe_id: 'r1' },
        { day: 'tuesday', slot: 'lunch', recipe_id: 'r1' },
      ],
    });
    expect(menu.recipeIds()).toEqual(['r1']);
    const titled = menu.withRecipeTitles(new Map([['r1', 'Tortilla']]));
    expect(titled.meals.every(m => m.recipe_title === 'Tortilla')).toBe(true);
    expect(titled.toProps().meals[0]).toEqual({
      day: 'monday',
      slot: 'lunch',
      recipe_id: 'r1',
      recipe_title: 'Tortilla',
    });
  });
});
