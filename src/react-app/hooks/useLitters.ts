import { useState, useEffect } from 'react';

export interface Litter {
  id: number;
  breeding_id: number;
  male_name?: string;
  female_name?: string;
  birth_date: string;
  total_kits: number;
  alive_kits: number;
  dead_kits: number;
  weaning_date?: string;
  notes?: string;
}

export function useLitters() {
  const [litters, setLitters] = useState<Litter[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLitters = async () => {
    try {
      const response = await fetch('/api/litters');
      const data = await response.json();
      setLitters(data);
    } catch (error) {
      console.error('Error fetching litters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLitters();
  }, []);

  const addLitter = async (litter: Omit<Litter, 'id'>) => {
    try {
      const response = await fetch('/api/litters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(litter),
      });
      const newLitter = await response.json();
      setLitters([newLitter, ...litters]);
      return newLitter;
    } catch (error) {
      console.error('Error adding litter:', error);
      throw error;
    }
  };

  const updateLitter = async (id: number, litter: Partial<Litter>) => {
    try {
      const response = await fetch(`/api/litters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(litter),
      });
      const updatedLitter = await response.json();
      setLitters(litters.map(l => l.id === id ? updatedLitter : l));
      return updatedLitter;
    } catch (error) {
      console.error('Error updating litter:', error);
      throw error;
    }
  };

  const deleteLitter = async (id: number) => {
    try {
      await fetch(`/api/litters/${id}`, { method: 'DELETE' });
      setLitters(litters.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting litter:', error);
      throw error;
    }
  };

  return {
    litters,
    loading,
    addLitter,
    updateLitter,
    deleteLitter,
    refetch: fetchLitters,
  };
}
