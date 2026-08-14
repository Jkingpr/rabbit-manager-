import { useState, useEffect } from 'react';

export interface Expense {
  id: number;
  expense_date: string;
  expense_type: string;
  description: string;
  amount: number;
  quantity?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const addExpense = async (expenseData: Partial<Expense>) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      if (response.ok) {
        await fetchExpenses();
        return true;
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }
    return false;
  };

  const updateExpense = async (id: number, expenseData: Partial<Expense>) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      if (response.ok) {
        await fetchExpenses();
        return true;
      }
    } catch (error) {
      console.error('Error updating expense:', error);
    }
    return false;
  };

  const deleteExpense = async (id: number) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchExpenses();
        return true;
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
    return false;
  };

  return {
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
  };
}
