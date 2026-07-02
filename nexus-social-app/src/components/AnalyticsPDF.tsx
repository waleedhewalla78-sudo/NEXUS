import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#1e1b4b',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  heading: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#4338ca',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#4b5563',
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
});

interface AnalyticsPDFProps {
  data: any;
  date: string;
}

export const AnalyticsPDF = ({ data, date }: AnalyticsPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Nexus Social - Analytics Report</Text>
      <Text style={{ fontSize: 10, color: '#6b7280', marginBottom: 20 }}>Generated on: {date}</Text>

      <View style={styles.section}>
        <Text style={styles.heading}>Performance Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total Posts</Text>
          <Text style={styles.value}>{data?.totalPosts || 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Published Posts</Text>
          <Text style={styles.value}>{data?.publishedPosts || 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Draft Posts</Text>
          <Text style={styles.value}>{data?.draftPosts || 0}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Platform Distribution</Text>
        {data?.postsByPlatform?.map((item: any, i: number) => (
          <View style={styles.row} key={i}>
            <Text style={styles.label}>{item.platform}</Text>
            <Text style={styles.value}>{item.count} posts</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 40, textAlign: 'center' }}>
        Confidential - Nexus Social Platform
      </Text>
    </Page>
  </Document>
);

export default AnalyticsPDF;
