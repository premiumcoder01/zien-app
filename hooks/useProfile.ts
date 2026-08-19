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
    queryFn: async () => {
      console.log('🔍 [useProfile] Querying profile with token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'NONE');
      const res = await getProfile(accessToken!);
      console.log('✅ [useProfile] Query finished successfully');
      return res;
    },
    enabled: !!accessToken,
    staleTime: 10 * 1000, // 10 seconds
    refetchOnMount: true,
    retry: 1,
  });
}
