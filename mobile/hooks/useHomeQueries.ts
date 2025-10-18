import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api';

export type Response<T> = {
  data: T;
}

export type TrendingSong = {
  id: number;
  name: string;
  level?: string;
  description?: string;
};

export type TrendingAlbum = {
  id: number;
  name: string;
  total_plays?: number;
  artists?: Array<{
    id: number;
    name: string;
  }>;
};

export type TrendingArtist = {
  id: number;
  name: string;
  total_plays?: number;
};

const staleTime = 5 * 60 * 1000;

export function useTrendingSongs() {
  return useQuery({
    queryKey: ['trending-songs'],
    queryFn: () => apiGet<Response<TrendingSong[]>>('/api/trending-songs'),
    staleTime,
  });
}

export function useTrendingAlbums() {
  return useQuery({
    queryKey: ['trending-albums'],
    queryFn: () => apiGet<Response<TrendingAlbum[]>>('/api/trending-albums'),
    staleTime,
  });
}

export function useTrendingArtists() {
  return useQuery({
    queryKey: ['trending-artists'],
    queryFn: () => apiGet<Response<TrendingArtist[]>>('/api/trending-artists'),
    staleTime,
  });
}
