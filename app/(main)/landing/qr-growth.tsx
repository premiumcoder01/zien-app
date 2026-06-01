import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TrackingNode = {
  id: string;
  assetName: string;
  redirectTarget: string;
  totalScans: string;
  status: 'ACTIVE' | 'Paused';
  action: 'Download';
};

const TRACKING_NODES: TrackingNode[] = [
  { id: '1', assetName: 'Malibu Yard Sign', redirectTarget: 'Property Page', totalScans: '432', status: 'ACTIVE', action: 'Download' },
  { id: '2', assetName: 'Business Card QR', redirectTarget: 'Bio-Link', totalScans: '1,254', status: 'ACTIVE', action: 'Download' },
  { id: '3', assetName: 'Flyer - Open House', redirectTarget: 'Check-In Form', totalScans: '89', status: 'ACTIVE', action: 'Download' },
];

export default function QRGrowthEngineScreen() {
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

      {/* Header Area - Consistent with Landing */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0B2D3E" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.appTitle}>QR Growth Engine</Text>
          <Text style={styles.appSubtitle}>
            Real-world attribution starts here. Generate and track physical traffic.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Button */}
        <Pressable style={styles.createButton}>
          <MaterialCommunityIcons name="qrcode-plus" size={18} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create QR Static/Dynamic</Text>
        </Pressable>

        {/* Active Tracking Nodes Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Tracking Nodes</Text>
        </View>

        <View style={styles.nodesListMobile}>
          {TRACKING_NODES.map((node) => (
            <View key={node.id} style={styles.nodeCardMobile}>
              {/* Top Row: Name & Scans */}
              <View style={styles.nodeCardTop}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="qrcode" size={20} color="#0B2D3E" />
                </View>
                <View style={styles.nodeInfo}>
                  <Text style={styles.nodeNameMobile}>{node.assetName}</Text>
                  <Text style={styles.nodeTargetMobile}>Target: {node.redirectTarget}</Text>
                </View>
                <View style={styles.scanBadge}>
                  <Text style={styles.scanCountMobile}>{node.totalScans}</Text>
                  <Text style={styles.scanLabelMobile}>Scans</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Bottom Row: Status & Action */}
              <View style={styles.nodeCardBottom}>
                <View style={[styles.statusPill, {
                  backgroundColor: node.status === 'ACTIVE' ? '#DCFCE7' : '#F3F4F6',
                  borderColor: node.status === 'ACTIVE' ? '#86EFAC' : '#E5E7EB'
                }]}>
                  <View style={[styles.statusDot, { backgroundColor: node.status === 'ACTIVE' ? '#166534' : '#6B7280' }]} />
                  <Text style={[styles.statusTextMobile, { color: node.status === 'ACTIVE' ? '#166534' : '#374151' }]}>
                    {node.status}
                  </Text>
                </View>

                <Pressable style={styles.actionButton} hitSlop={10}>
                  <Text style={styles.actionButtonText}>{node.action}</Text>
                  <MaterialCommunityIcons name="arrow-down-circle-outline" size={16} color="#0a2341" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Real-Time Scan Map Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Real-Time Scan Map</Text>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapContainer}>
            {/* Abstract Map Graphic Placeholder */}
            <View style={styles.mapGraphic}>
              <View style={styles.mapDot1} />
              <View style={styles.mapDot2} />
              <View style={styles.mapPin}>
                <MaterialCommunityIcons name="map-marker" size={24} color="#0a2341" />
              </View>
              <View style={styles.pulseRing} />
            </View>

            <View style={styles.mapTextContent}>
              <Text style={styles.mapRegion}>Los Angeles Metropolitan</Text>
              <Text style={styles.mapDetail}>Concentrated scan activity detected in Bel-Air.</Text>
            </View>
          </View>

          <View style={styles.mapStatsRow}>
            <View style={styles.mapStatItem}>
              <MaterialCommunityIcons name="chart-line-variant" size={16} color="#5B6B7A" />
              <Text style={styles.mapStatLabel}>Avg Scan-to-Lead Rate</Text>
              <View style={styles.filler} />
              <Text style={styles.mapStatValue}>14.2%</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.mapStatItem}>
              <MaterialCommunityIcons name="cellphone" size={16} color="#5B6B7A" />
              <Text style={styles.mapStatLabel}>Top Device Type</Text>
              <View style={styles.filler} />
              <Text style={styles.mapStatValue}>iPhone <Text style={{ fontWeight: '500', fontSize: 13, color: '#5B6B7A' }}>(82%)</Text></Text>
            </View>
          </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  createButton: {
    backgroundColor: '#0B2D3E',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
    marginBottom: 24,
    shadowColor: '#0B2D3E',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0B2D3E',
    letterSpacing: -0.3,
  },
  nodesListMobile: {
    gap: 12,
    marginBottom: 24,
  },
  nodeCardMobile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0B2D3E',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9', // Subtle border
  },
  nodeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0F5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeInfo: {
    flex: 1,
  },
  nodeNameMobile: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B2D3E',
    marginBottom: 2,
  },
  nodeTargetMobile: {
    fontSize: 12,
    color: '#5B6B7A',
    fontWeight: '500',
  },
  scanBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  scanCountMobile: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D9488',
  },
  scanLabelMobile: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F766E',
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  nodeCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextMobile: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0a2341',
  },
  // Removed legacy table styles to clean up
  tableHeader: {},
  tableHeadText: {},
  nodeRow: {},
  lastNodeRow: {},
  nodeMainInfo: {},
  nodeName: {},
  nodeTarget: {},
  mobileRowActions: {},
  statusBadge: {},
  statusText: {},
  downloadLink: {},
  nodeStats: {},
  scanCount: {},
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  // Map Section
  mapContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  mapGraphic: {
    width: 200,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  mapPin: {
    zIndex: 10,
  },
  pulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(11, 160, 178, 0.15)',
  },
  mapDot1: {
    position: 'absolute',
    top: 20,
    left: 40,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  mapDot2: {
    position: 'absolute',
    bottom: 30,
    right: 50,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  mapTextContent: {
    alignItems: 'center',
  },
  mapRegion: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0B2D3E',
    marginBottom: 4,
  },
  mapDetail: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  mapStatsRow: {
    gap: 12,
  },
  mapStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  mapStatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B6B7A',
  },
  mapStatValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0B2D3E',
  },
  filler: { flex: 1 },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
});
