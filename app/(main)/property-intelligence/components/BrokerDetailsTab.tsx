import { useAppTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface BrokerDetailsTabProps {
  property: any;
}

export const BrokerDetailsTab: React.FC<BrokerDetailsTabProps> = ({ property }) => {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  const handleCall = () => Linking.openURL('tel:+13105550182');
  const handleEmail = () => Linking.openURL('mailto:michael@sterlingrealty.com');
  const handleWeb = () => Linking.openURL('https://www.sterlingrealty.com');

  return (
    <View style={styles.container}>
      {/* 1. Broker Hero Section */}
      <View style={styles.heroCard}>
        <View style={styles.heroBanner} />
        <View style={styles.profileRow}>
          <View style={styles.photoContainer}>
            <Image 
                source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
                style={styles.profilePhoto} 
            />
          </View>
          <View style={styles.actionsRow}>
            <Pressable style={styles.callBtn} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Call</Text>
            </Pressable>
            <Pressable style={styles.emailBtn} onPress={handleEmail}>
              <MaterialCommunityIcons name="email-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Email</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.brokerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.brokerName}>Michael D. Sterling</Text>
            <MaterialCommunityIcons name="check-decagram" size={18} color="#3B82F6" />
            <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </View>
          <Text style={styles.brokerTitle}>Sterling Global Realty</Text>
          <Text style={styles.dreNumber}>CA DRE #01987654</Text>
          
          <Text style={styles.bioText}>
            Michael Sterling is a top-producing agent in Los Angeles County with over $480M in career sales. Specializing in Wilshire Corridor, Beverly Hills, and Bel-Air luxury properties, he provides data-driven insights and white-glove service to both buyers and sellers.
          </Text>
        </View>
      </View>

      {/* 2. Key Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
            <MaterialCommunityIcons name="briefcase-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.metricLabel}>YEARS EXPERIENCE</Text>
            <Text style={styles.metricValue}>14 Years</Text>
        </View>
        <View style={styles.metricCard}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#10B981" />
            <Text style={styles.metricLabel}>CLOSED DEALS</Text>
            <Text style={styles.metricValue}>312+</Text>
        </View>
        <View style={styles.metricCard}>
            <MaterialCommunityIcons name="star-outline" size={20} color="#F59E0B" />
            <Text style={styles.metricLabel}>CLIENT RATING</Text>
            <Text style={styles.metricValue}>4.9/5</Text>
        </View>
        <View style={styles.metricCard}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#8B5CF6" />
            <Text style={styles.metricLabel}>AVG CLOSE TIME</Text>
            <Text style={styles.metricValue}>24 days</Text>
        </View>
      </View>

      {/* 3. Contact & Secondary Lists Grid */}
      <View style={styles.listsGrid}>
        {/* Contact Information */}
        <View style={styles.listCard}>
            <Text style={styles.listCardTitle}>Contact Information</Text>
            <View style={styles.contactList}>
                <Pressable onPress={handleCall} style={styles.contactItem}>
                    <MaterialCommunityIcons name="phone" size={18} color={colors.accent} />
                    <View>
                        <Text style={styles.itemLabel}>DIRECT LINE</Text>
                        <Text style={styles.itemValue}>+1 (310) 555-0182</Text>
                    </View>
                </Pressable>
                <Pressable onPress={handleEmail} style={styles.contactItem}>
                    <MaterialCommunityIcons name="email" size={18} color={colors.accent} />
                    <View>
                        <Text style={styles.itemLabel}>EMAIL</Text>
                        <Text style={styles.itemValue}>michael@sterlingrealty.com</Text>
                    </View>
                </Pressable>
                <Pressable onPress={handleWeb} style={styles.contactItem}>
                    <MaterialCommunityIcons name="web" size={18} color={colors.accent} />
                    <View>
                        <Text style={styles.itemLabel}>WEBSITE</Text>
                        <Text style={styles.itemValue}>www.sterlingrealty.com</Text>
                    </View>
                </Pressable>
                <View style={styles.contactItem}>
                    <MaterialCommunityIcons name="home-search" size={18} color={colors.accent} />
                    <View>
                        <Text style={styles.itemLabel}>SPECIALIZATION</Text>
                        <Text style={styles.itemValue}>Luxury Residential & Investment Properties</Text>
                    </View>
                </View>
                <View style={styles.contactItem}>
                    <MaterialCommunityIcons name="translate" size={18} color={colors.accent} />
                    <View>
                        <Text style={styles.itemLabel}>LANGUAGES</Text>
                        <Text style={styles.itemValue}>English, Spanish</Text>
                    </View>
                </View>
                <View style={styles.contactItem}>
                    <MaterialCommunityIcons name="comment-text-multiple-outline" size={18} color={colors.accent} />
                    <View>
                        <Text style={styles.itemLabel}>TOTAL REVIEWS</Text>
                        <Text style={styles.itemValue}>187 reviews</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* Certifications */}
        <View style={styles.listCard}>
            <Text style={styles.listCardTitle}>Certifications & Memberships</Text>
            <View style={styles.certList}>
                {[
                    'Certified Luxury Home Marketing Specialist (CLHMS)',
                    'Accredited Buyer\'s Representative (ABR)',
                    'National Association of Realtors (NAR)',
                ].map((cert, idx) => (
                    <View key={idx} style={styles.certItem}>
                        <MaterialCommunityIcons name="ribbon" size={16} color={colors.accent} />
                        <Text style={styles.certText}>{cert}</Text>
                    </View>
                ))}
            </View>
        </View>

        {/* Recent Closed Sales */}
        <View style={styles.listCard}>
            <Text style={styles.listCardTitle}>Recent Closed Sales</Text>
            <View style={styles.salesList}>
                {[
                    { address: '2310 Comstock Ave, Westwood, CA', price: '$2,150,000', date: 'Sold · Dec 2024' },
                    { address: '814 N Roxbury Dr, Beverly Hills, CA', price: '$4,800,000', date: 'Sold · Nov 2024' },
                    { address: '1201 Laurel Way, Beverly Hills, CA', price: '$3,200,000', date: 'Sold · Oct 2024' },
                ].map((sale, idx) => (
                    <View key={idx} style={styles.saleItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.saleAddress}>{sale.address}</Text>
                            <Text style={styles.salePrice}>{sale.price}</Text>
                        </View>
                        <Text style={styles.saleDate}>{sale.date}</Text>
                    </View>
                ))}
            </View>
        </View>
      </View>
    </View>
  );
};

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      gap: 20,
      paddingBottom: 20,
    },
    heroCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    heroBanner: {
        height: 100,
        backgroundColor: '#0F172A',
    },
    profileRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        marginTop: -40,
        marginBottom: 20,
    },
    photoContainer: {
        width: 80,
        height: 80,
        borderRadius: 16,
        borderWidth: 4,
        borderColor: colors.cardBackground,
        overflow: 'hidden',
        backgroundColor: colors.surfaceSoft,
    },
    profilePhoto: {
        width: '100%',
        height: '100%',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingBottom: 4,
    },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    emailBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    brokerInfo: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    brokerName: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    verifiedBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    verifiedText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#10B981',
    },
    brokerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 2,
    },
    dreNumber: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 16,
        fontWeight: '600',
    },
    bioText: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    metricCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        gap: 8,
    },
    metricLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.textSecondary,
        letterSpacing: 0.5,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    listsGrid: {
        gap: 16,
    },
    listCard: {
        backgroundColor: colors.cardBackground,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    listCardTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: colors.textPrimary,
        marginBottom: 20,
    },
    contactList: {
        gap: 20,
    },
    contactItem: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    itemLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textSecondary,
        marginBottom: 2,
    },
    itemValue: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    certList: {
        gap: 12,
    },
    certItem: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    certText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    salesList: {
        gap: 16,
    },
    saleItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        gap: 12,
    },
    saleAddress: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    salePrice: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    saleDate: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        width: 80,
        textAlign: 'right',
    },
  });
}

export { BrokerDetailsTab as default };
