import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getProfile, UserProfile } from '@/services/authService';

/**
 * Hook to fetch and manage the user profile data.
 * Uses TanStack Query for caching and state management.
 */
export function useProfile() {
  const { accessToken } = useAuth();

  return useQuery<UserProfile, Error>({
    queryKey: ['userProfile', accessToken],
    queryFn: () => getProfile(accessToken!),
    enabled: !!accessToken,
    staleTime: 10 * 1000, // 10 seconds
    refetchOnMount: true,
    retry: 1,
  });
}
