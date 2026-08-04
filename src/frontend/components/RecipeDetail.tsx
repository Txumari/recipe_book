import React, { useState, useEffect } from 'react';
import { Recipe, Ingredient, Step, Equipment, IngredientUnit, updateRecipe } from '../services/api.service';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
  onRecipeUpdated?: (updated: Recipe) => void;
}

const UNIT_OPTIONS: { label: string; value: IngredientUnit }[] = [
  { label: 'grams (g)', value: 'grams' },
  { label: 'kilograms (kg)', value: 'kg' },
  { label: 'milliliters (ml)', value: 'ml' },
  { label: 'liters (l)', value: 'l' },
  { label: 'tablespoons (tbsp)', value: 'tbsp' },
  { label: 'teaspoons (tsp)', value: 'tsp' },
  { label: 'cups (taza)', value: 'cup' },
  { label: 'pinch (pizca)', value: 'pinch' },
  { label: 'units (unidad)', value: 'unit' },
  { label: 'cloves (diente)', value: 'clove' },
  { label: 'slices (rodaja)', value: 'slice' },
  { label: 'splash (chorrito)', value: 'splash' },
];

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack, onRecipeUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentServings, setCurrentServings] = useState<number>(recipe.servings);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  // Inline form state
  const [editTitle, setEditTitle] = useState(recipe.title);
  const [editDescription, setEditDescription] = useState(recipe.description || '');
  const [editServings, setEditServings] = useState(recipe.servings);
  const [editPrepTime, setEditPrepTime] = useState(recipe.prep_time_minutes);
  const [editEquipment, setEditEquipment] = useState<Equipment[]>(recipe.equipment || []);
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>(recipe.ingredients || []);
  const [editSteps, setEditSteps] = useState<Step[]>(recipe.steps || []);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset state whenever recipe prop changes
    setEditTitle(recipe.title);
    setEditDescription(recipe.description || '');
    setEditServings(recipe.servings);
    setEditPrepTime(recipe.prep_time_minutes);
    setEditEquipment(recipe.equipment || []);
    setEditIngredients(recipe.ingredients || []);
    setEditSteps(recipe.steps || []);
    setCurrentServings(recipe.servings);
    setIsEditing(false);
  }, [recipe]);

  const toggleStep = (stepNumber: number) => {
    setCheckedSteps(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const scaleAmount = (amount: number): string => {
    const ratio = currentServings / recipe.servings;
    const scaled = amount * ratio;
    return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(2);
  };

  const handleCancelEdit = () => {
    setEditTitle(recipe.title);
    setEditDescription(recipe.description || '');
    setEditServings(recipe.servings);
    setEditPrepTime(recipe.prep_time_minutes);
    setEditEquipment(recipe.equipment || []);
    setEditIngredients(recipe.ingredients || []);
    setEditSteps(recipe.steps || []);
    setError(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!editTitle.trim()) {
      setError('Recipe title cannot be empty.');
      return;
    }
    if (editServings <= 0 || editPrepTime <= 0) {
      setError('Servings and prep time must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await updateRecipe(recipe.id, {
        title: editTitle,
        description: editDescription,
        servings: Number(editServings),
        prep_time_minutes: Number(editPrepTime),
        equipment: editEquipment.filter(e => e.name.trim().length > 0),
        ingredients: editIngredients.map(i => ({ ...i, amount: Number(i.amount) })),
        steps: editSteps.map(s => ({ ...s, step_number: Number(s.step_number) })),
      });
      setIsSubmitting(false);
      setIsEditing(false);
      if (onRecipeUpdated) {
        onRecipeUpdated(updated);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to update recipe.');
    }
  };

  // Helper functions for dynamic lists in edit mode
  const addEquipment = () => setEditEquipment([...editEquipment, { name: '', specification: '', is_optional: false }]);
  const removeEquipment = (index: number) => setEditEquipment(editEquipment.filter((_, i) => i !== index));
  const updateEquipmentItem = (index: number, field: keyof Equipment, value: any) => {
    const next = [...editEquipment];
    next[index] = { ...next[index], [field]: value };
    setEditEquipment(next);
  };

  const addIngredient = () => setEditIngredients([...editIngredients, { name: '', amount: 1, unit: 'unit' }]);
  const removeIngredient = (index: number) => {
    if (editIngredients.length <= 1) return;
    setEditIngredients(editIngredients.filter((_, i) => i !== index));
  };
  const updateIngredientItem = (index: number, field: keyof Ingredient, value: any) => {
    const next = [...editIngredients];
    next[index] = { ...next[index], [field]: value };
    setEditIngredients(next);
  };

  const addStep = () => setEditSteps([...editSteps, { step_number: editSteps.length + 1, instruction: '' }]);
  const removeStep = (index: number) => {
    if (editSteps.length <= 1) return;
    const filtered = editSteps.filter((_, i) => i !== index);
    const reindexed = filtered.map((s, idx) => ({ ...s, step_number: idx + 1 }));
    setEditSteps(reindexed);
  };
  const updateStepItem = (index: number, instruction: string) => {
    const next = [...editSteps];
    next[index] = { ...next[index], instruction };
    setEditSteps(next);
  };

  return (
    <div className="recipe-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Recipes
        </button>

        {!isEditing ? (
          <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
            ✏️ Edit Recipe
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
              ✕ Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert-error">⚠️ {error}</div>}

      {/* READ / COOKING MODE */}
      {!isEditing ? (
        <>
          <div className="detail-header">
            <h1>{recipe.title}</h1>
            {recipe.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                {recipe.description}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1.25rem' }}>
              <div className="meta-pill">⏱️ {recipe.prep_time_minutes} mins prep</div>
              
              <div className="servings-stepper">
                <span>Servings:</span>
                <button
                  className="stepper-btn"
                  onClick={() => setCurrentServings(Math.max(1, currentServings - 1))}
                >
                  -
                </button>
                <span>{currentServings}</span>
                <button
                  className="stepper-btn"
                  onClick={() => setCurrentServings(currentServings + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Equipment Section */}
          {recipe.equipment && recipe.equipment.length > 0 && (
            <div style={{ marginBottom: '2.5rem', background: '#F8F4EE', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid #E5DCD0' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🛠️ Kitchen Equipment Needed
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {recipe.equipment.map((eq, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{eq.name}</span>
                    {eq.specification && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                        ({eq.specification})
                      </span>
                    )}
                    {eq.is_optional && (
                      <span style={{ fontSize: '0.75rem', background: '#F2EBE1', padding: '0.1rem 0.4rem', borderRadius: '10px', color: 'var(--text-secondary)' }}>
                        Optional
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients Section */}
          <div className="ingredients-section">
            <h2>Ingredients</h2>
            <ul className="ingredients-list">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} className="ingredient-item">
                  <span style={{ fontWeight: 700, color: 'var(--accent-primary)', minWidth: '100px' }}>
                    {scaleAmount(ing.amount)} {ing.unit}
                  </span>
                  <span>{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps Section */}
          <div className="steps-section">
            <h2>Preparation Steps</h2>
            <ul className="steps-list">
              {recipe.steps.map((st) => {
                const isDone = !!checkedSteps[st.step_number];
                return (
                  <li
                    key={st.step_number}
                    className="step-item"
                    style={{
                      opacity: isDone ? 0.55 : 1,
                      textDecoration: isDone ? 'line-through' : 'none',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={isDone}
                      onChange={() => toggleStep(st.step_number)}
                    />
                    <div className="step-badge">{st.step_number}</div>
                    <div style={{ fontSize: '1.025rem', paddingTop: '0.2rem' }}>
                      {st.instruction}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : (
        /* IN-PLACE EDIT MODE */
        <form onSubmit={handleSaveEdit} style={{ background: '#FFFDF9', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-focus)' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>Editing Recipe In Place</h2>

          <div className="form-group">
            <label className="form-label">Recipe Title *</label>
            <input
              type="text"
              className="form-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Short Description</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Servings *</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={editServings}
                onChange={(e) => setEditServings(parseInt(e.target.value, 10) || 0)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Prep Time (minutes) *</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={editPrepTime}
                onChange={(e) => setEditPrepTime(parseInt(e.target.value, 10) || 0)}
                required
              />
            </div>
          </div>

          {/* Equipment Edit */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🛠️ Kitchen Equipment Prerequisites</span>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={addEquipment}>
                + Add Equipment
              </button>
            </label>

            {editEquipment.map((eq, idx) => (
              <div key={idx} className="dynamic-list-item">
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 2 }}
                  placeholder="Tool name"
                  value={eq.name}
                  onChange={(e) => updateEquipmentItem(idx, 'name', e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 2 }}
                  placeholder="Size / specs"
                  value={eq.specification || ''}
                  onChange={(e) => updateEquipmentItem(idx, 'specification', e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    className="checkbox-custom"
                    checked={!!eq.is_optional}
                    onChange={(e) => updateEquipmentItem(idx, 'is_optional', e.target.checked)}
                  />
                  Optional
                </label>
                <button type="button" className="btn btn-danger" onClick={() => removeEquipment(idx)}>
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Ingredients Edit */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🥗 Ingredients *</span>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={addIngredient}>
                + Add Ingredient
              </button>
            </label>

            {editIngredients.map((ing, idx) => (
              <div key={idx} className="dynamic-list-item">
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 2 }}
                  placeholder="Ingredient name"
                  value={ing.name}
                  onChange={(e) => updateIngredientItem(idx, 'name', e.target.value)}
                  required
                />
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  className="form-input"
                  style={{ width: '90px' }}
                  value={ing.amount}
                  onChange={(e) => updateIngredientItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                  required
                />
                <select
                  className="form-select"
                  style={{ width: '150px' }}
                  value={ing.unit}
                  onChange={(e) => updateIngredientItem(idx, 'unit', e.target.value as IngredientUnit)}
                >
                  {UNIT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {editIngredients.length > 1 && (
                  <button type="button" className="btn btn-danger" onClick={() => removeIngredient(idx)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Steps Edit */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>📝 Steps *</span>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={addStep}>
                + Add Step
              </button>
            </label>

            {editSteps.map((st, idx) => (
              <div key={idx} className="dynamic-list-item" style={{ alignItems: 'flex-start' }}>
                <div className="step-badge" style={{ marginTop: '0.25rem' }}>{st.step_number}</div>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={st.instruction}
                  onChange={(e) => updateStepItem(idx, e.target.value)}
                  required
                />
                {editSteps.length > 1 && (
                  <button type="button" className="btn btn-danger" style={{ marginTop: '0.5rem' }} onClick={() => removeStep(idx)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
