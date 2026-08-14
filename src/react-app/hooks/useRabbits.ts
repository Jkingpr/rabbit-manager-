import { useState, useEffect } from 'react';

export interface Rabbit {
  id: number;
  name: string;
  ear_tag: string;
  sex: 'male' | 'female';
  breed: string;
  birth_date: string;
  weight?: number;
  color: string;
  status: 'active' | 'pregnant' | 'breeding' | 'retired' | 'deceased' | 'slaughtered';
  notes?: string;
  litter_id?: number;
  parent_male_id?: number;
  parent_female_id?: number;
  parent_male_name?: string;
  parent_female_name?: string;
  siblings?: Array<{ id: number; name: string; ear_tag: string; sex: string }>;
  sold_to?: string;
  sold_date?: string;
  sale_price?: number | null;
  left_ear_tattoo?: string;
  right_ear_tattoo?: string;
  photo_url?: string;
}

export function useRabbits() {
  const [rabbits, setRabbits] = useState<Rabbit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRabbits = async () => {
    try {
      const response = await fetch('/api/rabbits');
      const data = await response.json();
      setRabbits(data);
    } catch (error) {
      console.error('Error fetching rabbits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRabbits();
  }, []);

  const addRabbit = async (rabbit: Omit<Rabbit, 'id'>) => {
    try {
      console.log('[useRabbits] Sending rabbit data:', rabbit);
      const response = await fetch('/api/rabbits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rabbit),
        credentials: 'include',
      });
      
      console.log('[useRabbits] Response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('[useRabbits] Error response:', error);
        if (error.limitReached) {
          throw new Error(error.error);
        }
        throw new Error(error.error || error.details || 'Error al crear el conejo');
      }
      
      const newRabbit = await response.json();
      console.log('[useRabbits] New rabbit created:', newRabbit);
      setRabbits([newRabbit, ...rabbits]);
      return newRabbit;
    } catch (error) {
      console.error('[useRabbits] Error adding rabbit:', error);
      throw error;
    }
  };

  const updateRabbit = async (id: number, rabbit: Partial<Rabbit>) => {
    try {
      const response = await fetch(`/api/rabbits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rabbit),
        credentials: 'include',
      });
      const updatedRabbit = await response.json();
      setRabbits(rabbits.map(r => r.id === id ? updatedRabbit : r));
      return updatedRabbit;
    } catch (error) {
      console.error('Error updating rabbit:', error);
      throw error;
    }
  };

  const deleteRabbit = async (id: number) => {
    try {
      await fetch(`/api/rabbits/${id}`, { 
        method: 'DELETE',
        credentials: 'include',
      });
      setRabbits(rabbits.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting rabbit:', error);
      throw error;
    }
  };

  return {
    rabbits,
    loading,
    addRabbit,
    updateRabbit,
    deleteRabbit,
    refetch: fetchRabbits,
  };
}
