import {
  PixelButton,
  PixelCard,
  PixelLoading,
  PixelText,
} from "@/components/pixel";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionsApi } from "@/services/api/subscriptions";
import { pixelBorderWidth, pixelColors, pixelRadius } from "@/theme/pixel";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";

export default function VendorQrCodeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const shotRef = useRef<any>(null);
  const [busy, setBusy] = useState<"none" | "image" | "pdf" | "print">("none");
  const [qrImageUri, setQrImageUri] = useState("");
  const [isQrLoading, setIsQrLoading] = useState(true);
  const [qrError, setQrError] = useState("");

  React.useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, []);

  const loadQrCode = useCallback(async () => {
    try {
      setIsQrLoading(true);
      setQrError("");

      const response = await subscriptionsApi.getMerchantQrCode();
      const qrBlob = await response.blob();

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result === "string" && result.length > 0) {
            resolve(result);
            return;
          }
          reject(new Error("無法讀取 QR 圖片資料"));
        };
        reader.onerror = () => reject(new Error("QR 圖片轉換失敗"));
        reader.readAsDataURL(qrBlob);
      });

      setQrImageUri(dataUrl);
    } catch (error: any) {
      setQrImageUri("");
      setQrError(error?.message || "載入 QR Code 失敗");
    } finally {
      setIsQrLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadQrCode();
  }, [loadQrCode]);

  const capturePng = async (): Promise<string> => {
    const uri = await shotRef.current?.capture?.({
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
    if (!uri) throw new Error("無法匯出圖片,請稍後再試");
    return uri as string;
  };

  const buildPdfFromPng = async (pngUri: string) => {
    const base64 = await FileSystem.readAsStringAsync(pngUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const title = user?.name ? String(user.name) : "商家";
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica", "Arial"; padding: 24px; }
            .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; }
            .title { font-size: 20px; font-weight: 800; margin: 0 0 6px 0; }
            .sub { font-size: 12px; color: #6b7280; margin: 0 0 14px 0; }
            .qr { width: 320px; height: 320px; display: block; margin: 16px auto; }
            .hint { font-size: 12px; color: #111827; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <p class="title">訂閱 QR Code</p>
            <p class="sub">請用客戶端掃描以訂閱通知</p>
            <img class="qr" src="data:image/png;base64,${base64}" />
            <p class="hint">${title}</p>
          </div>
        </body>
      </html>
    `;

    return Print.printToFileAsync({ html });
  };

  const onShareImage = async () => {
    if (!qrImageUri) {
      Alert.alert("無法分享", qrError || "目前尚未載入 QR Code");
      return;
    }
    try {
      setBusy("image");
      const uri = await capturePng();
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("無法分享", "此裝置不支援分享功能");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch (e: any) {
      Alert.alert("錯誤", e?.message || "匯出圖片失敗");
    } finally {
      setBusy("none");
    }
  };

  const onExportPdf = async () => {
    if (!qrImageUri) {
      Alert.alert("無法匯出", qrError || "目前尚未載入 QR Code");
      return;
    }
    try {
      setBusy("pdf");
      const pngUri = await capturePng();
      const pdf = await buildPdfFromPng(pngUri);
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("無法分享", "此裝置不支援分享功能");
        return;
      }
      await Sharing.shareAsync(pdf.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    } catch (e: any) {
      Alert.alert("錯誤", e?.message || "匯出 PDF 失敗");
    } finally {
      setBusy("none");
    }
  };

  const onPrint = async () => {
    if (!qrImageUri) {
      Alert.alert("無法列印", qrError || "目前尚未載入 QR Code");
      return;
    }
    try {
      setBusy("print");
      const pngUri = await capturePng();
      const pdf = await buildPdfFromPng(pngUri);
      await Print.printAsync({ uri: pdf.uri });
    } catch (e: any) {
      Alert.alert("錯誤", e?.message || "列印失敗 (可改用匯出 PDF)");
    } finally {
      setBusy("none");
    }
  };

  return (
    <View style={styles.root}>
      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <PixelButton
          label="<< BACK"
          tone="ink"
          size="sm"
          display
          onPress={() => router.back()}
        />
        <View style={{ flex: 1 }}>
          <PixelText variant="caption" tone="gold" display>
            SHARE  QR
          </PixelText>
          <PixelText variant="title">我的訂閱 QR Code</PixelText>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 40,
          gap: 14,
        }}
      >
        <PixelCard
          title="MERCHANT  QR"
          titleTone="gold"
          titleDisplay
          padding={14}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="qr-code" size={18} color={pixelColors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <PixelText variant="bodyLg">掃描訂閱</PixelText>
              <PixelText variant="caption" tone="muted">
                客戶端掃描此 QR,即可訂閱你的通知
              </PixelText>
            </View>
          </View>

          <View style={{ height: 14 }} />
          <View style={styles.shotWrap}>
            <ViewShot
              ref={shotRef}
              options={{ format: "png", quality: 1, result: "tmpfile" }}
              style={{ width: "100%", alignItems: "center" }}
            >
              <View style={styles.qrCard}>
                <View style={styles.qrInner}>
                  {isQrLoading ? (
                    <View style={styles.qrBox}>
                      <PixelLoading label="" size="md" tone="purple" />
                      <View style={{ height: 8 }} />
                      <PixelText variant="caption" tone="inverse">
                        載入 QR Code 中...
                      </PixelText>
                    </View>
                  ) : qrImageUri ? (
                    <Image
                      source={{ uri: qrImageUri }}
                      style={{ width: 260, height: 260 }}
                      resizeMode="contain"
                    />
                  ) : qrError ? (
                    <View style={styles.qrBox}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={28}
                        color={pixelColors.red}
                      />
                      <View style={{ height: 8 }} />
                      <PixelText
                        variant="body"
                        tone="inverse"
                        style={{ textAlign: "center", paddingHorizontal: 12 }}
                      >
                        {qrError}
                      </PixelText>
                      <View style={{ height: 10 }} />
                      <PixelButton
                        label="> 重新載入"
                        tone="red"
                        size="sm"
                        onPress={() => void loadQrCode()}
                      />
                    </View>
                  ) : (
                    <View style={styles.qrBox}>
                      <PixelText variant="body" tone="inverse">
                        尚未取得 QR Code
                      </PixelText>
                    </View>
                  )}
                </View>

                <View style={{ height: 10 }} />
                <PixelText variant="caption" tone="inverse">
                  此 QR Code 由系統依目前登入的商家帳號產生
                </PixelText>
              </View>
            </ViewShot>
          </View>

          <View style={{ height: 14 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <PixelButton
                label={busy === "image" ? "..." : "> 分享圖片"}
                tone="ink"
                fullWidth
                disabled={busy !== "none"}
                onPress={onShareImage}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PixelButton
                label={busy === "pdf" ? "..." : "> 匯出 PDF"}
                tone="blue"
                fullWidth
                disabled={busy !== "none"}
                onPress={onExportPdf}
              />
            </View>
          </View>

          <View style={{ height: 8 }} />
          <PixelButton
            label={busy === "print" ? "..." : "> 列印"}
            tone="gold"
            fullWidth
            disabled={busy !== "none"}
            onPress={onPrint}
          />
        </PixelCard>

        <PixelCard
          title="TIP"
          titleTone="blue"
          titleDisplay
          padding={14}
        >
          <View style={styles.tipRow}>
            <Ionicons
              name="information-circle"
              size={18}
              color={pixelColors.blue}
            />
            <PixelText variant="body" style={{ flex: 1 }}>
              建議將「匯出 PDF」的檔案分享給列印 App 或 AirPrint 列印,張貼在攤位旁讓顧客掃碼訂閱。
            </PixelText>
          </View>
        </PixelCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: pixelColors.bg,
  },
  hud: {
    backgroundColor: pixelColors.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: pixelBorderWidth,
    borderBottomColor: pixelColors.ink,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    backgroundColor: pixelColors.gold,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  shotWrap: {
    alignItems: "center",
  },
  qrCard: {
    backgroundColor: pixelColors.paper,
    borderWidth: pixelBorderWidth * 2,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    padding: 14,
    alignItems: "center",
  },
  qrInner: {
    backgroundColor: pixelColors.white,
    borderWidth: pixelBorderWidth,
    borderColor: pixelColors.ink,
    borderRadius: pixelRadius,
    padding: 10,
  },
  qrBox: {
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
});
