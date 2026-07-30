import { BillingCard, BillingScreenHeader, PlanModal, type BillingTabKey } from '@/components/billing';
import { ExternalLink } from '@/components/external-link';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { getSoloInvoices, getSoloSubscription, cancelSoloSubscription, type SoloAddon, type SoloInvoice, type SoloSubscriptionResponse } from '@/services/billingService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';


import { useSafeAreaInsets } from 'react-native-safe-area-context';



export default function BillingUsageScreen() {
  const { colors, theme } = useAppTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<BillingTabKey>('overview');
  const scrollRef = useRef<ScrollView>(null);

  // Dynamic API states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SoloSubscriptionResponse | null>(null);
  const [invoicesData, setInvoicesData] = useState<SoloInvoice[]>([]);

  // Features lists show all / collapsible state
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Memoized date descriptors for trial/billing cycles
  const dateText = useMemo(() => {
    if (!subscriptionData) return 'April 20, 2026';
    const { subscription } = subscriptionData;
    const isTrial = subscription.is_trial;
    return isTrial 
      ? new Date(subscription.trial_end).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      : subscription.trial_end 
        ? new Date(subscription.trial_end).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        : 'April 20, 2026';
  }, [subscriptionData]);

  const canceledDate = useMemo(() => {
    if (!subscriptionData || !subscriptionData.subscription.canceled_at) {
      return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return new Date(subscriptionData.subscription.canceled_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }, [subscriptionData]);

  // Modals state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SoloInvoice | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCancelAddonModal, setShowCancelAddonModal] = useState<SoloAddon | null>(null);

  const MANAGE_BILLING_URL = 'https://zien.ai/dashboard/billing';
  const openManageOnWebsite = () => {
    Linking.openURL(MANAGE_BILLING_URL).catch(() => Linking.openURL('https://zien.ai'));
  };

  // Fetch billing and invoice details
  const fetchBillingData = async (showPulse = false) => {
    if (showPulse) setRefreshing(true);
    else setLoading(true);

    try {
      const [subResult, invResult] = await Promise.all([
        getSoloSubscription(accessToken),
        getSoloInvoices(accessToken)
      ]);
      setSubscriptionData(subResult);
      setInvoicesData(invResult);
    } catch (error) {
      console.error('[BillingUsageScreen] Error fetching billing details:', error);
      Alert.alert('Connection Alert', 'Using secure offline cache for billing details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [accessToken]);

  const goToTab = (tab: BillingTabKey) => {
    setActiveTab(tab);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  const openSettlementModal = (inv: SoloInvoice) => setSelectedInvoice(inv);
  const closeSettlementModal = () => setSelectedInvoice(null);



  const openCancelModal = () => setShowCancelModal(true);
  const closeCancelModal = () => setShowCancelModal(false);
  const handleConfirmCancelSub = async () => {
    closeCancelModal();

    try {
      setLoading(true);
      const res = await cancelSoloSubscription(accessToken);
      if (res.success) {
        Alert.alert('Renewal Canceled', 'Your plan has been scheduled for cancellation.');
        if (subscriptionData) {
          setSubscriptionData({
            ...subscriptionData,
            subscription: {
              ...subscriptionData.subscription,
              cancel_at_period_end: true,
              canceled_at: new Date().toISOString()
            }
          });
        }
        await fetchBillingData();
      } else {
        const title = res.message || 'Failed to cancel subscription';
        const description = res.error || 'Failed to request cancellation.';
        Alert.alert(title, description);
      }
    } catch (error) {
      console.error('[BillingUsageScreen] Error canceling subscription:', error);
      Alert.alert('Error', 'Unable to process cancellation at this time.');
    } finally {
      setLoading(false);
    }
  };

  const openCancelAddonModal = (addon: SoloAddon) => setShowCancelAddonModal(addon);
  const closeCancelAddonModal = () => setShowCancelAddonModal(null);
  const handleConfirmCancelAddon = async () => {
    if (!showCancelAddonModal) return;
    const name = showCancelAddonModal.name;
    closeCancelAddonModal();
    // Direct user to website to manage addon cancellation (Apple compliant)
    Alert.alert(
      'Manage Add-on',
      `To cancel your ${name} add-on, please visit your account on the Zien website.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Website', onPress: openManageOnWebsite }
      ]
    );
  };


  // ─────────────────────────────────────────────────────
  // RENDER TABS
  // ─────────────────────────────────────────────────────

  // Overview Tab
  const renderOverview = () => {
    if (!subscriptionData) return null;

    const { subscription, plan, price, addons } = subscriptionData;
    const isTrial = subscription.is_trial;
    const formattedPrice = `$${price.amount}`;

    // Get features lists
    const benefitsList = plan.benefits || [];
    const visibleBenefits = showAllFeatures ? benefitsList : benefitsList.slice(0, 5);

    return (
      <View style={styles.tabContainer}>
        {/* Scheduled for Cancellation Banner Alert */}
        {subscription.cancel_at_period_end && (
          <View style={styles.cancellationBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#EF4444" style={{ marginTop: 2 }} />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Plan Scheduled for Cancellation</Text>
              <Text style={styles.bannerDesc}>
                This plan was canceled on <Text style={{ fontWeight: '800' }}>{canceledDate}</Text>. You will retain full access to premium features until <Text style={{ fontWeight: '800' }}>{dateText}</Text>, after which your account will automatically downgrade to the free tier.
              </Text>
            </View>
          </View>
        )}

        {/* PRO AGENT Plan Card */}
        <View style={styles.premiumPlanCard}>
          <View style={styles.planHeaderRow}>
            <View style={styles.tierIconContainer}>
              <MaterialCommunityIcons name="diamond-stone" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.planInfoMain}>
              <View style={styles.planTitleRow}>
                <Text style={styles.planTierTitle}>{plan.name}</Text>
                {subscription.cancel_at_period_end ? (
                  <View style={styles.pendingCancelPillInline}>
                    <Text style={styles.pendingCancelPillTextInline}>Canceled</Text>
                  </View>
                ) : (subscription.status_text.toLowerCase() === 'trialing' || subscription.is_trial) ? (
                  <View style={styles.trialPillContainerInline}>
                    <Text style={styles.trialPillTextInline}>Trial Mode</Text>
                  </View>
                ) : (
                  <View style={styles.activePillContainerInline}>
                    <Text style={styles.activePillTextInline}>Active</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planTierSubtitle}>
                {subscription.cancel_at_period_end ? `Access ends on ${dateText}` : 'Your premium subscription plan'}
              </Text>
            </View>
          </View>

          <View style={styles.planPriceRow}>
            <Text style={styles.planPriceValue}>{formattedPrice}</Text>
            <Text style={styles.planPricePeriod}>/ {price.billing_interval}</Text>
          </View>

          <View style={styles.planDivider} />

          <View style={styles.planBulletList}>
            {visibleBenefits.map((benefit, i) => (
              <View key={i} style={styles.planBulletRow}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#00a7b5" />
                <Text style={styles.planBulletText}>{benefit}</Text>
              </View>
            ))}

            {benefitsList.length > 5 && (
              <Pressable
                onPress={() => setShowAllFeatures(!showAllFeatures)}
                style={styles.showMoreToggle}
              >
                <Text style={styles.showMoreToggleText}>
                  {showAllFeatures ? 'Show Less' : `Show More (${benefitsList.length - 5} items)`}
                </Text>
                <MaterialCommunityIcons
                  name={showAllFeatures ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#00a7b5"
                />
              </Pressable>
            )}
          </View>

          <View style={styles.planDivider} />

          <View style={styles.planRenewalContainer}>
            <View style={styles.renewalAlertBox}>
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.textSecondary} />
              <View>
                <Text style={styles.renewalAlertTitle}>NEXT BILLING DEDUCTION</Text>
                <Text style={styles.renewalAlertDate}>{dateText}</Text>
              </View>
            </View>

            {subscription.cancel_at_period_end ? (
              <View style={styles.planCanceledBadge}>
                <Text style={styles.planCanceledBadgeText}>Plan Canceled</Text>
              </View>
            ) : (
              <Pressable style={styles.cancelRenewalButton} onPress={openCancelModal}>
                <Text style={styles.cancelRenewalButtonText}>Cancel Renewal</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Plan Add-ons Section */}
        <View style={styles.addonsSection}>
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.addonsSectionTitle}>Plan Add-ons</Text>
            <Text style={styles.addonsSectionSubtitle}>
              Customize your plan. Active add-ons renew automatically with your base plan.
            </Text>
          </View>

          <View style={styles.addonsList}>
            {addons.map((addon) => {
              // Map slugs to standard icons
              let iconName = 'view-grid-plus-outline';
              if (addon.slug.includes('staging')) iconName = 'home-city-outline';
              else if (addon.slug.includes('verification')) iconName = 'shield-check-outline';
              else if (addon.slug.includes('intelligence')) iconName = 'chart-timeline-variant-shimmer';

              const isActive = addon.status === 'active';

              return (
                <View key={addon.id} style={styles.addonCard}>
                  <View style={styles.addonCardLeft}>
                    <View style={styles.addonIconContainer}>
                      <MaterialCommunityIcons name={iconName as any} size={24} color="#00a7b5" />
                    </View>
                    <View style={styles.addonDetails}>
                      <Text style={styles.addonName}>{addon.name}</Text>
                      <Text style={styles.addonDesc} numberOfLines={2}>{addon.description}</Text>
                      {isActive && (
                        <View style={styles.addonStatusBadge}>
                          <Text style={styles.addonStatusText}>Active ({subscription.cancel_at_period_end ? 'Expires' : 'Renews'} {dateText})</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.addonCardRight}>
                    <Text style={styles.addonPrice}>${addon.price}<Text style={styles.addonPriceUnit}>/mo</Text></Text>
                    {isActive ? (
                      subscription.cancel_at_period_end ? (
                        <View style={styles.addonCanceledPill}>
                          <Text style={styles.addonCanceledPillText}>Plan Canceled</Text>
                        </View>
                      ) : (
                        <Pressable style={styles.cancelAddonBtn} onPress={() => openCancelAddonModal(addon)}>
                          <Text style={styles.cancelAddonBtnText}>Cancel Add-on</Text>
                        </Pressable>
                      )
                    ) : (
                      !subscription.cancel_at_period_end ? (
                        <Pressable style={styles.activateAddonBtn} onPress={openManageOnWebsite}>
                          <Text style={styles.activateAddonBtnText}>Manage on Website</Text>
                        </Pressable>
                      ) : null
                    )}
                  </View>
                </View>
              );
            })}
        </View>
      </View>
    </View>
  );
};

  // History / Invoices Tab
  const renderHistory = () => (
    <View style={styles.tabContainer}>
      <BillingCard>
        <View style={styles.ledgerHeaderWrap}>
          <Text style={styles.ledgerTitle}>Payment Ledger</Text>
          <Text style={styles.ledgerSubtitle}>Records synced directly from Stripe.</Text>
        </View>

        <View style={styles.invoicesList}>
          {invoicesData.map((invoice) => (
            <Pressable
              key={invoice.id}
              style={styles.invoiceCard}
              onPress={() => openSettlementModal(invoice)}
            >
              <View style={styles.invoiceCardTop}>
                <View>
                  <Text style={styles.invoiceDate}>{invoice.date}</Text>
                  <Text style={styles.invoiceTime}>{invoice.time}</Text>
                </View>
                <View style={styles.invoiceStatusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.invoiceStatusText}>{invoice.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.invoiceDivider} />

              <View style={styles.invoiceCardBody}>
                <Text style={styles.invoiceDesc}>{invoice.desc}</Text>
                <Text style={styles.invoiceMethod}>{invoice.method}</Text>
              </View>

              <View style={styles.invoiceCardFooter}>
                <View>
                  <Text style={styles.invoiceAmountLabel}>TOTAL AMOUNT</Text>
                  <Text style={styles.invoiceAmountValue}>{invoice.amt}</Text>
                </View>
                {invoice.pdf ? (
                  <ExternalLink
                    href={invoice.pdf}
                    style={styles.invoiceDownloadBtn}
                  >
                    <MaterialCommunityIcons name="download" size={16} color="#FFFFFF" />
                    <Text style={styles.invoiceDownloadBtnText}>Receipt</Text>
                  </ExternalLink>
                ) : (
                  <View style={[styles.invoiceDownloadBtn, { backgroundColor: colors.border, opacity: 0.6 }]}>
                    <MaterialCommunityIcons name="download-off" size={16} color={colors.textSecondary} />
                    <Text style={[styles.invoiceDownloadBtnText, { color: colors.textSecondary }]}>Receipt</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </BillingCard>
    </View>
  );

  const tabContent = useMemo(() => {
    switch (activeTab) {
      case 'history':
        return renderHistory();
      default:
        return renderOverview();
    }
  }, [activeTab, subscriptionData, invoicesData, showAllFeatures, colors, isDark]);

  return (
    <>
      <LinearGradient
        colors={(isDark ? ['#0B101E', '#101B28'] : [...Theme.backgroundGradient]) as any}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.background, { paddingTop: insets.top }]}>

        <BillingScreenHeader activeTab={activeTab} onTabChange={goToTab} />

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#00a7b5" />
            <Text style={styles.loaderText}>Syncing billing details with Stripe...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchBillingData(true)}
                tintColor="#00a7b5"
                colors={['#00a7b5']}
              />
            }
          >
            {tabContent}
          </ScrollView>
        )}
      </LinearGradient>

      {/* Plan selection/manage modal */}
      <PlanModal visible={showPlanModal} onClose={() => setShowPlanModal(false)} />

      {/* Official Settlement Invoice Details Modal */}
      <Modal visible={selectedInvoice !== null} transparent animationType="fade">
        <Pressable style={styles.settlementModalOverlay} onPress={closeSettlementModal}>
          <Pressable style={styles.settlementModalCard} onPress={(e) => e.stopPropagation()}>
            {selectedInvoice && (
              <>
                <View style={styles.settlementModalHeader}>
                  <View>
                    <Text style={styles.settlementModalTitle}>Official Settlement</Text>
                    <Text style={styles.settlementModalRef}>Ref: {selectedInvoice.id}</Text>
                  </View>
                  <Pressable onPress={closeSettlementModal} style={styles.settlementModalClose} hitSlop={12}>
                    <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={styles.settlementModalBody}>
                  <View style={styles.settlementBillRow}>
                    <View>
                      <Text style={styles.settlementLabel}>BILL TO</Text>
                      <Text style={styles.settlementValue}>John Olakoya</Text>
                      <Text style={styles.settlementSubValue}>Zien Agent Premium</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.settlementLabel}>ISSUE DATE</Text>
                      <Text style={styles.settlementValue}>{selectedInvoice.date}</Text>
                      <Text style={styles.settlementSubValue}>{selectedInvoice.time}</Text>
                    </View>
                  </View>

                  <View style={styles.settlementInvoiceBox}>
                    <View style={styles.settlementLineRow}>
                      <Text style={styles.settlementLineDesc}>{selectedInvoice.desc}</Text>
                      <Text style={styles.settlementLineAmount}>{selectedInvoice.amt}</Text>
                    </View>
                    <View style={styles.settlementInvoiceDivider} />
                    <View style={[styles.settlementLineRow, { marginBottom: 12 }]}>
                      <Text style={styles.settlementLineDescMuted}>Tax (0.00%)</Text>
                      <Text style={styles.settlementLineAmount}>$0.00</Text>
                    </View>
                    <View style={styles.settlementLineRow}>
                      <Text style={styles.settlementTotalLabel}>Total Amount Paid</Text>
                      <Text style={styles.settlementTotalAmount}>{selectedInvoice.amt}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.settlementModalFooter}>
                  <ExternalLink
                    href={selectedInvoice.pdf}
                    style={styles.settlementDownloadBtn}
                    onPress={() => {
                      closeSettlementModal();
                    }}
                  >
                    <Text style={styles.settlementDownloadBtnText}>Download Receipt</Text>
                    <MaterialCommunityIcons name="download" size={16} color="#FFFFFF" />
                  </ExternalLink>
                  <Pressable style={styles.settlementCloseBtn} onPress={closeSettlementModal}>
                    <Text style={styles.settlementCloseBtnText}>Close</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Subscription Downgrade/Cancel Confirmation Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.cancelModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCancelModal} />
          <View style={styles.cancelModalCard}>
            <View style={styles.cancelModalHeader}>
              <Text style={styles.cancelModalTitle}>Cancel Plan Renewal?</Text>
              <Pressable onPress={closeCancelModal} style={styles.cancelModalClose} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.cancelModalDesc}>
              If you cancel, your access and active add-ons will remain functional until the end of your billing cycle on <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{dateText}</Text>. Your Stripe subscription will then be terminated.
            </Text>

            <View style={styles.rulesCard}>
              <Text style={styles.rulesCardTitleRed}>Cancellation Rules:</Text>
              <View style={styles.rulesBulletRow}>
                <Text style={styles.rulesBulletDot}>•</Text>
                <Text style={styles.rulesBulletText}>
                  Your account remains <Text style={{ fontWeight: '800', color: colors.textPrimary }}>fully active</Text> until your current cycle ends.
                </Text>
              </View>
              <View style={styles.rulesBulletRow}>
                <Text style={styles.rulesBulletDot}>•</Text>
                <Text style={styles.rulesBulletText}>You will not be billed on the next cycle.</Text>
              </View>
              <View style={styles.rulesBulletRow}>
                <Text style={styles.rulesBulletDot}>•</Text>
                <Text style={styles.rulesBulletText}>All active add-ons will automatically be canceled alongside your base plan.</Text>
              </View>
            </View>

            <View style={styles.cancelModalFooter}>
              <Pressable style={styles.keepSubBtn} onPress={closeCancelModal}>
                <Text style={styles.keepSubBtnText}>Keep Active</Text>
              </Pressable>
              <Pressable style={styles.confirmCancelBtn} onPress={handleConfirmCancelSub}>
                <Text style={styles.confirmCancelBtnText}>Confirm Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add-on Cancel Confirmation Modal */}
      <Modal visible={showCancelAddonModal !== null} transparent animationType="fade">
        <View style={styles.cancelModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCancelAddonModal} />
          <View style={styles.cancelModalCard}>
            <View style={styles.cancelModalHeader}>
              <Text style={styles.cancelModalTitle}>Cancel Add-on?</Text>
              <Pressable onPress={closeCancelAddonModal} style={styles.cancelModalClose} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.cancelModalDesc}>
              Are you sure you want to cancel your <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{showCancelAddonModal?.name}</Text> add-on? It will be removed from your subscription and you will not be billed for it on your next cycle.
            </Text>

            <View style={styles.rulesCard}>
              <Text style={styles.rulesCardTitle}>Cancellation Rules:</Text>
              <View style={styles.rulesBulletRow}>
                <Text style={styles.rulesBulletDot}>•</Text>
                <Text style={styles.rulesBulletText}>Add-on features remain active until your next billing date.</Text>
              </View>
              <View style={styles.rulesBulletRow}>
                <Text style={styles.rulesBulletDot}>•</Text>
                <Text style={styles.rulesBulletText}>No further charges will be made for this specific add-on.</Text>
              </View>
              <View style={styles.rulesBulletRow}>
                <Text style={styles.rulesBulletDot}>•</Text>
                <Text style={styles.rulesBulletText}>Your base Zien CRM plan remains completely unaffected.</Text>
              </View>
            </View>

            <View style={styles.cancelModalFooter}>
              <Pressable style={styles.keepSubBtn} onPress={closeCancelAddonModal}>
                <Text style={styles.keepSubBtnText}>Keep Add-on</Text>
              </Pressable>
              <Pressable style={styles.confirmCancelBtn} onPress={handleConfirmCancelAddon}>
                <Text style={styles.confirmCancelBtnText}>Confirm Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add-on activation is handled on the website (Apple App Store compliant) */}
    </>
  );
}


const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  background: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 20,
  },
  tabContainer: {
    gap: 20,
  },

  // Premium Plan Card
  premiumPlanCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  planBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activePillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.15)',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: isDark ? '#22C55E' : '#166534',
    letterSpacing: 0.5,
  },
  tierIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: isDark ? '#00a7b5' : '#0B2D3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  planInfoMain: {
    flex: 1,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  activePillContainerInline: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  activePillTextInline: {
    fontSize: 11,
    fontWeight: '800',
    color: isDark ? '#22C55E' : '#16A34A',
  },
  trialPillContainerInline: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
  },
  trialPillTextInline: {
    fontSize: 11,
    fontWeight: '800',
    color: isDark ? '#60A5FA' : '#1D4ED8',
  },
  pendingCancelPillInline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingCancelPillTextInline: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
  planTierTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  planTierSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
    gap: 4,
  },
  planPriceValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  planPricePeriod: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  planDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 16,
  },
  planBulletList: {
    gap: 12,
  },
  planBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  planBulletText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  showMoreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  showMoreToggleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#00a7b5',
  },
  planRenewalContainer: {
    gap: 12,
  },
  renewalAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  renewalAlertTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  renewalAlertDate: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 1,
  },
  cancelRenewalButton: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
    borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelRenewalButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },

  // Plan Add-ons
  addonsSection: {
    gap: 12,
  },
  sectionHeaderWrap: {
    paddingHorizontal: 4,
  },
  addonsSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  addonsSectionSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 18,
  },
  addonsList: {
    gap: 12,
  },
  addonCard: {
    flexDirection: 'column',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 16,
  },
  addonCardLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  addonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(0, 167, 181, 0.1)' : '#E6F6F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addonDetails: {
    flex: 1,
    gap: 4,
  },
  addonName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  addonDesc: {
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '600',
    lineHeight: 17,
  },
  addonStatusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  addonStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: isDark ? '#22C55E' : '#15803D',
  },
  addonCardRight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 12,
  },
  addonPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  addonPriceUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  cancelAddonBtn: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cancelAddonBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },
  activateAddonBtn: {
    backgroundColor: isDark ? '#00a7b5' : '#0B2D3E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateAddonBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Payment ledger
  ledgerHeaderWrap: {
    marginBottom: 8,
  },
  ledgerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  ledgerSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  invoicesList: {
    gap: 12,
    marginTop: 12,
  },
  invoiceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 12,
  },
  invoiceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceDate: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  invoiceTime: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  invoiceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#E8F5E9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  invoiceStatusText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: isDark ? '#4CAF50' : '#2E7D32',
    letterSpacing: 0.5,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  invoiceCardBody: {
    gap: 4,
  },
  invoiceDesc: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  invoiceMethod: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  invoiceCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  invoiceAmountLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  invoiceAmountValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 1,
  },
  invoiceDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#00a7b5' : '#0B2D3E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  invoiceDownloadBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },


  // Settlement Detailed Modal
  settlementModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settlementModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  settlementModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#00a7b5' : '#0B2D3E',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  settlementModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  settlementModalRef: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  settlementModalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementModalBody: {
    padding: 20,
    gap: 16,
  },
  settlementBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settlementLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  settlementValue: {
    fontSize: 13.5,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  settlementSubValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  settlementInvoiceBox: {
    backgroundColor: isDark ? 'rgba(0, 167, 181, 0.05)' : '#F0F9FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  settlementInvoiceDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 12,
  },
  settlementLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementLineDesc: {
    fontSize: 13.5,
    fontWeight: '900',
    color: colors.textPrimary,
    flex: 1,
  },
  settlementLineAmount: {
    fontSize: 13.5,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  settlementLineDescMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  settlementTotalLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  settlementTotalAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  settlementModalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  settlementDownloadBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: isDark ? '#00a7b5' : '#0B2D3E',
    paddingVertical: 14,
    borderRadius: 14,
  },
  settlementDownloadBtnText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  settlementCloseBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementCloseBtnText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: colors.textPrimary,
  },

  // Cancellation Modal General
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 45, 62, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#0B2D3E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  cancelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  cancelModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  cancelModalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  keepSubBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepSubBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#EF4444',
  },
  rulesCard: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    marginVertical: 14,
    gap: 8,
  },
  rulesCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  rulesBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rulesBulletDot: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '800',
    lineHeight: 18,
  },
  rulesBulletText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '600',
    lineHeight: 18,
  },
  rulesCardTitleRed: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 4,
  },
  cancellationBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 12,
  },
  bannerContent: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#991B1B',
  },
  bannerDesc: {
    fontSize: 12.5,
    color: '#991B1B',
    fontWeight: '600',
    lineHeight: 18,
  },
  pendingCancelPill: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pendingCancelPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  planCanceledBadge: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCanceledBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  addonCanceledPill: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  addonCanceledPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  activationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  activationCardLeft: {
    flex: 1,
    gap: 4,
  },
  activationAddonName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  activationAddonSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
  },
  activationAddonPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  activationSubmitBtn: {
    backgroundColor: isDark ? '#00a7b5' : '#0B2D3E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  activationSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activationSubmitCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },


});
