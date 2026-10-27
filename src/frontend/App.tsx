import React, { useEffect, useState } from 'react';
import { Recipe, fetchRecipes, ParsedRecipeDraft } from './services/api.service';
import { RecipeGallery } from './components/RecipeGallery';
import { RecipeForm } from './components/RecipeForm';
import { RecipeDetail } from './components/RecipeDetail';

export const App: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [view, setView] = useState<'gallery' | 'form' | 'detail'>('gallery');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [importDraft, setImportDraft] = useState<ParsedRecipeDraft | null>(null);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let sourceUrl = (params.get('shareUrl') || '').trim();
    let captionText = (params.get('shareText') || '').trim();

    if (!sourceUrl && captionText) {
      const urlMatch = captionText.match(/https?:\/\/\S+/);
      if (urlMatch) {
        sourceUrl = urlMatch[0];
        captionText = captionText.replace(urlMatch[0], '').trim();
      }
    }

    if (sourceUrl || captionText) {
      setImportDraft({
        source_url: sourceUrl || undefined,
        text: captionText || undefined,
        parser_used: 'heuristic',
      });
      setView('form');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const openCreateForm = () => {
    setImportDraft(null);
    setView('form');
  };

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
              <button className="btn btn-primary" onClick={openCreateForm}>
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
                onNewRecipe={openCreateForm}
                onRecipeDeleted={handleRecipeDeleted}
              />
            )}

            {view === 'form' && (
              <RecipeForm
                onSuccess={handleRecipeCreated}
                onCancel={() => setView('gallery')}
                presetDraft={importDraft}
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
