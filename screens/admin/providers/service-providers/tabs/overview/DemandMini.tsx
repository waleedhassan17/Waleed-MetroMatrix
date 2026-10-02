// Home-service demand, overall: the same chart as Platform analytics → Demand.
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Card, SkeletonCard } from '../../../../../../components/ui';
import ForecastChart from '../../../../../../components/ui/charts/ForecastChart';
import { DemandResponse, fetchDemand } from '../../../../../../networks/admin/platformAnalyticsApi';
import { T } from '../../../../../../constants/theme';
import { useTheme } from '../../../../../../theme';

export default function DemandMini() {
  const { colors } = useTheme();
  const [data, setData] = useState<DemandResponse | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetchDemand('homeservice', 'all', 28).then((res) => (res.success && res.data ? setData(res.data) : setFailed(true)));
  }, []);
  if (failed) return <Text style={[T.caption, { color: colors.inkMuted }]}>Demand is unavailable right now.</Text>;
  if (!data) return <SkeletonCard lines={3} />;
  return (
    <Card>
      <ForecastChart history={data.history} forecast={data.forecast} unit="requests" height={150} />
    </Card>
  );
}
