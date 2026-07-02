'use client';

import React, { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import AnalyticsPDF from '@/components/AnalyticsPDF';

export default function ExportButton({ data, date }: { data: any; date: string }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white/50 rounded-lg border border-white/10 text-sm font-medium">
        <Download className="w-4 h-4" />
        Loading...
      </button>
    );
  }

  return (
    <PDFDownloadLink
      document={<AnalyticsPDF data={data} date={date} />}
      fileName="nexus_analytics_report.pdf"
      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10 text-sm font-medium"
    >
      {/* @ts-ignore */}
      {({ loading }) => (
        <>
          <Download className="w-4 h-4" />
          {loading ? 'Generating PDF...' : 'Export PDF'}
        </>
      )}
    </PDFDownloadLink>
  );
}
