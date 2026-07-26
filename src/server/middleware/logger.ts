import { Request, Response, NextFunction } from 'express';
import geoip from 'geoip-lite';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db';
import { analyzeThreats } from './security';
import { WebSocketServer, WebSocket } from 'ws';

let wssInstance: WebSocketServer | null = null;
export const setWss = (wss: WebSocketServer) => { wssInstance = wss; };

export const requestLogger = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const ip = rawIp === '::1' || rawIp === '::ffff:127.0.0.1' ? '127.0.0.1' : rawIp;
  const userAgent = req.headers['user-agent'] || 'unknown';

  const geo = geoip.lookup(ip);
  const country = geo?.country || 'Local Lab';
  const city = geo?.city || 'Localhost';

  const threatResult = analyzeThreats(req, ip, userAgent);

  const sanitizeBody = (body: any) => {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    ['password', 'confirmPassword', 'creditCard', 'cvv'].forEach(field => {
      if (sanitized[field]) sanitized[field] = '***REDACTED***';
    });
    return sanitized;
  };

  const logId = uuidv4();
  const urlPath = req.originalUrl || req.url;

  res.on('finish', async () => {
    const responseTimeMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    const rawUserId = (req as any).user?.id;
    const isUuid = rawUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId);
    const validUserId = isUuid ? rawUserId : null;

    const logData = {
      id: logId, timestamp: new Date().toISOString(), ip, country, city,
      method: req.method, url: urlPath, status_code: statusCode,
      response_time_ms: responseTimeMs,
      response_size_bytes: parseInt(res.getHeader('content-length') as string || '0', 10),
      user_agent: userAgent, role: (req as any).user?.role || 'anonymous',
      api_name: urlPath.split('/')[2] || 'unknown',
      risk_score: threatResult.riskScore, severity: threatResult.severity,
      detected_threats: JSON.stringify(threatResult.detectedThreats),
      is_flagged: threatResult.isFlagged, is_bot: threatResult.isBot,
      user_id: validUserId,
      request_body: JSON.stringify(sanitizeBody(req.body)),
    };

    if (wssInstance) {
      const payload = JSON.stringify({ type: 'NEW_LOG', payload: logData });
      wssInstance.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
      });
    }

    try {
      await query(`
        INSERT INTO securemart_logs (
          id, ip, country, city, method, url, status_code, response_time_ms,
          response_size_bytes, user_agent, role, api_name, risk_score, severity,
          detected_threats, is_flagged, is_bot, user_id, request_body
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      `, [
        logData.id, logData.ip, logData.country, logData.city, logData.method,
        logData.url, logData.status_code, logData.response_time_ms,
        logData.response_size_bytes, logData.user_agent, logData.role,
        logData.api_name, logData.risk_score, logData.severity,
        logData.detected_threats, logData.is_flagged, logData.is_bot,
        logData.user_id, logData.request_body,
      ]).catch(() => {});

      if (threatResult.isFlagged) {
        for (const threat of threatResult.detectedThreats) {
          const alertId = uuidv4();
          await query(`
            INSERT INTO securemart_alerts (
              id, log_id, rule_id, rule_name, severity, risk_score, description,
              why_flagged, potential_impact, investigation_steps, mitigations,
              owasp_category, ip, country, user_agent, url, payload_sample
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          `, [
            alertId, logData.id, threat.ruleId, threat.name, threat.severity,
            threat.score, threat.desc, threat.whyFlagged, threat.potentialImpact,
            JSON.stringify(threat.investigationSteps), JSON.stringify(threat.mitigations),
            threat.owasp, logData.ip, logData.country, logData.user_agent,
            logData.url, threat.payloadSample || '',
          ]).catch(() => {});
        }
      }
    } catch {}
  });

  next();
};
