import { createContext, useContext, useReducer } from 'react';

const TransactionContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'SET': return { ...state, transactions: action.payload, loading: false };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload, loading: false };
    default: return state;
  }
}

export function TransactionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { transactions: [], loading: false, error: null });

  async function load(month) {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const url = month ? `/api/transactions?month=${month}` : '/api/transactions';
      const res = await fetch(url);
      dispatch({ type: 'SET', payload: await res.json() });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
    }
  }

  return (
    <TransactionContext.Provider value={{ ...state, load }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactionContext() {
  return useContext(TransactionContext);
}
