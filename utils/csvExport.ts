import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface CSVLeadItem {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  created_at?: string;
}

const escapeCSVField = (val: string | number | boolean | null | undefined): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val).trim();
  return `"${str.replace(/"/g, '""')}"`;
};

const formatCSVDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  } catch {
    return '';
  }
};

/**
 * Generates a CSV file from leads data and prompts native sharing on Android/iOS.
 */
export async function exportLeadsToCSV(leads: CSVLeadItem[]) {
  if (!leads || leads.length === 0) {
    Alert.alert("Export Leads", "You do not have any leads to export yet!");
    return;
  }

  const headers = "Name,Email,Phone,Message,Date\n";
  const rows = leads.map(lead => {
    const name = escapeCSVField(lead.name);
    const email = escapeCSVField(lead.email);
    const phone = escapeCSVField(lead.phone);
    const message = escapeCSVField(lead.message);
    const date = escapeCSVField(formatCSVDate(lead.created_at));
    return `${name},${email},${phone},${message},${date}`;
  }).join('\n');

  const csvContent = headers + rows;
  const formattedDate = new Date().toISOString().split('T')[0];
  const filename = `Leads_Export_${formattedDate}.csv`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  try {
    // Write CSV content as UTF-8
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: 'utf8',
    });

    // Share natively
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Leads',
        UTI: 'public.comma-separated-values-text', // iOS UTI description
      });
    } else {
      Alert.alert("Export Error", "Sharing is not available on this device.");
    }
  } catch (error) {
    console.error("CSV Export Failed:", error);
    Alert.alert("Export Error", "Failed to generate or share the CSV file. Please try again.");
  }
}
