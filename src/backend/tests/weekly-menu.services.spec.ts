import { describe, it, expect, beforeEach } from 'vitest';
import { SaveWeeklyMenuService } from '../application/use-cases/save-weekly-menu.service.ts';
import { SetMenuSlotService } from '../application/use-cases/set-menu-slot.service.ts';
import { GetWeeklyMenuService } from '../application/use-cases/get-weekly-menu.service.ts';
import { ListWeeklyMenusService } from '../application/use-cases/list-weekly-menus.service.ts';
import { DeleteWeeklyMenuService } from '../application/use-cases/delete-weekly-menu.service.ts';
import {
  InvalidMenuPayloadError,
  MenuNotFoundError,
  UnknownMenuRecipeError,
} from '../domain/errors/menu-domain.error.ts';
import { InMemoryMenuRepository, InMemoryRecipeRepository, makeRecipe } from './support/in-memory-repositories.ts';

const WEEK = '2026-11-09';

describe('Weekly menu use cases', () => {
  let recipes: InMemoryRecipeRepository;
  let menus: InMemoryMenuRepository;
  let save: SaveWeeklyMenuService;
  let setSlot: SetMenuSlotService;
  let get: GetWeeklyMenuService;
  let list: ListWeeklyMenusService;
  let del: DeleteWeeklyMenuService;
  let tortillaId: string;
  let lentejasId: string;

  beforeEach(async () => {
    recipes = new InMemoryRecipeRepository();
    menus = new InMemoryMenuRepository();
    save = new SaveWeeklyMenuService(menus, recipes);
    setSlot = new SetMenuSlotService(menus, save);
    get = new GetWeeklyMenuService(menus, recipes);
    list = new ListWeeklyMenusService(menus, recipes);
    del = new DeleteWeeklyMenuService(menus);
    tortillaId = (await recipes.save(makeRecipe('ana', 'Tortilla'))).id;
    lentejasId = (await recipes.save(makeRecipe('ana', 'Lentejas'))).id;
  });

  describe('SaveWeeklyMenuService', () => {
    it('creates a menu, snapshots recipe titles and reports created', async () => {
      const result = await save.execute('ana', WEEK, [
        { day: 'monday', slot: 'lunch', recipe_id: tortillaId },
        { day: 'monday', slot: 'dinner', recipe_id: lentejasId, note: 'double portion' },
      ]);
      expect(result.created).toBe(true);
      expect(result.menu.week_start).toBe(WEEK);
      expect(result.menu.meals).toEqual([
        { day: 'monday', slot: 'lunch', recipe_id: tortillaId, recipe_title: 'Tortilla', recipe_available: true },
        {
          day: 'monday',
          slot: 'dinner',
          recipe_id: lentejasId,
          recipe_title: 'Lentejas',
          recipe_available: true,
          note: 'double portion',
        },
      ]);
    });

    it('replaces an existing week, keeping id and createdAt and refreshing updatedAt', async () => {
      const first = await save.execute('ana', WEEK, [{ day: 'monday', slot: 'lunch', recipe_id: tortillaId }]);
      await new Promise(r => setTimeout(r, 5));
      const second = await save.execute('ana', WEEK, [{ day: 'friday', slot: 'dinner', recipe_id: lentejasId }]);
      expect(second.created).toBe(false);
      expect(second.menu.id).toBe(first.menu.id);
      expect(second.menu.createdAt).toBe(first.menu.createdAt);
      expect(second.menu.updatedAt > first.menu.updatedAt).toBe(true);
      expect(second.menu.meals.map(m => `${m.day}:${m.slot}`)).toEqual(['friday:dinner']);
    });

    it('rejects an unknown recipe ID and leaves the stored menu unchanged', async () => {
      await save.execute('ana', WEEK, [{ day: 'monday', slot: 'lunch', recipe_id: tortillaId }]);
      await expect(
        save.execute('ana', WEEK, [
          { day: 'monday', slot: 'lunch', recipe_id: lentejasId },
          { day: 'tuesday', slot: 'lunch', recipe_id: 'recipe-invented' },
        ])
      ).rejects.toThrow(UnknownMenuRecipeError);
      const stored = await get.execute('ana', WEEK);
      expect(stored?.meals.map(m => m.recipe_id)).toEqual([tortillaId]);
    });

    it("rejects another user's recipe", async () => {
      const bobs = await recipes.save(makeRecipe('bob', 'Paella'));
      await expect(
        save.execute('ana', WEEK, [{ day: 'monday', slot: 'lunch', recipe_id: bobs.id }])
      ).rejects.toThrow(/Unknown recipe ID/);
    });

    it('rejects structural problems before checking recipes', async () => {
      await expect(save.execute('ana', '2026-11-11', [])).rejects.toThrow(InvalidMenuPayloadError);
      await expect(
        save.execute('ana', WEEK, [{ day: 'monday', slot: 'brunch', recipe_id: 'recipe-invented' }])
      ).rejects.toThrow(InvalidMenuPayloadError);
    });

    it('keeps an unchanged entry whose recipe was deleted, so the menu stays editable', async () => {
      await save.execute('ana', WEEK, [{ day: 'monday', slot: 'lunch', recipe_id: tortillaId }]);
      await recipes.deleteById('ana', tortillaId);
      const result = await save.execute('ana', WEEK, [
        { day: 'monday', slot: 'lunch', recipe_id: tortillaId },
        { day: 'tuesday', slot: 'lunch', recipe_id: lentejasId },
      ]);
      expect(result.menu.meals[0]).toMatchObject({ recipe_title: 'Tortilla', recipe_available: false });
      // ...but the deleted recipe cannot be placed in a new slot.
      await expect(
        save.execute('ana', WEEK, [{ day: 'sunday', slot: 'lunch', recipe_id: tortillaId }])
      ).rejects.toThrow(UnknownMenuRecipeError);
    });
  });

  describe('SetMenuSlotService', () => {
    it('creates the menu when the week has none', async () => {
      const result = await setSlot.execute('ana', WEEK, { day: 'thursday', slot: 'dinner', recipe_id: tortillaId });
      expect(result.created).toBe(true);
      expect(result.menu.meals).toHaveLength(1);
    });

    it('changes only the targeted slot', async () => {
      await save.execute('ana', WEEK, [
        { day: 'monday', slot: 'lunch', recipe_id: tortillaId, note: 'keep me' },
        { day: 'friday', slot: 'dinner', recipe_id: tortillaId },
      ]);
      const result = await setSlot.execute('ana', WEEK, { day: 'friday', slot: 'dinner', recipe_id: lentejasId });
      expect(result.menu.meals).toEqual([
        expect.objectContaining({ day: 'monday', slot: 'lunch', recipe_id: tortillaId, note: 'keep me' }),
        expect.objectContaining({ day: 'friday', slot: 'dinner', recipe_id: lentejasId, recipe_title: 'Lentejas' }),
      ]);
    });

    it('clears a slot with recipe_id null', async () => {
      await save.execute('ana', WEEK, [
        { day: 'monday', slot: 'lunch', recipe_id: tortillaId },
        { day: 'friday', slot: 'dinner', recipe_id: lentejasId },
      ]);
      const result = await setSlot.execute('ana', WEEK, { day: 'monday', slot: 'lunch', recipe_id: null });
      expect(result.menu.meals.map(m => `${m.day}:${m.slot}`)).toEqual(['friday:dinner']);
    });

    it('rejects an invalid day or slot even when clearing', async () => {
      await expect(
        setSlot.execute('ana', WEEK, { day: 'funday', slot: 'lunch', recipe_id: null })
      ).rejects.toThrow(InvalidMenuPayloadError);
    });
  });

  describe('Get / List / Delete', () => {
    it('returns null for a week without a menu', async () => {
      expect(await get.execute('ana', WEEK)).toBeNull();
    });

    it('flags entries whose recipe was deleted as unavailable, keeping the saved title', async () => {
      await save.execute('ana', WEEK, [
        { day: 'monday', slot: 'lunch', recipe_id: tortillaId },
        { day: 'monday', slot: 'dinner', recipe_id: lentejasId },
      ]);
      await recipes.deleteById('ana', tortillaId);
      const menu = await get.execute('ana', WEEK);
      expect(menu?.meals).toEqual([
        expect.objectContaining({ recipe_id: tortillaId, recipe_title: 'Tortilla', recipe_available: false }),
        expect.objectContaining({ recipe_id: lentejasId, recipe_title: 'Lentejas', recipe_available: true }),
      ]);
    });

    it('lists menus most recent first and only for the user', async () => {
      await save.execute('ana', '2026-11-02', []);
      await save.execute('ana', '2026-11-16', []);
      await save.execute('bob', '2026-11-09', []);
      expect((await list.execute('ana')).map(m => m.week_start)).toEqual(['2026-11-16', '2026-11-02']);
    });

    it('deletes a menu and throws MenuNotFoundError when there is none', async () => {
      await save.execute('ana', WEEK, []);
      await del.execute('ana', WEEK);
      expect(await get.execute('ana', WEEK)).toBeNull();
      await expect(del.execute('ana', WEEK)).rejects.toThrow(MenuNotFoundError);
    });
  });
});
