import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Favorite } from '@screen-commander/shared';
import { api } from '../lib/api';

export function useFavorites() {
  return useQuery<Favorite[]>({
    queryKey: ['favorites'],
    queryFn: () => api.get('/favorites'),
  });
}

export function useCreateFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Favorite, 'id'>) => api.post<Favorite>('/favorites', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['favorites'] }); },
  });
}

export function useUpdateFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Favorite> & { id: string }) =>
      api.put<Favorite>(`/favorites/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['favorites'] }); },
  });
}

export function useDeleteFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/favorites/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['favorites'] }); },
  });
}
