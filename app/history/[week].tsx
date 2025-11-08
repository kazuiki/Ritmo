import { Fredoka_600SemiBold, useFonts } from '@expo-google-fonts/fredoka';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { supabase } from '../../src/supabaseClient';
import { defaultPdfFilename, saveViewAsPdf } from '../../src/utils/pdf';

export default function WeeklyHistoryDetail() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const router = useRouter();
  const printableRef = useRef<View>(null);
  const [childName, setChildName] = useState('Kid');
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold });

  // Parse start date and compute end date (Mon-Sun assumed)
  const weekRange = useMemo(() => {
    let startDate: Date;
    try { startDate = start ? new Date(start) : new Date(); } catch { startDate = new Date(); }
    // Normalize time
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const fmt = (d: Date) => `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
    return { startDate, endDate, rangeText: `${fmt(startDate)} - ${fmt(endDate)}` };
  }, [start]);

  // Demo tasks (replace with real historical data lookup using weekRange.startDate)
  const tasks = useMemo(() => [
    { name: 'BRUSH TEETH', statuses: [true, true, true, true, true, true, true] },
    { name: 'EAT FOOD', statuses: [true, false, true, true, true, false, true] },
    { name: 'WASH BODY', statuses: [true, true, false, true, true, false, true] },
    { name: 'CHANGE CLOTHES', statuses: [true, true, true, false, true, true, true] },
    { name: 'GO TO SCHOOL', statuses: [true, true, true, true, false, true, true] },
  ], [weekRange.startDate]);

  const metrics = useMemo(() => {
    const totalTasks = tasks.length * 7;
    const completed = tasks.reduce((acc, t) => acc + t.statuses.filter(Boolean).length, 0);
    const rate = totalTasks ? Math.round((completed / totalTasks) * 100) : 0;
    const perTaskDone = tasks.map(t => t.statuses.filter(Boolean).length);
    return { totalTasks, completed, rate, perTaskDone };
  }, [tasks]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const meta = (data?.user?.user_metadata ?? {}) as any;
      setChildName(meta?.child_name ?? 'Kid');
    })();
  }, []);

  const exportPdf = async () => {
    try {
      if (!printableRef.current) return;
      const base64 = await captureRef(printableRef.current, { format: 'png', quality: 1, result: 'base64' });
      const html = `<!DOCTYPE html><html><head><meta charset='utf-8'/><style>body{margin:0;padding:24px;font-family:Arial}img{width:100%;height:auto}</style></head><body><img src='data:image/png;base64,${base64}'/></body></html>`;
      const file = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(file.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
      else Alert.alert('Saved', file.uri);
    } catch (e: any) {
      Alert.alert('PDF Error', e?.message ?? 'Failed to export PDF');
    }
  };

  // Custom slide animation, similar to playbook modal and History list
  const slideX = useMemo(() => new Animated.Value(400), []);
  useEffect(() => {
    Animated.timing(slideX, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);
  const handleBack = () => {
    Animated.timing(slideX, { toValue: 400, duration: 300, useNativeDriver: true }).start(() => {
      router.back();
    });
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: slideX }] }]}>
      <Image source={require('../../assets/background.png')} style={styles.background} resizeMode='cover' />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backTextLink}>Back</Text>
          </TouchableOpacity>
        </View>
        <View ref={printableRef} collapsable={false}>
          {/* Weekly Performance Summary (match Progress) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Performance Summary</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.subtleText}>For: <Text style={styles.boldText}>{childName}</Text></Text>
            </View>
            <View style={styles.weekRow}>
              <Text style={styles.subtleText}>Week of: </Text>
              <Text style={styles.weekRangeText}>{weekRange.rangeText}</Text>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}><Text style={styles.metricTitle}>Total Task</Text><Text style={styles.metricValue}>{metrics.totalTasks}</Text></View>
              <View style={styles.metricCard}><Text style={styles.metricTitle}>Completed</Text><Text style={styles.metricValue}>{metrics.completed}</Text></View>
              <View style={styles.metricCard}><Text style={styles.metricTitle}>Rate</Text><Text style={styles.metricValue}>{metrics.rate}%</Text></View>
            </View>
          </View>
          {/* Ritmo Tracker (match Progress) */}
          <View style={styles.card}>
            <View style={styles.trackerTitleRow}>
              <Text style={styles.cardTitleLeft}>Ritmo Tracker</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendGreen]} /><Text style={styles.legendText}>Done</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendRed]} /><Text style={styles.legendText}>Missed</Text></View>
              </View>
            </View>
            <View style={[styles.gridRow, styles.gridHeader]}>
              <Text style={[styles.gridCellTask, styles.gridHeaderText]}>Task</Text>
              {['M','T','W','Th','F','St','S'].map(d => <Text key={d} style={[styles.gridCellDay, styles.gridHeaderText]}>{d}</Text>)}
              <Text style={[styles.gridCellDone, styles.gridHeaderText]}>Done</Text>
            </View>
            {tasks.map((t,i) => (
              <View key={t.name} style={styles.gridRow}>
                <Text style={styles.gridCellTask}>{t.name}</Text>
                {t.statuses.map((s, idx) => (
                  <View key={idx} style={[styles.gridCellDay, styles.indicatorCell]}>
                    <View style={[styles.indicatorSquare, s ? styles.indicatorGreen : styles.indicatorRed]} />
                  </View>
                ))}
                <Text style={styles.gridCellDone}>{metrics.perTaskDone[i]}</Text>
              </View>
            ))}
          </View>
        </View>
        <TouchableOpacity style={styles.pdfButton} onPress={async () => {
          if (!printableRef.current) return;
          try {
            await saveViewAsPdf({
              ref: printableRef,
              filename: defaultPdfFilename('history-week'),
              pageSize: 'A4',
              marginMm: 12,
              scalePercent: 0.8,
              logoModule: null,
              openAfterSave: true,
            });
            // PDF opened or share sheet shown immediately; no success alert needed
          } catch (e: any) {
            Alert.alert('PDF Error', e?.message || 'Failed to generate PDF');
          }
        }}>
          <View style={styles.pdfButtonInner}> 
            <Image source={require('../../assets/images/dl.png')} style={styles.pdfIcon} />
            <Text style={styles.pdfLabel}>Save as PDF</Text>
            <Image source={require('../../assets/images/PDF.png')} style={styles.pdfIcon} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { position: 'absolute', width: '100%', height: '100%' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },
  topRow: {
    paddingHorizontal: 0,
    paddingTop: 24,
  },
  backTextLink: {
    color: "#1F2937",
    fontSize: 20,
    fontWeight: "600",
    textDecorationLine: "underline",
    alignSelf: "flex-start",
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CFF6EB',
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A3B4D',
    marginBottom: 8,
    alignSelf: 'center',
  },
  trackerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitleLeft: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A3B4D',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtleText: {
    color: '#2A3B4D',
    fontSize: 14,
  },
  boldText: {
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  weekRangeText: {
    color: '#2A3B4D',
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F3FFFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CFF6EB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricTitle: {
    color: '#2A3B4D',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: '#2A3B4D',
    fontWeight: '700',
    fontSize: 20,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E6F6F1',
  },
  gridHeader: {
    backgroundColor: '#F7FFFD',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  gridHeaderText: {
    fontWeight: '700',
    color: '#2A3B4D',
  },
  gridCellTask: {
    flex: 2,
    color: '#2A3B4D',
  },
  gridCellDay: {
    flex: 0.6,
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellDone: {
    flex: 0.7,
    textAlign: 'center',
    color: '#2A3B4D',
    fontWeight: '700',
  },
  indicatorCell: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorSquare: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#DDECE7',
  },
  indicatorGreen: { backgroundColor: '#1EBE69', borderColor: '#18A65B' },
  indicatorRed: { backgroundColor: '#F56A6A', borderColor: '#E05A5A' },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendGreen: { backgroundColor: '#1EBE69' },
  legendRed: { backgroundColor: '#F56A6A' },
  legendText: {
    color: '#2A3B4D',
    fontSize: 12,
  },
  pdfButton: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CFF6EB',
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pdfButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    
  },
  pdfIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  pdfLabel: {
    fontSize: 22,
    fontWeight: '600',
    color: '#5BDFC9',
    fontFamily: 'Fredoka_600SemiBold',
  },
});
