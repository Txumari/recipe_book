import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Recipe,
  WeeklyMenu as WeeklyMenuData,
  MealEntry,
  MealEntryInput,
  MealDay,
  MealSlotName,
  fetchMenu,
  saveMenu,
  deleteMenu,
} from '../services/api.service';
import { ConfirmModal } from './ConfirmModal';
import { WEEK_DAYS, MEAL_SLOTS, mondayOf, addDays, toIsoDate, formatRange } from '../utils/week';

interface WeeklyMenuProps {
  recipes: Recipe[];
  onOpenRecipe: (recipeId: string) => void;
}

const DAY_LABELS: Record<MealDay, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const SLOT_LABELS: Record<MealSlotName, string> = {
  breakfast: '🌅 Breakfast',
  lunch: '🍲 Lunch',
  snack: '🍎 Snack',
  dinner: '🌙 Dinner',
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const WeeklyMenu: React.FC<WeeklyMenuProps> = ({ recipes, onOpenRecipe }) => {
  const [monday, setMonday] = useState<Date>(() => mondayOf(new Date()));
  const [menu, setMenu] = useState<WeeklyMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const weekStart = toIsoDate(monday);

  // Ignore responses from superseded loads (fast week switching, StrictMode double effects).
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMenu(weekStart);
      if (seq === loadSeq.current) setMenu(data);
    } catch (err: any) {
      if (seq === loadSeq.current) setError(err.message || 'Could not load the weekly menu.');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const entryFor = (day: MealDay, slot: MealSlotName): MealEntry | undefined =>
    menu?.meals.find(m => m.day === day && m.slot === slot);

  const handleSlotChange = async (day: MealDay, slot: MealSlotName, recipeId: string) => {
    const meals: MealEntryInput[] = (menu?.meals ?? [])
      .filter(m => !(m.day === day && m.slot === slot))
      .map(({ day, slot, recipe_id, note }) => ({ day, slot, recipe_id, ...(note ? { note } : {}) }));
    const previous = entryFor(day, slot);
    if (recipeId) {
      // Keep the note when swapping the recipe of a slot.
      meals.push({ day, slot, recipe_id: recipeId, ...(previous?.note ? { note: previous.note } : {}) });
    }
    try {
      setSaving(true);
      setError(null);
      setMenu(await saveMenu(weekStart, meals));
    } catch (err: any) {
      setError(err.message || 'Could not save the weekly menu.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setConfirmDelete(false);
    try {
      setSaving(true);
      setError(null);
      await deleteMenu(weekStart);
      setMenu(null);
    } catch (err: any) {
      setError(err.message || 'Could not delete the weekly menu.');
    } finally {
      setSaving(false);
    }
  };

  const sortedRecipes = [...recipes].sort((a, b) => a.title.localeCompare(b.title));
  const isCurrentWeek = weekStart === toIsoDate(mondayOf(new Date()));

  return (
    <div className="weekly-menu">
      <div className="weekly-menu-header">
        <div>
          <h1>Weekly Menu</h1>
          <p style={{ color: 'var(--text-secondary)' }} data-testid="week-range">
            Week of {formatRange(monday)}
          </p>
        </div>

        <div className="weekly-menu-nav">
          <button
            className="btn btn-secondary"
            onClick={() => setMonday(addDays(monday, -7))}
            aria-label="Previous week"
          >
            ← Previous
          </button>
          {!isCurrentWeek && (
            <button className="btn btn-secondary" onClick={() => setMonday(mondayOf(new Date()))}>
              This week
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => setMonday(addDays(monday, 7))}
            aria-label="Next week"
          >
            Next →
          </button>
          {menu && (
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)} disabled={saving}>
              🗑️ Delete menu
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '1.5rem' }}>⚠️ {error}</div>}

      {!loading && !menu && (
        <div className="weekly-menu-empty" data-testid="menu-empty-state">
          <strong>No menu for this week yet.</strong> Pick recipes in the grid below, or ask a connected AI agent
          (Claude, Cursor, VS Code…) to plan the week from your recipes. See <code>docs/mcp-server.md</code> for setup.
        </div>
      )}

      {recipes.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Add some recipes first: menus can only use recipes from your cookbook.
        </p>
      )}

      {loading ? (
        <div className="empty-state">
          <p>Loading weekly menu...</p>
        </div>
      ) : (
        <div className="weekly-menu-scroll">
          <div className="weekly-menu-grid" aria-busy={saving}>
            <div className="weekly-menu-corner" />
            {WEEK_DAYS.map((day, i) => (
              <div key={day} className="weekly-menu-day-header">
                <span>{DAY_LABELS[day]}</span>
                <span className="weekly-menu-day-date">{addDays(monday, i).getDate()}</span>
              </div>
            ))}

            {MEAL_SLOTS.map(slot => (
              <React.Fragment key={slot}>
                <div className="weekly-menu-slot-label">{SLOT_LABELS[slot]}</div>
                {WEEK_DAYS.map(day => {
                  const entry = entryFor(day, slot);
                  const unavailable = entry && !entry.recipe_available;
                  return (
                    <div
                      key={`${day}-${slot}`}
                      className={`weekly-menu-cell${entry ? ' is-filled' : ''}${unavailable ? ' is-unavailable' : ''}`}
                      data-testid={`menu-cell-${day}-${slot}`}
                    >
                      {entry &&
                        (entry.recipe_available ? (
                          <button
                            type="button"
                            className="weekly-menu-recipe-link"
                            onClick={() => onOpenRecipe(entry.recipe_id)}
                            title={entry.note ? `Note: ${entry.note}` : 'Open recipe'}
                          >
                            {entry.recipe_title}
                          </button>
                        ) : (
                          <span className="weekly-menu-recipe-missing" title="This recipe was deleted">
                            {entry.recipe_title} <em>(no longer available)</em>
                          </span>
                        ))}
                      {entry?.note && <span className="weekly-menu-note">📝 {entry.note}</span>}

                      <select
                        className="form-select weekly-menu-select"
                        aria-label={`${capitalize(day)} ${slot}`}
                        value={entry?.recipe_id ?? ''}
                        disabled={saving || (recipes.length === 0 && !entry)}
                        onChange={e => handleSlotChange(day, slot, e.target.value)}
                      >
                        <option value="">— empty —</option>
                        {unavailable && (
                          <option value={entry.recipe_id} disabled>
                            {entry.recipe_title} (no longer available)
                          </option>
                        )}
                        {sortedRecipes.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete this weekly menu?"
        message={`The menu for the week of ${formatRange(monday)} will be removed. Your recipes are not affected.`}
        confirmText="Delete menu"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};
