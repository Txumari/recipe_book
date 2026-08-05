import React, { useState, useRef } from 'react';
import { CreateRecipeDto, Ingredient, Step, Equipment, IngredientUnit, createRecipe, Recipe } from '../services/api.service';

interface RecipeFormProps {
  onSuccess: (recipe: Recipe) => void;
  onCancel: () => void;
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

export const RecipeForm: React.FC<RecipeFormProps> = ({ onSuccess, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState<number>(4);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(30);

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: 100, unit: 'grams' },
  ]);
  const [steps, setSteps] = useState<Step[]>([
    { step_number: 1, instruction: '' },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const addEquipment = () => {
    setEquipment(prev => [...prev, { name: '', specification: '', is_optional: false }]);
  };

  const removeEquipment = (index: number) => {
    setEquipment(prev => prev.filter((_, i) => i !== index));
  };

  const updateEquipment = (index: number, field: keyof Equipment, value: any) => {
    const next = [...equipment];
    next[index] = { ...next[index], [field]: value };
    setEquipment(next);
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: '', amount: 1, unit: 'unit' }]);
    setTimeout(() => {
      const inputs = formRef.current?.querySelectorAll<HTMLInputElement>('input[data-ingredient-name]');
      if (inputs && inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }, 50);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const moveIngredient = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ingredients.length) return;
    const next = [...ingredients];
    const [temp] = next.splice(index, 1);
    next.splice(targetIndex, 0, temp);
    setIngredients(next);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const next = [...ingredients];
    next[index] = { ...next[index], [field]: value };
    setIngredients(next);
  };

  const addStep = () => {
    setSteps(prev => [...prev, { step_number: prev.length + 1, instruction: '' }]);
    setTimeout(() => {
      const textareas = formRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea[data-step-instruction]');
      if (textareas && textareas.length > 0) {
        textareas[textareas.length - 1].focus();
      }
    }, 50);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const filtered = steps.filter((_, i) => i !== index);
    const reindexed = filtered.map((s, idx) => ({ ...s, step_number: idx + 1 }));
    setSteps(reindexed);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const next = [...steps];
    const [temp] = next.splice(index, 1);
    next.splice(targetIndex, 0, temp);
    const reindexed = next.map((s, idx) => ({ ...s, step_number: idx + 1 }));
    setSteps(reindexed);
  };

  const updateStep = (index: number, instruction: string) => {
    const next = [...steps];
    next[index] = { ...next[index], instruction };
    setSteps(next);
  };

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleIngredientKeyDown = (e: React.KeyboardEvent, index: number, isLastField: boolean) => {
    if (e.key === 'Alt' || e.altKey) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveIngredient(index, 'up');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveIngredient(index, 'down');
        return;
      }
    }

    if (e.key === 'Enter' && isLastField) {
      e.preventDefault();
      addIngredient();
      return;
    }

    if (e.key === 'Backspace' && ingredients[index].name === '' && ingredients.length > 1) {
      e.preventDefault();
      removeIngredient(index);
      setTimeout(() => {
        const prevInputs = formRef.current?.querySelectorAll<HTMLInputElement>('input[data-ingredient-name]');
        const prevIndex = Math.max(0, index - 1);
        if (prevInputs && prevInputs[prevIndex]) {
          prevInputs[prevIndex].focus();
        }
      }, 50);
    }
  };

  const handleStepKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      moveStep(index, 'up');
      return;
    }
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      moveStep(index, 'down');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addStep();
      return;
    }

    if (e.key === 'Backspace' && steps[index].instruction === '' && steps.length > 1) {
      e.preventDefault();
      removeStep(index);
      setTimeout(() => {
        const textareas = formRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea[data-step-instruction]');
        const prevIndex = Math.max(0, index - 1);
        if (textareas && textareas[prevIndex]) {
          textareas[prevIndex].focus();
        }
      }, 50);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Recipe title cannot be empty.');
      return;
    }
    if (servings <= 0 || prepTimeMinutes <= 0) {
      setError('Servings and prep time must be greater than zero.');
      return;
    }

    const payload: CreateRecipeDto = {
      title,
      description,
      servings: Number(servings),
      prep_time_minutes: Number(prepTimeMinutes),
      equipment: equipment.filter(e => e.name.trim().length > 0),
      ingredients: ingredients.map(i => ({ ...i, amount: Number(i.amount) })),
      steps: steps.map(s => ({ ...s, step_number: Number(s.step_number) })),
    };

    try {
      setIsSubmitting(true);
      const created = await createRecipe(payload);
      setIsSubmitting(false);
      onSuccess(created);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'An error occurred while creating the recipe.');
    }
  };

  return (
    <div className="form-card" onKeyDown={handleGlobalKeyDown}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Create New Recipe</h2>
          <span className="keyboard-hint" style={{ marginTop: '0.25rem' }}>
            💡 Quick Save: <kbd style={{ fontWeight: 'bold' }}>⌘+Enter</kbd> or <kbd style={{ fontWeight: 'bold' }}>Ctrl+Enter</kbd>
          </span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>✕ Cancel</button>
      </div>

      {error && <div className="alert-error">⚠️ {error}</div>}

      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Recipe Title *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Classic Gazpacho Andaluz"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Short Description</label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Brief notes, flavor profile, or origin..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Servings *</label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value, 10) || 0)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Prep Time (minutes) *</label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={prepTimeMinutes}
              onChange={(e) => setPrepTimeMinutes(parseInt(e.target.value, 10) || 0)}
              required
            />
          </div>
        </div>

        {/* Equipment Prerequisites Section */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🛠️ Kitchen Equipment Prerequisites (Optional)</span>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={addEquipment}>
              + Add Equipment
            </button>
          </label>

          {equipment.length === 0 && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
              No equipment added yet (e.g. "Molde para bizcocho 20 cm" or "Batidora de vaso").
            </p>
          )}

          {equipment.map((eq, idx) => (
            <div key={idx} className="dynamic-list-item">
              <input
                type="text"
                className="form-input"
                style={{ flex: 2 }}
                placeholder="Tool name (e.g. Batidora de vaso)"
                value={eq.name}
                onChange={(e) => updateEquipment(idx, 'name', e.target.value)}
                required
              />
              <input
                type="text"
                className="form-input"
                style={{ flex: 2 }}
                placeholder="Size / specs (e.g. 20 cm)"
                value={eq.specification || ''}
                onChange={(e) => updateEquipment(idx, 'specification', e.target.value)}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={!!eq.is_optional}
                  onChange={(e) => updateEquipment(idx, 'is_optional', e.target.checked)}
                />
                Optional
              </label>
              <button type="button" className="btn btn-danger" onClick={() => removeEquipment(idx)}>
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Ingredients Section */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span>🥗 Ingredients *</span>
              <span className="keyboard-hint" style={{ marginLeft: '0.75rem' }}>↵ Press Enter/Tab in unit select to add next</span>
            </div>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={addIngredient}>
              + Add Ingredient
            </button>
          </label>

          {ingredients.map((ing, idx) => (
            <div key={idx} className="dynamic-list-item">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button
                  type="button"
                  className="btn-reorder"
                  disabled={idx === 0}
                  onClick={() => moveIngredient(idx, 'up')}
                  title="Move Up (Alt+Up)"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="btn-reorder"
                  disabled={idx === ingredients.length - 1}
                  onClick={() => moveIngredient(idx, 'down')}
                  title="Move Down (Alt+Down)"
                >
                  ▼
                </button>
              </div>

              <input
                type="text"
                data-ingredient-name
                className="form-input"
                style={{ flex: 2 }}
                placeholder="Ingredient name (e.g. Diente de ajo)"
                value={ing.name}
                onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                onKeyDown={(e) => handleIngredientKeyDown(e, idx, false)}
                required
              />
              <input
                type="number"
                step="any"
                min="0.01"
                className="form-input"
                style={{ width: '90px' }}
                value={ing.amount}
                onChange={(e) => updateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)}
                onKeyDown={(e) => handleIngredientKeyDown(e, idx, false)}
                required
              />
              <select
                className="form-select"
                style={{ width: '150px' }}
                value={ing.unit}
                onChange={(e) => updateIngredient(idx, 'unit', e.target.value as IngredientUnit)}
                onKeyDown={(e) => handleIngredientKeyDown(e, idx, true)}
              >
                {UNIT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {ingredients.length > 1 && (
                <button type="button" className="btn btn-danger" onClick={() => removeIngredient(idx)}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Steps Section */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span>📝 Steps *</span>
              <span className="keyboard-hint" style={{ marginLeft: '0.75rem' }}>↵ Press Enter for next step | ⇧↵ Newline</span>
            </div>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={addStep}>
              + Add Step
            </button>
          </label>

          {steps.map((st, idx) => (
            <div key={idx} className="dynamic-list-item" style={{ alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn-reorder"
                  disabled={idx === 0}
                  onClick={() => moveStep(idx, 'up')}
                  title="Move Up (Alt+Up)"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="btn-reorder"
                  disabled={idx === steps.length - 1}
                  onClick={() => moveStep(idx, 'down')}
                  title="Move Down (Alt+Down)"
                >
                  ▼
                </button>
              </div>

              <div className="step-badge" style={{ marginTop: '0.25rem' }}>{st.step_number}</div>
              <textarea
                data-step-instruction
                className="form-textarea"
                rows={2}
                placeholder={`Instruction for step ${st.step_number}...`}
                value={st.instruction}
                onChange={(e) => updateStep(idx, e.target.value)}
                onKeyDown={(e) => handleStepKeyDown(e, idx)}
                required
              />
              {steps.length > 1 && (
                <button type="button" className="btn btn-danger" style={{ marginTop: '0.5rem' }} onClick={() => removeStep(idx)}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving Recipe...' : '✨ Save Recipe'}
          </button>
        </div>
      </form>
    </div>
  );
};
