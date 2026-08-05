import React, { useEffect, useState } from 'react';
import { Recipe, fetchRecipes } from './services/api.service';
import { RecipeGallery } from './components/RecipeGallery';
import { RecipeForm } from './components/RecipeForm';
import { RecipeDetail } from './components/RecipeDetail';

export const App: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [view, setView] = useState<'gallery' | 'form' | 'detail'>('gallery');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecipes();
      setRecipes(data);
    } catch (err: any) {
      setError('Could not connect to backend server. Make sure `npm run dev:backend` is running on port 3000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  const handleRecipeCreated = (newRecipe: Recipe) => {
    setRecipes(prev => [newRecipe, ...prev]);
    setSelectedRecipe(newRecipe);
    setView('detail');
  };

  const handleRecipeUpdated = (updatedRecipe: Recipe) => {
    setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
    setSelectedRecipe(updatedRecipe);
  };

  const handleRecipeDeleted = (deletedId: string) => {
    setRecipes(prev => prev.filter(r => r.id !== deletedId));
    if (selectedRecipe?.id === deletedId) {
      setSelectedRecipe(null);
      setView('gallery');
    }
  };

  return (
    <div>
      <header className="app-header">
        <div className="header-container">
          <div className="brand-logo" onClick={() => setView('gallery')}>
            <div className="brand-icon">🍳</div>
            <span>Mela Recipes</span>
          </div>

          <div className="header-actions">
            {view !== 'form' && (
              <button className="btn btn-primary" onClick={() => setView('form')}>
                + New Recipe
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main-container">
        {error && (
          <div className="alert-error" style={{ marginBottom: '2rem' }}>
            ⚠️ {error}
            <button className="btn btn-secondary" style={{ marginLeft: '1rem', padding: '0.2rem 0.6rem' }} onClick={loadRecipes}>
              Retry Connection
            </button>
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            <p>Loading your recipe cookbook...</p>
          </div>
        ) : (
          <>
            {view === 'gallery' && (
              <RecipeGallery
                recipes={recipes}
                onSelectRecipe={(r) => {
                  setSelectedRecipe(r);
                  setView('detail');
                }}
                onNewRecipe={() => setView('form')}
                onRecipeDeleted={handleRecipeDeleted}
              />
            )}

            {view === 'form' && (
              <RecipeForm
                onSuccess={handleRecipeCreated}
                onCancel={() => setView('gallery')}
              />
            )}

            {view === 'detail' && selectedRecipe && (
              <RecipeDetail
                recipe={selectedRecipe}
                onBack={() => setView('gallery')}
                onRecipeUpdated={handleRecipeUpdated}
                onRecipeDeleted={handleRecipeDeleted}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
