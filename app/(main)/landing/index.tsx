import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



const STATS = [
  {
    label: 'TOTAL REACH',
    value: '4.3k',
    icon: 'account-group' as const,
  },
  {
    label: 'CAPTURE RATE',
    value: '18.4%',
    icon: 'magnet' as const,
  },
  {
    label: 'AVG. ENGAGEMENT',
    value: '2m 14s',
    icon: 'chart-line-variant' as const,
  },
];

const CAPTURE_ENGINES = [
  {
    id: 'bio-link',
    label: 'SOCIAL INTEGRATION',
    title: 'Dynamic Bio-Link',
    description:
      'One master link for all platforms. Real-time listing sync.',
    icon: 'link-variant' as const, // Changed for the label icon
    route: '/(main)/landing/bio-link',
    type: 'dark',
  },
  {
    id: 'qr',
    label: 'PHYSICAL TO DIGITAL',
    title: 'QR Infrastructure',
    description:
      'Trackable QR codes for yard signs and luxury flyers.',
    icon: 'navigation-variant-outline' as const, // Changed for the label icon
    route: '/(main)/landing/qr-growth',
    type: 'light',
  },
];

const PORTFOLIO_ITEMS = [
  {
    id: '1',
    name: 'Malibu Villa Listing',
    type: 'Property Page',
    visitors: '1.4k',
    visitorTrend: '+12%',
    visitorTrendGood: true,
    conversion: '3.0%',
    leads: '42 leads',
    status: 'LIVE',
  },
  {
    id: '2',
    name: 'Beverly Hills Open House',
    type: 'Check-In Page',
    visitors: '856',
    visitorTrend: '+34%',
    visitorTrendGood: true,
    conversion: '14.9%',
    leads: '128 leads',
    status: 'LIVE',
  },
  {
    id: '3',
    name: 'Agent Bio - Becker',
    type: 'Bio-Link Page',
    visitors: '2.1k',
    visitorTrend: '-2%',
    visitorTrendGood: false,
    conversion: '0.7%',
    leads: '18 leads',
    status: 'OPTIMIZING',
  },
];

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#CFDCE7', '#E0ECF4', '#F4F0EE']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header Area */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0B2D3E" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.appTitle}>Lead Capture Tools</Text>
          <Text style={styles.appSubtitle}>
            High-conversion landing pages for every stage of the real estate funnel.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Create New Page - Moved under header */}
        <Pressable
          style={styles.createNewPageButton}
          onPress={() => Alert.alert('Coming Soon', 'This feature is currently under development.')}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.createNewPageButtonText}>Create New Page</Text>
        </Pressable>
        {/* Stats Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContent}
          style={styles.statsScroll}
        >
          {STATS.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <MaterialCommunityIcons name={stat.icon} size={16} color="#0B2D3E" />
              </View>
              <View>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Capture Engines */}
        <Text style={styles.sectionTitle}>Capture Engines</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.enginesScroll}
          contentContainerStyle={styles.enginesScrollContent}
        >
          {CAPTURE_ENGINES.map((engine) => (
            <Pressable
              key={engine.id}
              style={styles.engineCardNew}
              onPress={() => router.push(engine.route as any)}
            >
              {/* Graphic Left */}
              <View style={styles.engineGraphicContainer}>
                {engine.type === 'dark' ? (
                  <View style={styles.phoneDark}>
                    {/* Mock details on phone */}
                    <View style={styles.phoneDarkScreen}>
                      <View style={styles.phoneDarkAvatar} />
                      <View style={styles.phoneDarkBar1} />
                      <View style={styles.phoneDarkBar2} />
                      <View style={styles.phoneDarkBtn} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.cardLight}>
                    <MaterialCommunityIcons name="qrcode" size={32} color="#0B2D3E" />
                  </View>
                )}
              </View>

              {/* Text Right */}
              <View style={styles.engineContentNew}>
                <View style={styles.engineLabelRow}>
                  <MaterialCommunityIcons name={engine.icon} size={12} color="#94A3B8" />
                  <Text style={styles.engineLabelText}>{engine.label}</Text>
                </View>
                <Text style={styles.engineTitleNew}>{engine.title}</Text>
                <Text style={styles.engineDescNew}>{engine.description}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Asset Portfolio */}
        <View style={styles.portfolioHeader}>
          <Text style={styles.sectionTitle}>Asset Portfolio</Text>
          <Pressable>
            <Text style={styles.detailLink}>Detailed Metrics</Text>
          </Pressable>
        </View>

        <View style={styles.portfolioList}>
          {PORTFOLIO_ITEMS.map((item) => (
            <View key={item.id} style={styles.portfolioItem}>
              {/* Row 1: Identity & Controls */}
              <View style={styles.portfolioTopRow}>
                <View style={styles.iconPlaceholder}>
                  <MaterialCommunityIcons name="link-variant" size={16} color="#5B6B7A" />
                </View>
                <View style={styles.identityBlock}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemType}>{item.type}</Text>
                </View>
                <View style={styles.controls}>
                  <Pressable style={styles.controlBtn}>
                    <MaterialCommunityIcons name="square-edit-outline" size={16} color="#5B6B7A" />
                  </Pressable>
                  <Pressable style={styles.controlBtn}>
                    <MaterialCommunityIcons name="dots-horizontal" size={16} color="#5B6B7A" />
                  </Pressable>
                </View>
              </View>

              {/* Row 2: Metrics Grid */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>VISITOR DENSITY</Text>
                  <View style={styles.metricValueRow}>
                    <Text style={styles.metricMainValue}>{item.visitors}</Text>
                    <View style={[styles.trendBadge, { backgroundColor: item.visitorTrendGood ? '#DCFCE7' : '#FEE2E2' }]}>
                      <Text style={[styles.trendText, { color: item.visitorTrendGood ? '#166534' : '#991B1B' }]}>
                        {item.visitorTrend}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>CONVERSION</Text>
                  <View style={styles.metricValueRow}>
                    <Text style={[styles.metricMainValue, { color: '#0EA5E9' }]}>{item.conversion}</Text>
                    <Text style={styles.metricSubValue}>{item.leads}</Text>
                  </View>
                </View>

                <View style={styles.metricCol}>
                  <Text style={styles.metricLabel}>STATUS</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: item.status === 'LIVE' ? '#22C55E' : '#F97316' }]} />
                    <Text style={[styles.statusText, { color: item.status === 'LIVE' ? '#15803D' : '#C2410C' }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  headerTop: {
    // legacy removed
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B2D3E',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#5B6B7A',
    lineHeight: 18,
    fontWeight: '500',
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  headerCenter: {
    flex: 1,
  },
  createNewPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0B2D3E',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
  },
  createNewPageButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createButton: {
    // legacy style removed but kept empty to avoid replace error if referenced elsewhere (it's not)
  },
  createButtonText: {
    // legacy style
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statsScroll: {
    marginBottom: 24,
    marginHorizontal: -20, // Negative margin to allow edge-to-edge scrolling
  },
  statsScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: 140, // Fixed width for horizontal scroll
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7FAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8899A6',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B2D3E',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B2D3E',
    marginBottom: 12,
  },
  enginesScroll: {
    marginBottom: 28,
    marginHorizontal: -20,
  },
  enginesScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  engineCardNew: {
    width: 280,
    backgroundColor: '#F0F5FA', // Very light blue/grey as in screenshot
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    // Add subtle shadow or border if needed, screenshot looks quite flat/soft
  },
  engineGraphicContainer: {
    // Container for the phone/card graphic
  },
  phoneDark: {
    width: 46,
    height: 80,
    backgroundColor: '#0B2D3E',
    borderRadius: 8,
    padding: 6,
    transform: [{ rotate: '-5deg' }], // Slight tilt for style
    justifyContent: 'center',
  },
  phoneDarkScreen: {
    flex: 1,
    justifyContent: 'space-between',
  },
  phoneDarkAvatar: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#334E5C',
  },
  phoneDarkBar1: {
    height: 4,
    width: '60%',
    backgroundColor: '#334E5C',
    borderRadius: 2,
    marginTop: 4,
  },
  phoneDarkBar2: {
    height: 4,
    width: '40%',
    backgroundColor: '#334E5C',
    borderRadius: 2,
    marginTop: 2,
  },
  phoneDarkBtn: {
    height: 8,
    width: '100%',
    backgroundColor: '#0a2341',
    borderRadius: 4,
  },
  cardLight: {
    width: 46,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '5deg' }], // Slight tilt other way
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  engineContentNew: {
    flex: 1,
  },
  engineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  engineLabelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  engineTitleNew: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B2D3E',
    marginBottom: 6,
  },
  engineDescNew: {
    fontSize: 11,
    color: '#5B6B7A',
    lineHeight: 15,
    fontWeight: '500',
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  detailLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0a2341',
  },
  portfolioList: {
    gap: 12,
  },
  portfolioItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  portfolioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityBlock: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B2D3E',
  },
  itemType: {
    fontSize: 11,
    color: '#5B6B7A',
    marginTop: 2,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metricMainValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  trendBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricSubValue: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
