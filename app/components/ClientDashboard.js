"use client"; // Must be at the top for client components

import { useEffect, useState } from "react";
import DashboardUI from "./DashboardUI"; // a presentational component can even be a server component if it has no interactivity

export default function ClientDashboard({ initialData }) {
  // Use the server-provided data as initial state if needed
  const [data, setData] = useState(initialData);

  // Any interactivity can be handled here (like re-fetching, user editing, etc.)
  useEffect(() => {
    console.log("Client-side dashboard data:", data);
    // Additional client-side tasks here...
  }, [data]);

  return <DashboardUI data={data} />;
} 