import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { JsonFileMenuRepository } from '../infrastructure/repositories/json-file-menu.repository.ts';
import { WeeklyMenu } from '../domain/entities/weekly-menu.entity.ts';

describe('JsonFileMenuRepository', () => {
  let dir: string;
  let repo: JsonFileMenuRepository;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'menus-repo-'));
    repo = new JsonFileMenuRepository(path.join(dir, 'menus.json'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const menu = (userId: string, week: string, recipeId = 'r1') =>
    WeeklyMenu.create({
      userId,
      week_start: week,
      meals: [{ day: 'monday', slot: 'lunch', recipe_id: recipeId, recipe_title: 'Tortilla', note: 'x' }],
    });

  it('creates the file on first use', () => {
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'menus.json'), 'utf-8'))).toEqual([]);
  });

  it('saves and finds a menu by week, round-tripping all fields', async () => {
    const saved = await repo.save(menu('u1', '2026-11-09'));
    const found = await repo.findByWeek('u1', '2026-11-09');
    expect(found?.toProps()).toEqual(saved.toProps());
  });

  it('replaces the menu of the same user and week instead of duplicating it', async () => {
    await repo.save(menu('u1', '2026-11-09', 'r1'));
    await repo.save(menu('u1', '2026-11-09', 'r2'));
    const all = await repo.findAll('u1');
    expect(all).toHaveLength(1);
    expect(all[0].meals[0].recipe_id).toBe('r2');
  });

  it('lists menus most recent week first', async () => {
    await repo.save(menu('u1', '2026-11-02'));
    await repo.save(menu('u1', '2026-11-16'));
    await repo.save(menu('u1', '2026-11-09'));
    expect((await repo.findAll('u1')).map(m => m.week_start)).toEqual(['2026-11-16', '2026-11-09', '2026-11-02']);
  });

  it('isolates menus per user', async () => {
    await repo.save(menu('ana', '2026-11-09'));
    expect(await repo.findByWeek('bob', '2026-11-09')).toBeNull();
    expect(await repo.findAll('bob')).toEqual([]);
    expect(await repo.deleteByWeek('bob', '2026-11-09')).toBe(false);
    expect(await repo.findByWeek('ana', '2026-11-09')).not.toBeNull();
  });

  it('deletes a menu and reports whether one existed', async () => {
    await repo.save(menu('u1', '2026-11-09'));
    expect(await repo.deleteByWeek('u1', '2026-11-09')).toBe(true);
    expect(await repo.findByWeek('u1', '2026-11-09')).toBeNull();
    expect(await repo.deleteByWeek('u1', '2026-11-09')).toBe(false);
  });
});
