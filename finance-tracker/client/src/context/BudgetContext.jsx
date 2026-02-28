import { createContext, useContext, useReducer } from 'react';

const BudgetContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'SET': return { ...state, budgets: action.payload, loading: false };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
    default: return state;
  }
}

export function BudgetProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { budgets: [], loading: false, error: null });

  async function load(fyStart) {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`/api/budgets?fy_start=${fyStart}`);
      dispatch({ type: 'SET', payload: await res.json() });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
    }
  }

  return (
    <BudgetContext.Provider value={{ ...state, load }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudgetContext() {
  return useContext(BudgetContext);
}
