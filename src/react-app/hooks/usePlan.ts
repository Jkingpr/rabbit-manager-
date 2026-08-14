import { useState, useEffect } from 'react';

export interface PlanInfo {
  tipo_plan: 'Gratis' | 'Ilimitado';
  rabbit_count: number;
  limit: number | null;
  is_admin?: boolean;
  plan_expiry_date?: string | null;
  billing_period?: 'monthly' | 'annual';
  is_active?: boolean;
}

export function usePlan() {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlanInfo = async () => {
    try {
      const response = await fetch('/api/users/plan');
      if (response.ok) {
        const data = await response.json();
        setPlanInfo(data);
      }
    } catch (error) {
      console.error('Error fetching plan info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanInfo();
  }, []);

  return {
    planInfo,
    loading,
    refetch: fetchPlanInfo,
  };
}
