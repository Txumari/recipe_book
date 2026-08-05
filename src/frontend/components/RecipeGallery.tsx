import React, { useState } from 'react';
import { Recipe, deleteRecipe } from '../services/api.service';
import { ConfirmModal } from './ConfirmModal';

interface RecipeGalleryProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onNewRecipe: () => void;
  onRecipeDeleted?: (id: string) => void;
}

export const RecipeGallery: React.FC<RecipeGalleryProps> = ({
  recipes,
  onSelectRecipe,
  onNewRecipe,
  onRecipeDeleted,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.ingredients.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.equipment && r.equipment.some(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleDeleteClick = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation(); // Don't trigger card selection
    setRecipeToDelete(recipe);
  };

  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return;
    try {
      setIsDeleting(true);
      setError(null);
      await deleteRecipe(recipeToDelete.id);
      setIsDeleting(false);
      const deletedId = recipeToDelete.id;
      setRecipeToDelete(null);
      if (onRecipeDeleted) {
        onRecipeDeleted(deletedId);
      }
    } catch (err: any) {
      setIsDeleting(false);
      setRecipeToDelete(null);
      setError(err.message || 'Failed to delete recipe');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Recipe Cookbook</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} stored locally
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '240px' }}
            placeholder="🔍 Search title, ingredient, tool..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn btn-primary" onClick={onNewRecipe}>
            ✨ New Recipe
          </button>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '1.5rem' }}>⚠️ {error}</div>}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
          <h2>No recipes found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {recipes.length === 0 ? "You haven't added any recipes yet." : "No recipes match your search."}
          </p>
          <button className="btn btn-primary" onClick={onNewRecipe}>
            Create your first recipe
          </button>
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map(recipe => (
            <div
              key={recipe.id}
              className="recipe-card"
              onClick={() => onSelectRecipe(recipe)}
              style={{ position: 'relative' }}
            >
              <div className="recipe-card-header" style={{ paddingRight: '2rem' }}>
                <h3 className="recipe-card-title">{recipe.title}</h3>
                {recipe.description && (
                  <p className="recipe-card-desc">{recipe.description}</p>
                )}
              </div>

              <button
                className="btn btn-danger"
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  opacity: 0.8,
                }}
                title="Delete Recipe"
                onClick={(e) => handleDeleteClick(e, recipe)}
              >
                🗑️
              </button>

              <div className="recipe-meta-pills">
                <span className="meta-pill">⏱️ {recipe.prep_time_minutes} mins</span>
                <span className="meta-pill">🍽️ {recipe.servings} servings</span>
                <span className="meta-pill">🥗 {recipe.ingredients.length} ingredients</span>
                {recipe.equipment && recipe.equipment.length > 0 && (
                  <span className="meta-pill" style={{ background: '#F5EFE6', color: 'var(--text-primary)' }}>
                    🛠️ {recipe.equipment.length} tools
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!recipeToDelete}
        title="⚠️ Delete Recipe"
        message={`Are you sure you want to delete "${recipeToDelete?.title || ''}"? This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : '🗑️ Delete Recipe'}
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setRecipeToDelete(null)}
      />
    </div>
  );
};
