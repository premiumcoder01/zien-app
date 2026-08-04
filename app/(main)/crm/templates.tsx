import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { CRMTemplate, deleteCRMTemplate, duplicateCRMTemplate, getCRMTemplates, patchCRMTemplateStatus, renderCRMTemplate } from '@/services/crmService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const generateEmailHtml = (components: any[], theme: string) => {
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#f1f5f9';
    const cardBgColor = isDark ? '#1e293b' : '#ffffff';
    const textColor = isDark ? '#cbd5e1' : '#334155';
    const headingColor = isDark ? '#ffffff' : '#0f172a';
    const borderColor = isDark ? '#334155' : '#e2e8f0';
    const subtextColor = isDark ? '#94a3b8' : '#64748b';

    const replaceTokens = (text: string) => {
        if (!text) return '';
        return text
            .replace(/\{\{\s*name\s*\}\}/gi, 'Jessica Miller')
            .replace(/\{\{\s*property\s*\}\}/gi, 'Malibu Oceanview Estate')
            .replace(/\{\{\s*company\s*\}\}/gi, 'Zien Realty');
    };

    let bodyHtml = '';

    components.forEach((comp: any) => {
        if (comp.type === 'Branding') {
            const brandColor = comp.brandColor || '#3B82F6';
            bodyHtml += `
                <div style="border-top: 4px solid ${brandColor}; padding-top: 12px; border-bottom: 1px solid ${borderColor}; padding-bottom: 12px; margin-bottom: 16px;">
                    <div style="font-size: 18px; font-weight: 800; color: ${headingColor};">${comp.content || 'Elite Realty Group'}</div>
                    ${comp.subtext ? `<div style="font-size: 11px; color: ${subtextColor}; margin-top: 2px;">${comp.subtext}</div>` : ''}
                </div>
            `;
        } else if (comp.type === 'Property Header') {
            bodyHtml += `
                <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 16px; color: #ffffff; font-family: sans-serif;">
                    <div style="font-size: 24px; margin-bottom: 8px;">🏢</div>
                    <div style="font-size: 14px; font-weight: 800; letter-spacing: 1px; color: #2dd4bf; margin-bottom: 4px;">EXQUISITE PROPERTY FEATURE</div>
                    <div style="font-size: 12px; color: #94a3b8;">Curated Luxury by Zien</div>
                </div>
            `;
        } else if (comp.type === 'Text Block') {
            bodyHtml += `
                <div style="font-size: 15px; line-height: 1.6; color: ${textColor}; margin-bottom: 16px; font-family: sans-serif;">
                    ${replaceTokens(comp.content)}
                </div>
            `;
        } else if (comp.type === 'CTA Button') {
            bodyHtml += `
                <div style="text-align: center; margin-bottom: 16px; margin-top: 16px;">
                    <a href="#" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-family: sans-serif;">
                        ${comp.content}
                    </a>
                </div>
            `;
        } else if (comp.type === 'Page Link') {
            bodyHtml += `
                <div style="display: flex; align-items: center; padding: 12px; border: 1px solid ${borderColor}; border-radius: 8px; margin-bottom: 12px; background-color: ${isDark ? '#1e293b' : '#ffffff'}; font-family: sans-serif;">
                    <span style="color: #0d9488; font-weight: bold; margin-right: 8px;">🔗</span>
                    <span style="font-size: 13px; color: ${textColor}; flex-grow: 1;">${comp.content || 'Visit Page'}</span>
                    <span style="color: ${subtextColor}; margin-left: auto;">&gt;</span>
                </div>
            `;
        } else if (comp.type === 'Spacer') {
            const heightVal = parseInt(comp.content) || 16;
            bodyHtml += `<div style="height: ${heightVal}px;"></div>`;
        } else if (comp.type === 'Property Details') {
            bodyHtml += `
                <div style="padding: 16px; background-color: ${isDark ? '#1e293b' : '#f8fafc'}; border: 1px solid ${borderColor}; border-radius: 12px; margin-bottom: 16px; font-family: sans-serif;">
                    <div style="font-size: 16px; font-weight: 700; color: ${headingColor}; margin-bottom: 4px;">${comp.content || 'Malibu Oceanview Estate'}</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0d9488; margin-bottom: 4px;">${comp.price || '$5,450,000'}</div>
                    <div style="font-size: 12px; color: ${subtextColor}; margin-bottom: 4px;">${comp.specs || '5 Beds • 6 Baths • 4,500 SqFt'}</div>
                    ${comp.address ? `<div style="font-size: 12px; color: ${subtextColor};">${comp.address}</div>` : ''}
                </div>
            `;
        } else if (comp.type === 'Document Attachment') {
            bodyHtml += `
                <div style="display: flex; align-items: center; padding: 12px; border: 1px dashed ${borderColor}; border-radius: 10px; margin-bottom: 16px; background-color: ${isDark ? '#1e293b' : '#f8fafc'}; font-family: sans-serif;">
                    <span style="font-size: 20px; margin-right: 10px;">📄</span>
                    <div style="flex-grow: 1; text-align: left;">
                        <div style="font-size: 13px; font-weight: 600; color: ${headingColor};">${comp.content || 'Brochure.pdf'}</div>
                        <div style="font-size: 11px; color: ${subtextColor};">2.4 MB • PDF Document</div>
                    </div>
                    <span style="font-size: 16px; color: ${subtextColor}; margin-left: auto;">⬇️</span>
                </div>
            `;
        } else if (comp.type === 'Email Signature') {
            let socialHtml = '';
            if (comp.socialLinks && comp.socialLinks.length > 0) {
                socialHtml += '<div style="display: flex; gap: 8px; margin-top: 8px;">';
                comp.socialLinks.forEach((social: any) => {
                    socialHtml += `
                        <span style="display: inline-block; padding: 4px 8px; font-size: 10px; background-color: ${isDark ? '#334155' : '#f1f5f9'}; color: ${textColor}; border-radius: 4px; font-weight: bold; font-family: sans-serif;">
                            ${social.platform.toUpperCase()}
                        </span>
                    `;
                });
                socialHtml += '</div>';
            }

            bodyHtml += `
                <div style="margin-top: 24px; border-top: 1px solid ${borderColor}; padding-top: 16px; font-family: sans-serif;">
                    <div style="font-size: 13px; color: ${subtextColor}; line-height: 1.5;">${comp.content}</div>
                    ${socialHtml}
                </div>
            `;
        }
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    background-color: ${bgColor};
                    margin: 0;
                    padding: 8px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .card {
                    background-color: ${cardBgColor};
                    border-radius: 16px;
                    padding: 16px;
                    border: 1px solid ${borderColor};
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                    max-width: 600px;
                    margin: 0 auto;
                }
                /* Formatting styling within text block content */
                p {
                    margin-top: 0;
                    margin-bottom: 12px;
                }
                p:last-child {
                    margin-bottom: 0;
                }
                strong {
                    color: ${headingColor};
                    font-weight: 700;
                }
                ul {
                    margin: 0 0 12px 20px;
                    padding: 0;
                }
                li {
                    margin-bottom: 6px;
                    color: ${textColor};
                }
            </style>
        </head>
        <body>
            <div class="card">
                ${bodyHtml}
            </div>
        </body>
        </html>
    `;
};

export default function CRM_TemplatesScreen() {
    const { colors, theme } = useAppTheme();
    const styles = getStyles(colors, theme);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { accessToken } = useAuth();

    const { data: templateList, isLoading, refetch } = useQuery({
        queryKey: ['crmTemplates'],
        queryFn: () => getCRMTemplates(accessToken || ''),
        enabled: !!accessToken,
    });

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [webOnlyModalVisible, setWebOnlyModalVisible] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<CRMTemplate | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    useEffect(() => {
        async function fetchPreview() {
            if (!previewTemplate || !accessToken) {
                setPreviewHtml(null);
                return;
            }
            if (previewTemplate.template_type.toUpperCase() !== 'EMAIL') {
                setPreviewHtml(null);
                return;
            }

            try {
                setLoadingPreview(true);
                const html = await renderCRMTemplate(accessToken, previewTemplate.content_json);
                setPreviewHtml(html);
            } catch (error) {
                console.error('Failed to load template preview:', error);
                setPreviewHtml(null);
            } finally {
                setLoadingPreview(false);
            }
        }
        fetchPreview();
    }, [previewTemplate, accessToken]);

    const queryClient = useQueryClient();

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: number }) =>
            patchCRMTemplateStatus(accessToken || '', id, status),
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['crmTemplates'] });
            const previousTemplates = queryClient.getQueryData<CRMTemplate[]>(['crmTemplates']);
            queryClient.setQueryData<CRMTemplate[]>(['crmTemplates'], (old) => {
                if (!old) return [];
                return old.map((t) => (t.id === id ? { ...t, status } : t));
            });
            return { previousTemplates };
        },
        onError: (error: any, variables, context) => {
            if (context?.previousTemplates) {
                queryClient.setQueryData(['crmTemplates'], context.previousTemplates);
            }
            const errorMsg = error?.message || 'Failed to update status. Please try again.';
            Alert.alert('Cannot Modify Status', errorMsg);
            console.error('[patchCRMTemplateStatus error]', error);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['crmTemplates'] });
        }
    });

    const toggleTemplateStatus = (id: string, newStatus: number) => {
        statusMutation.mutate({ id, status: newStatus });
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteCRMTemplate(accessToken || '', id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crmTemplates'] });
            setConfirmDeleteVisible(false);
            setTemplateToDelete(null);
            Alert.alert('Success', 'Template deleted successfully.');
        },
        onError: (error) => {
            Alert.alert('Error', 'Failed to delete template. Please try again.');
            console.error(error);
        }
    });

    const deleteTemplate = (id: string) => {
        setTemplateToDelete(id);
        setConfirmDeleteVisible(true);
    };

    const handleConfirmDelete = () => {
        if (templateToDelete) {
            deleteMutation.mutate(templateToDelete);
        }
    };

    const duplicateMutation = useMutation({
        mutationFn: async (id: string) => {
            const duplicated = await duplicateCRMTemplate(accessToken || '', id);
            if (duplicated && duplicated.id) {
                try {
                    await patchCRMTemplateStatus(accessToken || '', duplicated.id, 0);
                } catch (e) {
                    await patchCRMTemplateStatus(accessToken || '', duplicated.id, 2).catch(() => {});
                }
            }
            return duplicated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crmTemplates'] });
            Alert.alert('Success', 'Template duplicated as Draft.');
        },
        onError: (error) => {
            Alert.alert('Error', 'Failed to duplicate template. Please try again.');
            console.error(error);
        }
    });

    const handleDuplicateTemplate = (id: string) => {
        duplicateMutation.mutate(id);
    };

    const handleSelectTemplateType = () => {
        setCreateModalVisible(false);
        setTimeout(() => {
            setWebOnlyModalVisible(true);
        }, 300);
    };

    const getChannelConfig = (type: string) => {
        const upper = type.toUpperCase();
        if (upper === 'EMAIL') return {
            icon: 'email-outline' as const,
            color: '#3B82F6', // Vibrant Royal Blue
            gradientColors: ['#3B82F6', '#60A5FA'],
            label: 'Email',
            accentBorder: 'rgba(59,130,246,0.3)',
        };
        if (upper === 'SMS') return {
            icon: 'message-text-outline' as const,
            color: '#7C3AED', // Vibrant Violet
            gradientColors: ['#7C3AED', '#A78BFA'],
            label: 'SMS',
            accentBorder: 'rgba(124,58,237,0.3)',
        };
        return {
            icon: 'whatsapp' as const,
            color: '#10B981', // Vibrant Emerald Green
            gradientColors: ['#10B981', '#34D399'],
            label: 'WhatsApp',
            accentBorder: 'rgba(16,185,129,0.3)',
        };
    };

    const renderPreviewContent = (template: CRMTemplate) => {
        const type = template.template_type.toUpperCase();
        const components = template.content_json?.components || [];

        const replaceTokens = (text: string) => {
            if (!text) return '';
            return text
                .replace(/\{\{\s*name\s*\}\}/gi, 'Jessica Miller')
                .replace(/\{\{\s*property\s*\}\}/gi, 'Malibu Oceanview Estate')
                .replace(/\{\{\s*company\s*\}\}/gi, 'Zien Realty');
        };

        if (type === 'EMAIL') {
            return (
                <View style={styles.emailPreviewContainer}>
                    {/* Mock Email Header */}
                    <View style={styles.emailMetaHeader}>
                        <View style={styles.emailMetaRow}>
                            <Text style={styles.emailMetaLabel}>To:</Text>
                            <Text style={styles.emailMetaVal}>Jessica Miller <Text style={{ color: '#94A3B8' }}>(jessica.m@example.com)</Text></Text>
                        </View>
                        <View style={styles.emailMetaRow}>
                            <Text style={styles.emailMetaLabel}>From:</Text>
                            <Text style={styles.emailMetaVal}>Jordan Smith <Text style={{ color: '#94A3B8' }}>(jordan@zienrealty.com)</Text></Text>
                        </View>
                        <View style={styles.emailMetaRow}>
                            <Text style={styles.emailMetaLabel}>Subject:</Text>
                            <Text style={[styles.emailMetaVal, { fontWeight: '700', color: theme === 'dark' ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                                {replaceTokens(template.subject || 'Hi Jessica, Welcome to Malibu Oceanview Estate!')}
                            </Text>
                        </View>
                    </View>

                    {/* Email Body rendered via WebView */}
                    <View style={styles.emailBodyContainer}>
                        {loadingPreview ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={colors.accentTeal} />
                            </View>
                        ) : (
                            <WebView
                                originWhitelist={['*']}
                                source={{ html: previewHtml || generateEmailHtml(components, theme) }}
                                style={{ flex: 1, backgroundColor: 'transparent' }}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                </View>
            );
        }

        if (type === 'SMS') {
            return (
                <View style={styles.smsPreviewContainer}>
                    {/* iMessage Style Header */}
                    <View style={styles.smsHeader}>
                        <MaterialCommunityIcons name="chevron-left" size={24} color="#007AFF" />
                        <View style={{ alignItems: 'center' }}>
                            <View style={styles.smsAvatar}>
                                <Text style={styles.smsAvatarText}>JM</Text>
                            </View>
                            <Text style={styles.smsContactName}>Jessica Miller</Text>
                        </View>
                        <MaterialCommunityIcons name="phone-outline" size={20} color="#007AFF" />
                    </View>

                    {/* Chat Area */}
                    <ScrollView style={styles.smsChatArea} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                        <Text style={styles.smsDateStamp}>Today 1:14 PM</Text>
                        
                        {components.map((comp: any, index: number) => {
                            if (comp.type === 'Text Block') {
                                return (
                                    <View key={index} style={styles.smsBubbleContainer}>
                                        <View style={styles.smsBubble}>
                                            <Text style={styles.smsBubbleText}>
                                                {replaceTokens(comp.content)}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            }
                            if (comp.type === 'CTA Button' || comp.type === 'Page Link') {
                                return (
                                    <View key={index} style={styles.smsBubbleContainer}>
                                        <View style={styles.smsBubbleLink}>
                                            <View style={styles.smsLinkPreviewHeader}>
                                                <MaterialCommunityIcons name="link-variant" size={16} color="#007AFF" />
                                                <Text style={styles.smsLinkPreviewTitle}>{comp.content || 'Interactive Link'}</Text>
                                            </View>
                                            <Text style={styles.smsLinkUrlText} numberOfLines={1}>{comp.linkUrl || 'zien.ai/l/10293'}</Text>
                                        </View>
                                    </View>
                                );
                            }
                            if (comp.type === 'Spacer') {
                                const heightVal = parseInt(comp.content) || 12;
                                return <View key={index} style={{ height: heightVal }} />;
                            }
                            return null;
                        })}
                        <Text style={[styles.smsTimeText, { alignSelf: 'flex-start', marginLeft: 12 }]}>Delivered</Text>
                    </ScrollView>

                    {/* iMessage Input Footer */}
                    <View style={[styles.smsInputFooter, { paddingBottom: Math.max(10, insets.bottom) }]}>
                        <MaterialCommunityIcons name="camera-outline" size={24} color="#8E8E93" />
                        <View style={styles.smsInputField}>
                            <Text style={{ color: '#C7C7CC', fontSize: 14 }}>Text Message</Text>
                            <View style={styles.smsSendBtnCircle}>
                                <MaterialCommunityIcons name="arrow-up" size={14} color="#FFFFFF" />
                            </View>
                        </View>
                    </View>
                </View>
            );
        }

        // WhatsApp Design
        return (
            <View style={styles.waPreviewContainer}>
                {/* WhatsApp Header */}
                <View style={styles.waHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
                        <View style={styles.waAvatar}>
                            <Text style={styles.waAvatarText}>JM</Text>
                        </View>
                        <View>
                            <Text style={styles.waContactName}>Jessica Miller</Text>
                            <Text style={styles.waStatus}>online</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <MaterialCommunityIcons name="video" size={20} color="#FFFFFF" />
                        <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
                        <MaterialCommunityIcons name="dots-vertical" size={20} color="#FFFFFF" />
                    </View>
                </View>

                {/* WhatsApp Chat Body */}
                <View style={styles.waBackgroundWrapper}>
                    <ScrollView style={styles.waChatArea} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                        <View style={styles.waDateBadge}>
                            <Text style={styles.waDateBadgeText}>TODAY</Text>
                        </View>

                        {components.map((comp: any, index: number) => {
                            if (comp.type === 'Text Block') {
                                return (
                                    <View key={index} style={styles.waBubbleContainer}>
                                        <View style={styles.waBubble}>
                                            <Text style={styles.waBubbleText}>
                                                {replaceTokens(comp.content)}
                                            </Text>
                                            <View style={styles.waBubbleFooter}>
                                                <Text style={styles.waTimeText}>1:14 PM</Text>
                                                <MaterialCommunityIcons name="check-all" size={14} color="#34B7F1" style={{ marginLeft: 3 }} />
                                            </View>
                                        </View>
                                    </View>
                                );
                            }
                            if (comp.type === 'CTA Button' || comp.type === 'Page Link') {
                                return (
                                    <View key={index} style={styles.waBubbleContainer}>
                                        <View style={styles.waTemplateButtonContainer}>
                                            <View style={styles.waBubble}>
                                                <Text style={[styles.waBubbleText, { fontStyle: 'italic', color: theme === 'dark' ? '#8696A0' : '#667781', fontSize: 13 }]}>
                                                    Template Action
                                                </Text>
                                                <View style={styles.waBubbleFooter}>
                                                    <Text style={styles.waTimeText}>1:14 PM</Text>
                                                    <MaterialCommunityIcons name="check-all" size={14} color="#34B7F1" style={{ marginLeft: 3 }} />
                                                </View>
                                            </View>
                                            <Pressable style={styles.waTemplateActionBtn}>
                                                <MaterialCommunityIcons name={comp.type === 'CTA Button' ? 'open-in-new' : 'link-variant'} size={14} color="#00A884" style={{ marginRight: 6 }} />
                                                <Text style={styles.waTemplateActionBtnText}>{comp.content || 'Click Here'}</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                );
                            }
                            if (comp.type === 'Social Links') {
                                return (
                                    <View key={index} style={styles.waBubbleContainer}>
                                        <View style={styles.waBubble}>
                                            <Text style={[styles.waBubbleText, { fontWeight: '700', color: theme === 'dark' ? '#25D366' : '#00A884', fontSize: 13, marginBottom: 4 }]}>
                                                {comp.content || 'Follow our updates'}
                                            </Text>
                                            {(comp.socialLinks || []).map((social: any, sIdx: number) => (
                                                <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 3 }}>
                                                    <MaterialCommunityIcons name={social.platform === 'instagram' ? 'instagram' : 'facebook'} size={14} color={theme === 'dark' ? '#8696A0' : '#50606B'} />
                                                    <Text style={{ fontSize: 12, color: theme === 'dark' ? '#E9EDEF' : '#303030' }}>{social.platform}</Text>
                                                </View>
                                            ))}
                                            <View style={styles.waBubbleFooter}>
                                                <Text style={styles.waTimeText}>1:14 PM</Text>
                                                <MaterialCommunityIcons name="check-all" size={14} color="#34B7F1" style={{ marginLeft: 3 }} />
                                            </View>
                                        </View>
                                    </View>
                                );
                            }
                            if (comp.type === 'Spacer') {
                                const heightVal = parseInt(comp.content) || 12;
                                return <View key={index} style={{ height: heightVal }} />;
                            }
                            return null;
                        })}
                    </ScrollView>
                </View>

                {/* WhatsApp Input Footer */}
                <View style={[styles.waInputFooter, { paddingBottom: Math.max(8, insets.bottom) }]}>
                    <View style={styles.waInputField}>
                        <MaterialCommunityIcons name="emoticon-happy-outline" size={22} color="#8E8E93" />
                        <Text style={{ color: '#8E8E93', fontSize: 15, flex: 1, marginLeft: 8 }}>Message</Text>
                        <MaterialCommunityIcons name="paperclip" size={20} color="#8E8E93" style={{ marginRight: 12 }} />
                        <MaterialCommunityIcons name="camera" size={22} color="#8E8E93" />
                    </View>
                    <View style={styles.waMicBtn}>
                        <MaterialCommunityIcons name="microphone" size={20} color="#FFFFFF" />
                    </View>
                </View>
            </View>
        );
    };

    const renderTemplateCard = (template: CRMTemplate) => {
        const channel = getChannelConfig(template.template_type);
        const isActive = template.status === 1;

        const firstTextBlock = template.content_json?.components?.find(
            (c: any) => c.type === 'Text Block'
        )?.content || 'No preview available';
        const previewText = template.subject || firstTextBlock;

        return (
            <View key={template.id} style={styles.card}>
                {/* Subtle top accent line */}
                <View style={[styles.cardAccentLine, { backgroundColor: channel.color }]} />

                {/* Card Header */}
                <View style={styles.cardHeader}>
                    {/* Channel badge + name */}
                    <View style={styles.channelBadge}>
                        <LinearGradient
                            colors={channel.gradientColors as any}
                            style={styles.channelIconGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <MaterialCommunityIcons name={channel.icon} size={18} color="#FFFFFF" />
                        </LinearGradient>
                        <View style={[styles.channelTypeTag, { borderColor: channel.color + '40', backgroundColor: channel.color + '0F' }]}>
                            <View style={[styles.channelDot, { backgroundColor: channel.color }]} />
                            <Text style={[styles.channelTypeText, { color: channel.color }]}>{channel.label}</Text>
                        </View>
                    </View>

                    {/* Action icons */}
                    <View style={styles.actionGroup}>
                        <Pressable
                            onPress={() => {
                                setPreviewTemplate(template);
                                setPreviewVisible(true);
                            }}
                            hitSlop={8}
                            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                        >
                            <MaterialCommunityIcons name="eye-outline" size={14} color={colors.textSecondary} />
                        </Pressable>
                        <Pressable
                            onPress={() => handleDuplicateTemplate(template.id)}
                            hitSlop={8}
                            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                            disabled={duplicateMutation.isPending}
                        >
                            {duplicateMutation.isPending && duplicateMutation.variables === template.id ? (
                                <ActivityIndicator size="small" color={colors.accentTeal} style={{ transform: [{ scale: 0.7 }] }} />
                            ) : (
                                <MaterialCommunityIcons name="content-copy" size={14} color={colors.textSecondary} />
                            )}
                        </Pressable>
                        <Pressable
                            onPress={() => deleteTemplate(template.id)}
                            hitSlop={8}
                            style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, pressed && styles.actionBtnPressed]}
                        >
                            <MaterialCommunityIcons name="trash-can-outline" size={14} color="#F87171" />
                        </Pressable>
                    </View>
                </View>

                {/* Template Name */}
                <Text style={styles.templateName} numberOfLines={1}>{template.name}</Text>

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Subject Block (Full Width) */}
                <View style={styles.fullWidthMetaBlock}>
                    <Text style={styles.metaLabel}>SUBJECT</Text>
                    <Text style={styles.metaValue} numberOfLines={3}>{previewText}</Text>
                </View>

                {/* Bottom Row containing Edit Template (left) and Status (right) */}
                <View style={styles.bottomActionsRow}>
                    {/* Edit Button */}
                    <Pressable
                        style={({ pressed }) => [styles.inlineEditBtn, pressed && styles.editBtnPressed]}
                        onPress={() => setWebOnlyModalVisible(true)}
                    >
                        <Text style={styles.inlineEditBtnText}>Edit Template</Text>
                        <MaterialCommunityIcons name="pencil-outline" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </Pressable>

                    {/* Status Pill */}
                    <Pressable
                        style={[
                            styles.inlineStatusPill,
                            { borderColor: isActive ? '#34D39950' : 'rgba(148,163,184,0.3)' }
                        ]}
                        onPress={() => toggleTemplateStatus(template.id, isActive ? 2 : 1)}
                    >
                        <Text style={styles.statusLabelMini}>STATUS</Text>
                        <View style={styles.statusSwitchRow} pointerEvents="none">
                            <Switch
                                value={isActive}
                                onValueChange={(val) => toggleTemplateStatus(template.id, val ? 1 : 2)}
                                trackColor={{ false: 'rgba(148,163,184,0.15)', true: 'rgba(16,185,129,0.25)' }}
                                thumbColor={isActive ? '#10B981' : '#94A3B8'}
                                ios_backgroundColor="rgba(148,163,184,0.12)"
                                style={{ transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }] }}
                            />
                            <Text style={[
                                styles.inlineStatusText,
                                { color: isActive ? '#10B981' : '#64748B' }
                            ]}>
                                {isActive ? 'Active' : 'Draft'}
                            </Text>
                        </View>
                    </Pressable>
                </View>
            </View>
        );
    };

    return (
        <LinearGradient
            colors={colors.backgroundGradient as any}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            <PageHeader
                title="Templates"
                subtitle="Set once, and let Zien nurture your leads based on time and behavior."
                onBack={() => router.back()}
            />

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentTeal} />
                }
            >

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.accentTeal} />
                        <Text style={styles.loadingText}>Loading templates…</Text>
                    </View>
                ) : templateList && templateList.length > 0 ? (
                    templateList.map(renderTemplateCard)
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconWrap}>
                            <MaterialCommunityIcons name="file-document-outline" size={36} color={colors.accentTeal} />
                        </View>
                        <Text style={styles.emptyTitle}>No templates yet</Text>
                        <Text style={styles.emptySubtitle}>Tap the + button to create your first template</Text>
                    </View>
                )}
            </ScrollView>

            {/* FAB */}
            <Pressable
                style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 28 }, pressed && styles.fabPressed]}
                onPress={() => setCreateModalVisible(true)}
            >
                <LinearGradient
                    colors={['#0D9488', '#2DD4BF']}
                    style={styles.fabGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
                </LinearGradient>
            </Pressable>

            {/* ── DELETE CONFIRM MODAL ── */}
            <Modal visible={confirmDeleteVisible} transparent animationType="fade" onRequestClose={() => setConfirmDeleteVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.centeredModal}>
                        <View style={styles.dangerIconRing}>
                            <View style={styles.dangerIconInner}>
                                <MaterialCommunityIcons name="trash-can-outline" size={28} color="#F87171" />
                            </View>
                        </View>
                        <Text style={styles.modalTitle}>Delete Template?</Text>
                        <Text style={styles.modalBody}>
                            This template will be permanently removed and cannot be recovered.
                        </Text>
                        <View style={styles.modalBtnRow}>
                            <Pressable style={styles.ghostBtn} onPress={() => setConfirmDeleteVisible(false)} disabled={deleteMutation.isPending}>
                                <Text style={styles.ghostBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.dangerBtn} onPress={handleConfirmDelete} disabled={deleteMutation.isPending}>
                                {deleteMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.dangerBtnText}>Delete</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

                  {/* ── CREATE MODAL ── */}
            <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
                <View style={styles.bottomSheetOverlay}>
                    <View style={[styles.sheetModal, { paddingBottom: Math.max(28, insets.bottom + 16) }]}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeader}>
                            <View>
                                <Text style={styles.sheetTitle}>New Template</Text>
                                <Text style={styles.sheetSub}>Choose a channel to get started</Text>
                            </View>
                            <Pressable style={styles.closeCircle} onPress={() => setCreateModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        <View style={styles.channelGrid}>
                            {[
                                { icon: 'email-outline', label: 'Email', sub: 'Rich HTML campaigns', gradientColors: ['#3B82F6', '#60A5FA'] },
                                { icon: 'message-text-outline', label: 'SMS', sub: 'Short text updates', gradientColors: ['#7C3AED', '#A78BFA'] },
                                { icon: 'whatsapp', label: 'WhatsApp', sub: 'Direct engagement', gradientColors: ['#10B981', '#34D399'] },
                            ].map((ch) => (
                                <Pressable
                                    key={ch.label}
                                    style={({ pressed }) => [styles.channelCard, pressed && styles.channelCardPressed]}
                                    onPress={handleSelectTemplateType}
                                >
                                    <LinearGradient
                                        colors={ch.gradientColors as any}
                                        style={styles.channelCardIconGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <MaterialCommunityIcons name={ch.icon as any} size={22} color="#FFFFFF" />
                                    </LinearGradient>
                                    <View style={{ flex: 1, marginLeft: 16 }}>
                                        <Text style={[styles.channelCardTitle, { color: colors.textPrimary }]}>{ch.label}</Text>
                                        <Text style={styles.channelCardSub}>{ch.sub}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── WEB ONLY MODAL ── */}
            <Modal visible={webOnlyModalVisible} transparent animationType="fade" onRequestClose={() => setWebOnlyModalVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.centeredModal}>
                        <View style={styles.webIconRing}>
                            <MaterialCommunityIcons name="monitor-shimmer" size={28} color={colors.accentTeal} />
                        </View>
                        <Text style={styles.modalTitle}>Web Experience</Text>
                        <Text style={styles.modalBody}>
                            Advanced template editing is available on our web platform for the full design experience.
                        </Text>
                        <Pressable style={styles.tealBtn} onPress={() => setWebOnlyModalVisible(false)}>
                            <Text style={styles.tealBtnText}>Got It</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* ── TEMPLATE PREVIEW MODAL ── */}
            <Modal 
                visible={previewVisible} 
                transparent={false} 
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => { setPreviewVisible(false); setPreviewTemplate(null); }}
            >
                <View style={[styles.fullPagePreviewContainer, { paddingTop: insets.top, backgroundColor: theme === 'dark' ? '#0F172A' : '#F8FAFC' }]}>
                    {previewTemplate && (
                        <>
                            {/* Header */}
                            <View style={styles.fullPagePreviewHeader}>
                                <View style={{ width: 28 }} />
                                <Text style={styles.fullPagePreviewTitle} numberOfLines={1}>
                                    Preview: {previewTemplate.name}
                                </Text>
                                <Pressable 
                                    onPress={() => { setPreviewVisible(false); setPreviewTemplate(null); }}
                                    hitSlop={12}
                                    style={styles.fullPageHeaderClose}
                                >
                                    <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                                </Pressable>
                            </View>

                            {/* Simulated Device Body */}
                            {renderPreviewContent(previewTemplate)}
                        </>
                    )}
                </View>
            </Modal>
        </LinearGradient>
    );
}

function getStyles(colors: any, theme?: string) {
    const isDark = theme === 'dark';
    const glassBase = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)';
    const glassBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

    // iOS uses gorgeous translucent glassmorphism; Android uses solid card backgrounds
    const cardBg = Platform.OS === 'ios' ? glassBase : colors.cardBackground;
    const borderCol = Platform.OS === 'ios' ? glassBorder : colors.cardBorder;

    return StyleSheet.create({
        container: { flex: 1 },
        content: { flex: 1 },
        scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },

        // Stats ribbon
        statsRibbon: {
            flexDirection: 'row',
            backgroundColor: cardBg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: borderCol,
            paddingVertical: 16,
            paddingHorizontal: 8,
            marginBottom: 24,
            alignItems: 'center',
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isDark ? 0.2 : 0.04,
                    shadowRadius: 16,
                },
                android: {
                    elevation: 2,
                },
            }),
        },
        statItem: {
            flex: 1,
            alignItems: 'center',
        },
        statNumber: {
            fontSize: 22,
            fontWeight: '800',
            color: colors.textPrimary,
            letterSpacing: -0.5,
        },
        statLabel: {
            fontSize: 10,
            fontWeight: '700',
            color: colors.textSecondary,
            marginTop: 2,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
        },
        statDivider: {
            width: 1,
            height: 32,
            backgroundColor: borderCol,
        },

        // Card
        card: {
            backgroundColor: cardBg,
            borderRadius: 28,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: borderCol,
            overflow: 'hidden',
            // Premium shadow styling
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: isDark ? 0.35 : 0.08,
                    shadowRadius: 20,
                },
                android: {
                    elevation: 4,
                },
            }),
        },
        cardAccentLine: {
            height: 2.5,
            width: '30%',
            borderRadius: 2,
            marginHorizontal: 20,
            marginTop: 16,
            opacity: 0.7,
        },
        cardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 4,
        },
        channelBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        channelIconGradient: {
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        channelTypeTag: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
        },
        channelDot: {
            width: 5,
            height: 5,
            borderRadius: 3,
        },
        channelTypeText: {
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.8,
        },
        actionGroup: {
            flexDirection: 'row',
            gap: 6,
        },
        actionBtn: {
            width: 30,
            height: 30,
            borderRadius: 9,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderWidth: 1,
            borderColor: borderCol,
            alignItems: 'center',
            justifyContent: 'center',
        },
        actionBtnDanger: {
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderColor: 'rgba(239,68,68,0.2)',
        },
        actionBtnPressed: {
            opacity: 0.6,
            transform: [{ scale: 0.94 }],
        },
        templateName: {
            fontSize: 17,
            fontWeight: '800',
            color: colors.textPrimary,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 4,
            letterSpacing: -0.3,
        },
        cardDivider: {
            height: 1,
            backgroundColor: borderCol,
            marginHorizontal: 16,
            marginVertical: 12,
        },

        // Full Width Meta Block
        fullWidthMetaBlock: {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: borderCol,
            padding: 14,
            marginHorizontal: 16,
            marginBottom: 12,
        },
        metaLabel: {
            fontSize: 8,
            fontWeight: '900',
            color: colors.textSecondary,
            letterSpacing: 1.2,
            marginBottom: 6,
        },
        metaValue: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.textPrimary,
            lineHeight: 16,
        },

        // Bottom Actions Row (side-by-side Edit and Status)
        bottomActionsRow: {
            flexDirection: 'row',
            gap: 12,
            marginHorizontal: 16,
            marginBottom: 16,
        },

        // Inline Edit Button
        inlineEditBtn: {
            flex: 1.2,
            height: 48,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0B2D3E',
            borderRadius: 16,
            shadowColor: '#0B2D3E',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 2,
        },
        inlineEditBtnText: {
            fontSize: 13,
            fontWeight: '800',
            color: '#FFFFFF',
        },

        // Inline Status Pill
        inlineStatusPill: {
            flex: 1,
            height: 48,
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
            borderWidth: 1,
            borderColor: borderCol,
            borderRadius: 16,
            paddingHorizontal: 10,
            justifyContent: 'center',
        },
        statusLabelMini: {
            fontSize: 7,
            fontWeight: '900',
            color: colors.textSecondary,
            letterSpacing: 0.8,
            marginBottom: 1,
            textTransform: 'uppercase',
        },
        statusSwitchRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        inlineStatusText: {
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 0.5,
        },
        editBtnPressed: { opacity: 0.7 },

        // Loading & empty
        loadingContainer: {
            padding: 60,
            alignItems: 'center',
            gap: 16,
        },
        loadingText: {
            fontSize: 14,
            color: colors.textSecondary,
            fontWeight: '600',
        },
        emptyContainer: {
            padding: 60,
            alignItems: 'center',
            gap: 12,
        },
        emptyIconWrap: {
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderWidth: 1,
            borderColor: borderCol,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
        },
        emptyTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.textPrimary,
        },
        emptySubtitle: {
            fontSize: 14,
            color: colors.textSecondary,
            fontWeight: '500',
            textAlign: 'center',
        },

        // FAB
        fab: {
            position: 'absolute',
            right: 24,
            width: 60,
            height: 60,
            borderRadius: 30,
            overflow: 'hidden',
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.45)',
            ...Platform.select({
                ios: {
                    shadowColor: '#2DD4BF',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.45,
                    shadowRadius: 16,
                },
                android: {
                    elevation: 8,
                },
            }),
            zIndex: 1000,
        },
        fabPressed: { transform: [{ scale: 0.9 }, { rotate: '45deg' }], opacity: 0.95 },
        fabGradient: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },

        // Modal base
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(5, 10, 20, 0.72)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
        },
        bottomSheetOverlay: {
            flex: 1,
            backgroundColor: 'rgba(5, 10, 20, 0.72)',
            justifyContent: 'flex-end',
        },
        centeredModal: {
            width: '100%',
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderRadius: 32,
            padding: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: borderCol,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: 0.3,
            shadowRadius: 40,
            elevation: 24,
        },

        // Delete modal
        dangerIconRing: {
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: 'rgba(239,68,68,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
        },
        dangerIconInner: {
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: 'rgba(239,68,68,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        modalTitle: {
            fontSize: 22,
            fontWeight: '900',
            color: colors.textPrimary,
            marginBottom: 10,
            letterSpacing: -0.5,
        },
        modalBody: {
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 28,
            fontWeight: '500',
        },
        modalBtnRow: {
            flexDirection: 'row',
            gap: 10,
            width: '100%',
        },
        ghostBtn: {
            flex: 1,
            height: 52,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: borderCol,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        ghostBtnText: {
            fontSize: 15,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        dangerBtn: {
            flex: 1,
            height: 52,
            borderRadius: 16,
            backgroundColor: '#EF4444',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
        },
        dangerBtnText: {
            fontSize: 15,
            fontWeight: '800',
            color: '#FFFFFF',
        },

        // Web modal
        webIconRing: {
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: 'rgba(11,160,178,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(11,160,178,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
        },
        tealBtn: {
            width: '100%',
            height: 52,
            borderRadius: 16,
            backgroundColor: colors.accentTeal,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.accentTeal,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 14,
            elevation: 8,
        },
        tealBtnText: {
            fontSize: 15,
            fontWeight: '900',
            color: '#FFFFFF',
            letterSpacing: 1.2,
        },

        // Create / sheet modal
        sheetModal: {
            width: '100%',
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderRadius: 32,
            padding: 28,
            borderWidth: 1,
            borderColor: borderCol,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: 0.3,
            shadowRadius: 40,
            elevation: 24,
        },
        sheetHandle: {
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: borderCol,
            alignSelf: 'center',
            marginBottom: 20,
        },
        sheetHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 24,
        },
        sheetTitle: {
            fontSize: 20,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: -0.5,
            marginBottom: 3,
        },
        sheetSub: {
            fontSize: 13,
            color: colors.textSecondary,
            fontWeight: '500',
        },
        closeCircle: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            borderWidth: 1,
            borderColor: borderCol,
            alignItems: 'center',
            justifyContent: 'center',
        },
        channelGrid: {
            gap: 10,
        },
        channelCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            padding: 18,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: borderCol,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        },
        channelCardPressed: {
            opacity: 0.7,
            transform: [{ scale: 0.98 }],
        },
        channelCardIconGradient: {
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 2,
        },
        channelCardTitle: {
            fontSize: 16,
            fontWeight: '800',
            marginBottom: 2,
        },
        channelCardSub: {
            fontSize: 12,
            color: colors.textSecondary,
            fontWeight: '500',
        },

        // Preview Modal Layouts
        fullPagePreviewContainer: {
            flex: 1,
        },
        fullPagePreviewHeader: {
            height: 56,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: borderCol,
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        },
        fullPageHeaderClose: {
            width: 28,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
        },
        fullPagePreviewTitle: {
            flex: 1,
            textAlign: 'center',
            fontSize: 16,
            fontWeight: '900',
            color: colors.textPrimary,
            letterSpacing: -0.5,
        },
        emailPreviewContainer: {
            flex: 1,
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        },
        emailMetaHeader: {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#334155' : borderCol,
            padding: 12,
            gap: 6,
        },
        emailMetaRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
        },
        emailMetaLabel: {
            width: 60,
            fontSize: 12,
            fontWeight: '600',
            color: '#64748B',
        },
        emailMetaVal: {
            fontSize: 12,
            fontWeight: '500',
            color: isDark ? '#E2E8F0' : '#1E293B',
            flex: 1,
        },
        emailBodyContainer: {
            flex: 1,
            backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
        },
        emailCardMock: {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: isDark ? '#334155' : borderCol,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 8,
            elevation: 1,
        },
        emailBrandingHeader: {
            paddingBottom: 12,
            borderTopWidth: 4,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#334155' : '#F1F5F9',
            marginBottom: 16,
        },
        emailBrandingTitle: {
            fontSize: 18,
            fontWeight: '800',
            color: isDark ? '#F1F5F9' : '#1E293B',
            marginTop: 8,
        },
        emailBrandingSub: {
            fontSize: 11,
            color: isDark ? '#94A3B8' : '#64748B',
            marginTop: 2,
            fontWeight: '500',
        },
        emailTextContent: {
            fontSize: 14,
            color: isDark ? '#CBD5E1' : '#334155',
            lineHeight: 22,
            marginBottom: 16,
        },
        emailCtaBtn: {
            backgroundColor: isDark ? '#0D9488' : '#0B2D3E',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
        },
        emailCtaBtnText: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '700',
        },
        emailPropHeaderContainer: {
            height: 180,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 16,
        },
        emailPropHeaderGradient: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
        },
        emailPropHeaderTitle: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '900',
            letterSpacing: 1.5,
            marginTop: 12,
            textAlign: 'center',
        },
        emailPropHeaderSub: {
            color: '#94A3B8',
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.5,
            marginTop: 4,
            textAlign: 'center',
        },
        emailPageLinkRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderWidth: 1,
            borderColor: isDark ? '#334155' : borderCol,
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
        },
        emailPageLinkText: {
            fontSize: 13,
            fontWeight: '700',
            color: isDark ? '#2DD4BF' : '#0D9488',
        },
        emailPropDetailsCard: {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? '#334155' : borderCol,
            padding: 12,
            marginBottom: 16,
        },
        emailPropTitle: {
            fontSize: 15,
            fontWeight: '800',
            color: isDark ? '#F1F5F9' : '#1E293B',
        },
        emailPropPrice: {
            fontSize: 18,
            fontWeight: '900',
            color: isDark ? '#2DD4BF' : '#0D9488',
            marginVertical: 4,
        },
        emailPropSpecs: {
            fontSize: 12,
            color: isDark ? '#94A3B8' : '#64748B',
            fontWeight: '600',
        },
        emailPropAddress: {
            fontSize: 12,
            color: isDark ? '#64748B' : '#94A3B8',
            marginTop: 2,
        },
        emailAttachmentCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderWidth: 1,
            borderColor: isDark ? '#334155' : borderCol,
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
        },
        emailAttachmentName: {
            fontSize: 13,
            fontWeight: '700',
            color: isDark ? '#F1F5F9' : '#1E293B',
        },
        emailAttachmentSize: {
            fontSize: 11,
            color: isDark ? '#94A3B8' : '#64748B',
            marginTop: 2,
        },
        emailSignatureBox: {
            marginTop: 16,
            marginBottom: 16,
        },
        signatureDivider: {
            height: 1,
            backgroundColor: isDark ? '#334155' : borderCol,
            marginBottom: 16,
        },
        emailSignatureText: {
            fontSize: 13,
            color: isDark ? '#94A3B8' : '#64748B',
            lineHeight: 18,
        },
        signatureSocialRow: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 10,
        },
        sigSocialIconBadge: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center',
        },

        // SMS Preview Styles
        smsPreviewContainer: {
            flex: 1,
            backgroundColor: isDark ? '#000000' : '#FFFFFF',
        },
        smsHeader: {
            height: 70,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA',
            backgroundColor: isDark ? '#1C1C1E' : '#F9F9F9',
        },
        smsAvatar: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isDark ? '#3A3A3C' : '#8E8E93',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 2,
        },
        smsAvatarText: {
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '700',
        },
        smsContactName: {
            fontSize: 11,
            color: isDark ? '#FFFFFF' : '#000000',
            fontWeight: '500',
        },
        smsChatArea: {
            flex: 1,
            backgroundColor: isDark ? '#000000' : '#FFFFFF',
        },
        smsDateStamp: {
            textAlign: 'center',
            fontSize: 11,
            color: '#8E8E93',
            fontWeight: '600',
            marginVertical: 12,
            textTransform: 'uppercase',
        },
        smsBubbleContainer: {
            alignItems: 'flex-start',
            marginBottom: 16,
        },
        smsBubble: {
            backgroundColor: isDark ? '#262629' : '#E5E5EA',
            borderRadius: 18,
            paddingVertical: 10,
            paddingHorizontal: 16,
            maxWidth: '75%',
        },
        smsBubbleText: {
            color: isDark ? '#FFFFFF' : '#000000',
            fontSize: 15,
            lineHeight: 20,
        },
        smsTimeText: {
            fontSize: 10,
            color: '#8E8E93',
            marginTop: 4,
            marginLeft: 12,
        },
        smsInputFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 10,
            borderTopWidth: 1,
            borderTopColor: isDark ? '#2C2C2E' : '#E5E5EA',
            backgroundColor: isDark ? '#1C1C1E' : '#F9F9F9',
            gap: 12,
        },
        smsInputField: {
            flex: 1,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? '#000000' : '#FFFFFF',
            borderWidth: 1,
            borderColor: isDark ? '#2C2C2E' : '#C7C7CC',
            paddingLeft: 12,
            paddingRight: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        smsSendBtnCircle: {
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#007AFF',
            alignItems: 'center',
            justifyContent: 'center',
        },
        smsBubbleLink: {
            backgroundColor: isDark ? '#262629' : '#E5E5EA',
            borderRadius: 18,
            paddingVertical: 10,
            paddingHorizontal: 16,
            maxWidth: '75%',
            borderLeftWidth: 3,
            borderLeftColor: '#007AFF',
        },
        smsLinkPreviewHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 2,
        },
        smsLinkPreviewTitle: {
            fontSize: 14,
            fontWeight: '700',
            color: '#007AFF',
        },
        smsLinkUrlText: {
            fontSize: 12,
            color: '#8E8E93',
            textDecorationLine: 'underline',
        },

        // WhatsApp Preview Styles
        waPreviewContainer: {
            flex: 1,
            backgroundColor: isDark ? '#0B141A' : '#E5DDD5',
        },
        waHeader: {
            height: 60,
            backgroundColor: isDark ? '#202C33' : '#075E54',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 10,
        },
        waAvatar: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? '#374248' : '#95A5A6',
            alignItems: 'center',
            justifyContent: 'center',
        },
        waAvatarText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '700',
        },
        waContactName: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '700',
        },
        waStatus: {
            color: isDark ? '#8696A0' : 'rgba(255, 255, 255, 0.75)',
            fontSize: 10,
            marginTop: 1,
        },
        waBackgroundWrapper: {
            flex: 1,
            backgroundColor: isDark ? '#0B141A' : '#efeAE2',
        },
        waChatArea: {
            flex: 1,
        },
        waDateBadge: {
            alignSelf: 'center',
            backgroundColor: isDark ? '#182229' : '#E1F3FB',
            borderRadius: 8,
            paddingVertical: 5,
            paddingHorizontal: 10,
            marginVertical: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 1,
            elevation: 1,
        },
        waDateBadgeText: {
            fontSize: 10.5,
            color: isDark ? '#8696A0' : '#50606B',
            fontWeight: '700',
        },
        waBubbleContainer: {
            alignItems: 'flex-start',
            marginBottom: 16,
        },
        waBubble: {
            backgroundColor: isDark ? '#005C4B' : '#D9FDD3',
            borderRadius: 10,
            paddingTop: 8,
            paddingLeft: 10,
            paddingRight: 10,
            paddingBottom: 4,
            maxWidth: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 1,
        },
        waBubbleText: {
            color: isDark ? '#E9EDEF' : '#303030',
            fontSize: 14.5,
            lineHeight: 19,
        },
        waBubbleFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: 4,
            alignSelf: 'flex-end',
        },
        waTimeText: {
            fontSize: 9.5,
            color: isDark ? '#8696A0' : '#8696A0',
        },
        waInputFooter: {
            flexDirection: 'row',
            padding: 8,
            backgroundColor: 'transparent',
            alignItems: 'center',
            gap: 6,
        },
        waInputField: {
            flex: 1,
            height: 44,
            borderRadius: 22,
            backgroundColor: isDark ? '#202C33' : '#FFFFFF',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 1,
        },
        waMicBtn: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#00A884',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 1,
        },
        waTemplateButtonContainer: {
            alignItems: 'flex-start',
            marginBottom: 16,
            maxWidth: '80%',
        },
        waTemplateActionBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#202C33' : '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: isDark ? '#2F3B43' : '#F2F2F2',
            paddingVertical: 10,
            width: '100%',
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 1,
            elevation: 1,
        },
        waTemplateActionBtnText: {
            color: '#00A884',
            fontSize: 13,
            fontWeight: '700',
        },
    });
}