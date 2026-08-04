import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getMyMenus } from '@/services/dashboardService';
import type { NavMenuItem } from '@/components/main/NavDrawer';
import type { Href } from 'expo-router';
import { Platform } from 'react-native';

// Static client menu items fallback
const STATIC_MENU_ITEMS: NavMenuItem[] = [
  { label: 'Dashboard', icon: 'view-grid-outline', route: '/(main)/dashboard' as Href },
  { label: 'Property Intelligence', icon: 'domain', route: '/(main)/property-intelligence' as Href },
  { label: 'Inbox', icon: 'inbox-outline', route: '/(main)/inbox' as Href },
  { label: 'Calendar', icon: 'calendar-blank-outline', route: '/(main)/calendar' as Href },
  { label: 'CRM', icon: 'account-group-outline', route: '/(main)/crm' as Href },
  { label: 'Properties', icon: 'home-outline', route: '/(main)/properties' as Href },
  { label: 'Open House', icon: 'map-marker-radius-outline', route: '/(main)/open-house' as Href },
  { label: 'Social Media', icon: 'share-variant-outline', route: '/(main)/social-hub' as Href },
  { label: 'AI Sweep', icon: 'brain', route: '/(main)/ai-content' as Href },
  { label: 'Leads Capture', icon: 'form-select', route: '/(main)/leads-capture' as Href },
  { label: 'Zien Card', icon: 'card-account-details-outline', route: '/(main)/zien-card' as Href },
  { label: 'Zien Guardian', icon: 'target', route: '/(main)/guardian-ai' as Href },
  { label: 'Billing & Usage', icon: 'credit-card-outline', route: '/(main)/billing-usage' as Href }
];

const mapApiIconToMci = (apiIcon: string, name?: string): string => {
  const iconLower = apiIcon ? apiIcon.toLowerCase() : '';
  const nameLower = name ? name.toLowerCase() : '';

  // Match by name first for design consistency
  if (nameLower.includes('dashboard')) return 'view-grid-outline';
  if (nameLower.includes('property intelligence') || nameLower.includes('property-intelligence')) return 'domain';
  if (nameLower.includes('inbox')) return 'inbox-outline';
  if (nameLower.includes('calendar')) return 'calendar-blank-outline';
  if (nameLower.includes('crm')) return 'account-group-outline';
  if (nameLower.includes('properties')) return 'home-outline';
  if (nameLower.includes('open house') || nameLower.includes('open-house')) return 'map-marker-radius-outline';
  if (nameLower.includes('social')) return 'share-variant-outline';
  if (nameLower.includes('ai sweep') || nameLower.includes('ai-content')) return 'brain';
  if (nameLower.includes('lead capture') || nameLower.includes('leads capture') || nameLower.includes('landing-pages')) return 'form-select';
  if (nameLower.includes('zien card') || nameLower.includes('digital-card')) return 'card-account-details-outline';
  if (nameLower.includes('zien guardian') || nameLower.includes('safety') || nameLower.includes('guardian-ai')) return 'target';
  if (nameLower.includes('billing') || nameLower.includes('subscription')) return 'credit-card-outline';

  // Fallback map based on typical Lucide icon names to MaterialCommunityIcons names
  switch (iconLower) {
    case 'layout': return 'view-grid-outline';
    case 'inbox': return 'inbox-outline';
    case 'calendar': return 'calendar-blank-outline';
    case 'panelleftclose': return 'account-group-outline';
    case 'mappinhouse': return 'home-outline';
    case 'home': return 'map-marker-radius-outline';
    case 'share2': return 'share-variant-outline';
    case 'brain': return 'brain';
    case 'layouttemplate': return 'form-select';
    case 'creditcard': return 'card-account-details-outline';
    case 'radar': return 'target';
    case 'users': return 'credit-card-outline';
    default: return 'help-circle-outline';
  }
};

const mapApiRouteToAppRoute = (apiPath: string): string => {
  const cleanPath = apiPath ? apiPath.replace(/^\/+|\/+$/g, '') : '';
  
  switch (cleanPath) {
    case 'dashboard':
      return '/(main)/dashboard';
    case 'property-intelligence':
      return '/(main)/property-intelligence';
    case 'inbox':
      return '/(main)/inbox';
    case 'calendar':
      return '/(main)/calendar';
    case 'crm':
      return '/(main)/crm';
    case 'properties':
      return '/(main)/properties';
    case 'open-house':
      return '/(main)/open-house';
    case 'social':
    case 'social-hub':
      return '/(main)/social-hub';
    case 'ai-content':
      return '/(main)/ai-content';
    case 'landing-pages':
    case 'leads-capture':
      return '/(main)/leads-capture';
    case 'digital-card':
    case 'zien-card':
      return '/(main)/zien-card';
    case 'safety':
    case 'guardian-ai':
      return '/(main)/guardian-ai';
    case 'subscription':
    case 'billing-usage':
      return '/(main)/billing-usage';
    default:
      return `/(main)/${cleanPath}`;
  }
};

export function useMyMenus() {
  const { accessToken } = useAuth();

  const query = useQuery<NavMenuItem[], Error>({
    queryKey: ['myMenus', accessToken],
    queryFn: async () => {
      if (!accessToken) return [];
      const rawMenus = await getMyMenus(accessToken);
      
      // Filter out status !== 1 (inactive) and sort by sort_order
      const activeSorted = rawMenus
        .filter((item) => item.status === 1)
        .sort((a, b) => a.sort_order - b.sort_order);

      const mapped: NavMenuItem[] = activeSorted.map((item) => ({
        label: item.name,
        icon: mapApiIconToMci(item.icon, item.name),
        route: mapApiRouteToAppRoute(item.path) as Href,
      }));

      return mapped;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fallback to static menu items if query is in error state or returns empty/null/undefined when not loading
  const data = query.isError || (!query.isLoading && (!query.data || query.data.length === 0))
    ? STATIC_MENU_ITEMS
    : (query.data || undefined);

  return {
    ...query,
    data,
  };
}

