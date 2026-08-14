import { useState, useEffect } from 'react';

export interface Breeding {
  id: number;
  male_id: number;
  female_id: number;
  male_name?: string;
  male_ear_tag?: string;
  female_name?: string;
  female_ear_tag?: string;
  breeding_date: string;
  expected_birth_date?: string;
  actual_birth_date?: string;
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
}

export function useBreedings() {
  const [breedings, setBreedings] = useState<Breeding[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBreedings = async () => {
    try {
      const response = await fetch('/api/breedings');
      const data = await response.json();
      setBreedings(data);
    } catch (error) {
      console.error('Error fetching breedings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreedings();
  }, []);

  const addBreeding = async (breeding: Omit<Breeding, 'id'>) => {
    try {
      const response = await fetch('/api/breedings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(breeding),
      });
      const newBreeding = await response.json();
      setBreedings([newBreeding, ...breedings]);
      return newBreeding;
    } catch (error) {
      console.error('Error adding breeding:', error);
      throw error;
    }
  };

  const updateBreeding = async (id: number, breeding: Partial<Breeding>) => {
    try {
      const response = await fetch(`/api/breedings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(breeding),
      });
      const updatedBreeding = await response.json();
      setBreedings(breedings.map(b => b.id === id ? updatedBreeding : b));
      return updatedBreeding;
    } catch (error) {
      console.error('Error updating breeding:', error);
      throw error;
    }
  };

  const deleteBreeding = async (id: number) => {
    try {
      await fetch(`/api/breedings/${id}`, { method: 'DELETE' });
      setBreedings(breedings.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error deleting breeding:', error);
      throw error;
    }
  };

  return {
    breedings,
    loading,
    addBreeding,
    updateBreeding,
    deleteBreeding,
    refetch: fetchBreedings,
  };
}
