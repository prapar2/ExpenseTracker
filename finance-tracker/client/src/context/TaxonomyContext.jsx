import { createContext, useContext, useReducer, useEffect } from 'react';
import { API_BASE } from '../utils/apiUtils';

const TaxonomyContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'SET': return { ...state, items: action.payload, loading: false };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
    default: return state;
  }
}

export function TaxonomyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { items: [], loading: true, error: null });

  async function load() {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${API_BASE}/taxonomy`);
      dispatch({ type: 'SET', payload: await res.json() });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
    }
  }

  useEffect(() => { load(); }, []);

  function getCategories(type) {
    const seen = new Set();
    return state.items
      .filter(i => i.type === type)
      .filter(i => { if (seen.has(i.category)) return false; seen.add(i.category); return true; })
      .map(i => i.category);
  }

  function getSubcategories(type, category) {
    return state.items
      .filter(i => i.type === type && i.category === category)
      .map(i => i.subcategory);
  }

  return (
    <TaxonomyContext.Provider value={{ ...state, reload: load, getCategories, getSubcategories }}>
      {children}
    </TaxonomyContext.Provider>
  );
}

export function useTaxonomy() {
  return useContext(TaxonomyContext);
}
