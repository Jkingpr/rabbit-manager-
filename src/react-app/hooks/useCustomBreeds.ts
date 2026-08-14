import { useState, useEffect } from 'react';

export interface CustomBreed {
  id: number;
  user_id: number;
  breed_name: string;
  created_at: string;
  updated_at: string;
}

export function useCustomBreeds() {
  const [customBreeds, setCustomBreeds] = useState<CustomBreed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomBreeds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/custom-breeds', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCustomBreeds(data);
      } else {
        throw new Error('Error al cargar razas personalizadas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomBreeds();
  }, []);

  const addCustomBreed = async (breedName: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/custom-breeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ breed_name: breedName }),
      });
      if (response.ok) {
        await fetchCustomBreeds();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding custom breed:', err);
      return false;
    }
  };

  const deleteCustomBreed = async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/custom-breeds/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        await fetchCustomBreeds();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting custom breed:', err);
      return false;
    }
  };

  return {
    customBreeds,
    loading,
    error,
    addCustomBreed,
    deleteCustomBreed,
    refresh: fetchCustomBreeds,
  };
}
