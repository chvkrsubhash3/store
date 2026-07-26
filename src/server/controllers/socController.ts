import { Request, Response } from 'express';
import { query } from '../config/db';

export const getLogs = async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '50', ip, country, method, statusCode, severity, isFlagged, search } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(500, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (ip) { conditions.push(`ip ILIKE $${idx++}`); params.push(`%${ip}%`); }
  if (country) { conditions.push(`country ILIKE $${idx++}`); params.push(`%${country}%`); }
  if (method) { conditions.push(`method = $${idx++}`); params.push(method.toUpperCase()); }
  if (statusCode) { conditions.push(`status_code = $${idx++}`); params.push(parseInt(statusCode)); }
  if (severity && severity !== 'all') { conditions.push(`severity = $${idx++}`); params.push(severity); }
  if (isFlagged === 'true') conditions.push('is_flagged = true');
  if (search) { conditions.push(`(url ILIKE $${idx} OR ip ILIKE $${idx} OR user_agent ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countResult = await query(`SELECT COUNT(*) FROM securemart_logs ${where}`, params);
    const total = parseInt(countResult.rows[0]?.count || '0');

    params.push(limitNum, offset);
    const dataResult = await query(`
      SELECT id, timestamp, ip, country, city, method, url, status_code,
        response_time_ms, user_agent, role, api_name, risk_score, severity,
        detected_threats, is_flagged, is_bot, user_id
      FROM securemart_logs ${where} ORDER BY timestamp DESC LIMIT $${idx++} OFFSET $${idx}
    `, params);

    res.json({ success: true, data: { logs: dataResult.rows, pagination: { total, page: pageNum, limit: limitNum } } });
  } catch (error: any) {
    res.json({ success: true, data: { logs: [], pagination: { total: 0, page: pageNum, limit: limitNum } } });
  }
};

export const getLogDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT * FROM securemart_logs WHERE id = $1', [req.params.id]);
    if (!result.rows.length) { res.status(404).json({ success: false, message: 'Log not found' }); return; }
    res.json({ success: true, data: result.rows[0] });
  } catch { res.status(404).json({ success: false, message: 'Log not found' }); }
};

export const getAlerts = async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '50', severity } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = severity ? `WHERE severity = '${severity}'` : '';
  try {
    const result = await query(`SELECT * FROM securemart_alerts ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [parseInt(limit), offset]);
    res.json({ success: true, data: { alerts: result.rows } });
  } catch { res.json({ success: true, data: { alerts: [] } }); }
};

export const resolveAlert = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { notes, isFalsePositive = false } = req.body;
  try {
    await query('UPDATE securemart_alerts SET is_resolved = true, resolved_at = NOW(), resolved_by = $1, resolution_notes = $2, is_false_positive = $3 WHERE id = $4', [user.id, notes, isFalsePositive, req.params.id]);
    res.json({ success: true, message: 'Alert resolved' });
  } catch { res.status(500).json({ success: false, message: 'Failed to resolve alert' }); }
};

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalLogs, flaggedLogs, totalAlerts, unresolvedAlerts, severityDist, topIPs, topUrls, requestsPerHour, statusCodeDist, topCountries, attackTypes] = await Promise.all([
      query("SELECT COUNT(*) FROM securemart_logs WHERE timestamp >= NOW() - INTERVAL '24 hours'"),
      query("SELECT COUNT(*) FROM securemart_logs WHERE is_flagged = true AND timestamp >= NOW() - INTERVAL '24 hours'"),
      query("SELECT COUNT(*) FROM securemart_alerts WHERE created_at >= NOW() - INTERVAL '24 hours'"),
      query("SELECT COUNT(*) FROM securemart_alerts WHERE is_resolved = false"),
      query("SELECT severity, COUNT(*) as count FROM securemart_logs WHERE is_flagged = true GROUP BY severity ORDER BY count DESC"),
      query("SELECT ip, country, city, COUNT(*) as total_requests, SUM(CASE WHEN is_flagged THEN 1 ELSE 0 END) as flagged_requests, MAX(risk_score) as max_risk_score FROM securemart_logs GROUP BY ip, country, city ORDER BY total_requests DESC LIMIT 20"),
      query("SELECT url as path, method, COUNT(*) as count, SUM(CASE WHEN is_flagged THEN 1 ELSE 0 END) as flagged_count FROM securemart_logs GROUP BY url, method ORDER BY count DESC LIMIT 20"),
      query("SELECT DATE_TRUNC('hour', timestamp) as hour, COUNT(*) as count, SUM(CASE WHEN is_flagged THEN 1 ELSE 0 END) as flagged_count FROM securemart_logs WHERE timestamp >= NOW() - INTERVAL '24 hours' GROUP BY hour ORDER BY hour ASC"),
      query("SELECT status_code, COUNT(*) as count FROM securemart_logs WHERE timestamp >= NOW() - INTERVAL '24 hours' GROUP BY status_code ORDER BY count DESC"),
      query("SELECT country, COUNT(*) as count, SUM(CASE WHEN is_flagged THEN 1 ELSE 0 END) as flagged_count FROM securemart_logs WHERE timestamp >= NOW() - INTERVAL '24 hours' GROUP BY country ORDER BY count DESC LIMIT 15"),
      query("SELECT rule_name, COUNT(*) as count FROM securemart_alerts WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY rule_name ORDER BY count DESC"),
    ]);

    const loginStats = await query("SELECT SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) as successful, SUM(CASE WHEN status_code IN (401, 403) THEN 1 ELSE 0 END) as failed FROM securemart_logs WHERE url LIKE '%/login%' AND method = 'POST'").catch(() => ({ rows: [{ successful: '0', failed: '0' }] }));
    const requests404 = await query("SELECT COUNT(*) FROM securemart_logs WHERE status_code = 404").catch(() => ({ rows: [{ count: '0' }] }));

    res.json({
      success: true,
      data: {
        summary: {
          totalRequests: parseInt(totalLogs.rows[0]?.count || '0'), flaggedRequests: parseInt(flaggedLogs.rows[0]?.count || '0'),
          totalAlerts: parseInt(totalAlerts.rows[0]?.count || '0'), unresolvedAlerts: parseInt(unresolvedAlerts.rows[0]?.count || '0'),
          requests404: parseInt(requests404.rows[0]?.count || '0'), loginSuccess: parseInt(loginStats.rows[0]?.successful || '0'),
          loginFailed: parseInt(loginStats.rows[0]?.failed || '0'),
        },
        charts: {
          severityDistribution: severityDist.rows, requestsPerHour: requestsPerHour.rows,
          statusCodeDistribution: statusCodeDist.rows, attackTypes: attackTypes.rows,
          topCountries: topCountries.rows,
        },
        topIPs: topIPs.rows, topUrls: topUrls.rows,
      },
    });
  } catch (error: any) {
    res.json({
      success: true,
      data: {
        summary: { totalRequests: 0, flaggedRequests: 0, totalAlerts: 0, unresolvedAlerts: 0, requests404: 0, loginSuccess: 0, loginFailed: 0 },
        charts: { severityDistribution: [], requestsPerHour: [], statusCodeDistribution: [], attackTypes: [], topCountries: [] },
        topIPs: [], topUrls: [],
      },
    });
  }
};

export const exportLogs = async (req: Request, res: Response): Promise<void> => {
  const { format = 'csv' } = req.query as Record<string, string>;
  try {
    const result = await query('SELECT timestamp, ip, country, city, method, url, status_code, response_time_ms, user_agent, role, risk_score, severity, is_flagged FROM securemart_logs ORDER BY timestamp DESC LIMIT 5000');
    if (format === 'csv') {
      const headers = ['Timestamp', 'IP Address', 'Country', 'City', 'Method', 'URL Path', 'Status Code', 'Response Time (ms)', 'User Agent', 'Role', 'Risk Score', 'Severity', 'Is Flagged Threat'].join(',');
      const rows = result.rows.map((r: any) => [
        `"${r.timestamp || ''}"`, `"${r.ip || ''}"`, `"${r.country || ''}"`, `"${r.city || ''}"`,
        `"${r.method || ''}"`, `"${r.url || ''}"`, `"${r.status_code || ''}"`, `"${r.response_time_ms || ''}"`,
        `"${(r.user_agent || '').replace(/"/g, '""')}"`, `"${r.role || ''}"`, `"${r.risk_score || 0}"`,
        `"${r.severity || 'Low'}"`, `"${r.is_flagged ? 'TRUE' : 'FALSE'}"`,
      ].join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=securemart_soc_threat_logs_${Date.now()}.csv`);
      res.send([headers, ...rows].join('\n'));
    } else {
      res.json({ exported_at: new Date().toISOString(), count: result.rows.length, logs: result.rows });
    }
  } catch {
    res.status(500).send('Failed to export logs');
  }
};
