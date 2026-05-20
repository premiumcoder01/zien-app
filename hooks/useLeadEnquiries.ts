import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getLeadEnquiries, LeadEnquiryItem } from '@/services/digitalCardService';

export function useLeadEnquiries() {
  const { accessToken } = useAuth();

  return useQuery<LeadEnquiryItem[], Error>({
    queryKey: ['lead-enquiries', accessToken],
    queryFn: () => getLeadEnquiries(accessToken || ''),
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
}
