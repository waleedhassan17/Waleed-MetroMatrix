// ============================================================================
// "3D model (AR)" — lets a vendor attach the file behind the storefront's
// "View in your room" button: a .glb (Android Scene Viewer) and, optionally, a
// .usdz (iPhone AR Quick Look). Files go straight to Cloudinary with a signed
// upload; the API then checks they really are glTF 2.0 / USDZ before linking.
// ============================================================================

import * as DocumentPicker from 'expo-document-picker';
import { Box, Trash2, Upload } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

import { S, T, W } from '../../../../constants/theme';
import { ThemeColors, useTheme } from '../../../../theme';
import { uploadAsset } from '../../../../services/uploads/cloudinaryUpload';
import { attachProductModel3dApi, removeProductModel3dApi } from '../../../../networks/shopping/vendorApi';
import type { Product, ProductModel3d } from '../../../../types/shopping';

const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  /** Undefined while creating: the model is linked to a saved product. */
  productId?: string;
  model3d?: ProductModel3d | null;
  onChanged: (product: Product) => void;
  sectionStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  hintStyle?: StyleProp<TextStyle>;
}

type Busy = null | 'glb' | 'usdz' | 'remove';

const fileName = (url?: string | null) => (url ? decodeURIComponent(url.split('/').pop() || '') : '');
const mb = (n?: number | null) => (n ? `${(n / (1024 * 1024)).toFixed(1)} MB` : '');

export default function Model3dSection({ productId, model3d, onChanged, sectionStyle, titleStyle, hintStyle }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [busy, setBusy] = useState<Busy>(null);
  const hasGlb = !!model3d?.glbUrl;

  const pick = async (kind: 'glb' | 'usdz') => {
    if (!productId || busy) return;
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.length) return;
    const file = res.assets[0];
    const name = file.name || '';
    if (!new RegExp(`\\.${kind}$`, 'i').test(name)) {
      Alert.alert('Wrong file type', kind === 'glb' ? 'Choose a .glb (binary glTF 2.0) file.' : 'Choose a .usdz file.');
      return;
    }
    if (file.size && file.size > MAX_BYTES) {
      Alert.alert('File too large', 'Models must be 10 MB or smaller so they load quickly on mobile data.');
      return;
    }
    setBusy(kind);
    try {
      const url = await uploadAsset(file.uri, 'product_model3d', {
        name,
        mimeType: kind === 'glb' ? 'model/gltf-binary' : 'model/vnd.usdz+zip',
        sizeBytes: file.size ?? undefined,
      });
      const payload =
        kind === 'glb'
          ? { glbUrl: url, ...(model3d?.usdzUrl ? { usdzUrl: model3d.usdzUrl } : {}) }
          : { glbUrl: model3d!.glbUrl as string, usdzUrl: url };
      const saved = await attachProductModel3dApi(productId, payload);
      onChanged(saved.data);
    } catch (e: any) {
      Alert.alert('Could not add the model', e?.message || 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const remove = () => {
    if (!productId || busy) return;
    Alert.alert('Remove 3D model?', 'Customers will no longer see "View in your room" for this product.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusy('remove');
          try {
            const saved = await removeProductModel3dApi(productId);
            onChanged(saved.data);
          } catch (e: any) {
            Alert.alert('Could not remove the model', e?.message || 'Please try again.');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={sectionStyle} testID="model3d-section">
      <Text style={titleStyle}>3D model (AR)</Text>
      <Text style={hintStyle}>
        Shoppers can place the product in their room with their camera. Upload a .glb (glTF 2.0, up to 10 MB);
        add a .usdz too for iPhones.
      </Text>

      {!productId ? (
        <Text style={styles.note}>Save the product first, then add its 3D model here.</Text>
      ) : (
        <>
          {hasGlb && (
            <View style={styles.fileRow}>
              <Box size={18} stroke={colors.accentDeep} strokeWidth={1.75} />
              <View style={styles.fileText}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {fileName(model3d?.glbUrl)}
                </Text>
                <Text style={styles.fileMeta}>
                  {[mb(model3d?.sizeBytes), model3d?.usdzUrl ? 'iPhone model added' : 'Android only'].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <TouchableOpacity onPress={remove} hitSlop={8} accessibilityLabel="Remove 3D model" disabled={!!busy}>
                {busy === 'remove' ? <ActivityIndicator size="small" color={colors.error} /> : <Trash2 size={18} stroke={colors.error} strokeWidth={1.75} />}
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={() => pick('glb')} disabled={!!busy} accessibilityRole="button">
              {busy === 'glb' ? <ActivityIndicator size="small" color={colors.accentDeep} /> : <Upload size={16} stroke={colors.accentDeep} strokeWidth={2} />}
              <Text style={styles.buttonText}>{hasGlb ? 'Replace .glb' : 'Upload .glb'}</Text>
            </TouchableOpacity>
            {hasGlb && (
              <TouchableOpacity style={styles.button} onPress={() => pick('usdz')} disabled={!!busy} accessibilityRole="button">
                {busy === 'usdz' ? <ActivityIndicator size="small" color={colors.accentDeep} /> : <Upload size={16} stroke={colors.accentDeep} strokeWidth={2} />}
                <Text style={styles.buttonText}>{model3d?.usdzUrl ? 'Replace .usdz' : 'Add .usdz (iPhone)'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    note: { ...T.caption, color: c.inkMuted },
    fileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.md,
      padding: S.md,
      borderRadius: S.md,
      backgroundColor: c.accentSoft,
      marginBottom: S.md,
    },
    fileText: { flex: 1 },
    fileName: { ...T.body, color: c.ink },
    fileMeta: { ...T.caption, color: c.inkMuted },
    buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: S.xs + 2,
      paddingHorizontal: S.md,
      paddingVertical: S.sm + 2,
      borderRadius: S.sm + 2,
      borderWidth: 1,
      borderColor: c.accentDeep,
    },
    buttonText: { ...T.label, fontWeight: W.semibold, color: c.accentDeep },
  });
