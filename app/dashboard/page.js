"use server"

import { cache } from 'react';
import { loadDashboardData } from '@/app/utils/loadDashboardData';
import ClientDashboard from '../components/ClientDashboard'; // a client component

// Cache the dashboard data so that subsequent calls in the same lifecycle reuse the cached result
const getDashboardData = cache(async () => {
  return await loadDashboardData();
});

export default async function DashboardPage() {
  // Use the cached function to retrieve dashboard data
  const dashboardData = await getDashboardData();

  return <ClientDashboard initialData={dashboardData} />;
} 