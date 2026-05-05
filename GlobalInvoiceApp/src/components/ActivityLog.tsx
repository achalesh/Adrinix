import React, { useEffect, useState } from 'react';
import { History, User, Clock, Info } from 'lucide-react';
import { authFetch } from '../store/useAuthStore';
import { API_BASE } from '../config/api';
import styles from './ActivityLog.module.css';

interface Log {
  id: number;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}

interface ActivityLogProps {
  resourceType: string;
  resourceId: string | number;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ resourceType, resourceId }) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (resourceId) {
      fetchLogs();
    }
  }, [resourceId]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/activity_logs.php?resource_type=${resourceType}&resource_id=${resourceId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setLogs(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch activity logs', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div style={{ padding: 20, opacity: 0.5 }}>Loading history...</div>;
  if (logs.length === 0) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <History size={16} /> Activity History
      </h3>
      <div className={styles.timeline}>
        {logs.map((log) => (
          <div key={log.id} className={styles.logItem}>
            <div className={styles.logHeader}>
              <span className={styles.action}>{log.action}</span>
              <span className={styles.date}>
                {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
            <div className={styles.meta}>
              <span className={styles.user}>
                <User size={12} /> {log.user_name}
              </span>
            </div>
            {log.details && (
              <div className={styles.details}>
                <Info size={12} /> {log.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
