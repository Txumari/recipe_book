import React, { useState } from 'react';
import { Recipe } from '../services/api.service';

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, onBack }) => {
  const [currentServings, setCurrentServings] = useState<number>(recipe.servings);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const servingRatio = currentServings / recipe.servings;

  const toggleStep = (stepNumber: number) => {
    setCheckedSteps(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const scaleAmount = (amount: number): string => {
    const scaled = amount * servingRatio;
    return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(2);
  };

  return (
    <div className="recipe-detail">
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Recipes
        </button>
      </div>

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

      {/* Equipment Prerequisites Section */}
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
    </div>
  );
};
