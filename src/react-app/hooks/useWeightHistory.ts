import { useState, useEffect } from 'react';

export interface WeightEntry {
  id: number;
  rabbit_id: number;
  weight: number;
  weight_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useWeightHistory(rabbitId: number | undefined) {
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWeights = async () => {
    if (!rabbitId) {
      setWeights([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/rabbits/${rabbitId}/weight-history`);
      if (!response.ok) {
        throw new Error('Error al cargar historial de peso');
      }
      const data = await response.json();
      setWeights(data);
    } catch (error) {
      console.error('Error fetching weight history:', error);
      setWeights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeights();
  }, [rabbitId]);

  const addWeight = async (weight: number, weight_date: string, notes?: string) => {
    if (!rabbitId) return;

    try {
      const response = await fetch(`/api/rabbits/${rabbitId}/weight-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight, weight_date, notes }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al agregar peso');
      }

      const newWeight = await response.json();
      setWeights([newWeight, ...weights]);
      return newWeight;
    } catch (error) {
      console.error('Error adding weight:', error);
      throw error;
    }
  };

  const deleteWeight = async (weightId: number) => {
    if (!rabbitId) return;

    try {
      const response = await fetch(`/api/rabbits/${rabbitId}/weight-history/${weightId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar peso');
      }

      setWeights(weights.filter(w => w.id !== weightId));
    } catch (error) {
      console.error('Error deleting weight:', error);
      throw error;
    }
  };

  return {
    weights,
    loading,
    addWeight,
    deleteWeight,
    refetch: fetchWeights,
  };
}
