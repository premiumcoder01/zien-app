import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

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
 * Saves the CSV file directly to the device's Downloads folder (Android)
 * or Documents directory (iOS), then shows a success alert.
 * Falls back to the share sheet if direct save fails.
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
  const cacheUri = `${FileSystem.cacheDirectory}${filename}`;

  try {
    // Write CSV content to cache first
    await FileSystem.writeAsStringAsync(cacheUri, csvContent, {
      encoding: 'utf8',
    });

    if (Platform.OS === 'android') {
      // Android: Use SAF to let the user pick a save location (Downloads by default)
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (permissions.granted) {
        const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          'text/csv'
        );
        await FileSystem.writeAsStringAsync(safUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        Alert.alert(
          "Download Complete",
          `"${filename}" has been saved to your selected folder.`
        );
      } else {
        // User denied directory access — fall back to share sheet
        await fallbackShare(cacheUri);
      }
    } else {
      // iOS: Save to the document directory and then use share to save to Files
      const docUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.copyAsync({ from: cacheUri, to: docUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(docUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Save Leads Export',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert(
          "Download Complete",
          `"${filename}" has been saved to the app's documents.`
        );
      }
    }
  } catch (error) {
    console.error("CSV Export Failed:", error);
    // Final fallback: try sharing from cache
    try {
      await fallbackShare(cacheUri);
    } catch {
      Alert.alert("Export Error", "Failed to save the CSV file. Please try again.");
    }
  }
}

/**
 * Fallback: open native share sheet so user can manually choose "Save to Files".
 */
async function fallbackShare(fileUri: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Leads',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    Alert.alert("Export Error", "Sharing is not available on this device.");
  }
}
