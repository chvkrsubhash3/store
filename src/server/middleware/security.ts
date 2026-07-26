import { Request } from 'express';

export interface ThreatDetail {
  ruleId: string; name: string; severity: 'Critical' | 'High' | 'Medium' | 'Low';
  score: number; desc: string; whyFlagged: string; potentialImpact: string;
  investigationSteps: string[]; mitigations: string[]; owasp: string;
  payloadSample?: string;
}

export interface ThreatAnalysisResult {
  riskScore: number; severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'None';
  isFlagged: boolean; isBot: boolean; detectedThreats: ThreatDetail[];
}

const bruteForceTracker = new Map<string, { count: number; firstAttempt: number }>();
const tracker404 = new Map<string, { count: number; windowStart: number }>();

export const analyzeThreats = (req: Request, ip: string, userAgent: string): ThreatAnalysisResult => {
  const threats: ThreatDetail[] = [];
  const fullUrl = req.originalUrl || req.url || '';
  const bodyStr = JSON.stringify(req.body || {});
  const headersStr = JSON.stringify(req.headers || {});
  const searchStr = `${fullUrl} ${bodyStr} ${headersStr}`;
  const searchStrLower = searchStr.toLowerCase();

  const check = (patterns: (string | RegExp)[]) =>
    patterns.some(p => typeof p === 'string' ? searchStrLower.includes(p.toLowerCase()) : p.test(searchStr));

  // SQLi
  if (check(["' or 1=1", "union select", "drop table", "exec(", "xp_cmdshell", "sleep(", "benchmark("])) {
    threats.push({
      ruleId: 'SQLi-001', name: 'SQL Injection Attempt', severity: 'Critical', score: 95,
      desc: 'Detects SQL syntax injection attempting unauthorized query modification.',
      whyFlagged: 'Payload contains SQL keywords or syntax manipulation patterns.',
      potentialImpact: 'Data breach, table drops, or authentication bypass.',
      investigationSteps: ['Inspect full query logs', 'Check database error logs', 'Verify parameterization'],
      mitigations: ['Use parameterized queries / ORM', 'Validate input types', 'Apply least-privilege DB roles'],
      owasp: 'A03:2021 – Injection', payloadSample: searchStr.substring(0, 150),
    });
  }

  // NoSQLi
  if (check(['$where', '$gt', '$ne', '$regex', '$or'])) {
    threats.push({
      ruleId: 'NoSQLi-001', name: 'NoSQL Injection Attempt', severity: 'High', score: 80,
      desc: 'Detects MongoDB / NoSQL operator injection in request body.',
      whyFlagged: 'Contains NoSQL query operators like $gt, $where, or $regex.',
      potentialImpact: 'Authentication bypass or database dumping.',
      investigationSteps: ['Examine JSON body payload', 'Check MongoDB query logs'],
      mitigations: ['Sanitize object keys', 'Enforce strict schema validation'],
      owasp: 'A03:2021 – Injection',
    });
  }

  // XSS
  if (check(['<script>', 'javascript:', 'onerror=', 'onload=', 'eval(', 'document.cookie'])) {
    threats.push({
      ruleId: 'XSS-001', name: 'Cross-Site Scripting Attempt', severity: 'High', score: 75,
      desc: 'Detects HTML script tag or JavaScript event handler injection.',
      whyFlagged: 'Request payload contains script tags or DOM event handler attributes.',
      potentialImpact: 'Session hijacking, malicious redirects, or defacement.',
      investigationSteps: ['Check if payload is reflected in response', 'Audit sanitization'],
      mitigations: ['Encode output HTML', 'Implement Content-Security-Policy (CSP)', 'Set HttpOnly flag on cookies'],
      owasp: 'A03:2021 – Injection',
    });
  }

  // Path Traversal
  if (check(['../', '%2e%2e/', '/etc/passwd', 'c:\\windows'])) {
    threats.push({
      ruleId: 'PathTraversal-001', name: 'Path Traversal Attempt', severity: 'High', score: 85,
      desc: 'Detects attempts to access restricted directory paths.',
      whyFlagged: 'Contains directory traversal sequences (../ or encoded variants).',
      potentialImpact: 'Reading arbitrary system files or configuration settings.',
      investigationSteps: ['Check requested file path parameter', 'Verify file system permissions'],
      mitigations: ['Use path.basename()', 'Restrict file access to fixed whitelist directory'],
      owasp: 'A01:2021 – Broken Access Control',
    });
  }

  // Command Injection
  if (check(['; ls', '| bash', '`whoami`', '$(id)', '&& curl', '; cat'])) {
    threats.push({
      ruleId: 'CmdInjection-001', name: 'Command Injection Attempt', severity: 'Critical', score: 98,
      desc: 'Detects shell command execution metacharacters.',
      whyFlagged: 'Payload contains OS shell metacharacters and command names.',
      potentialImpact: 'Full remote code execution on the server.',
      investigationSteps: ['Identify which process spawned child shell', 'Audit exec() calls'],
      mitigations: ['Avoid exec() or system() calls', 'Use child_process.execFile with arguments array'],
      owasp: 'A03:2021 – Injection',
    });
  }

  // Security Tool UA
  const toolUAs = ['sqlmap', 'nikto', 'gobuster', 'nmap', 'hydra', 'metasploit', 'burp', 'zaproxy'];
  const matchedUA = toolUAs.find(t => userAgent.toLowerCase().includes(t));
  if (matchedUA) {
    threats.push({
      ruleId: 'DirEnum-001', name: `Security Scanner Identified (${matchedUA})`, severity: 'High', score: 70,
      desc: `Automated security scanner detected via User-Agent signature: ${matchedUA}.`,
      whyFlagged: `User-Agent header contains known scanner signature '${matchedUA}'.`,
      potentialImpact: 'Active automated reconnaissance or vulnerability scanning.',
      investigationSteps: ['Track all requests from this IP', 'Check for high request frequency'],
      mitigations: ['Block or rate-limit scanner User-Agents at WAF/reverse-proxy level'],
      owasp: 'A05:2021 – Security Misconfiguration',
    });
  }

  // Brute Force Login
  if (fullUrl.includes('/login') && req.method === 'POST') {
    const tracker = bruteForceTracker.get(ip) || { count: 0, firstAttempt: Date.now() };
    if (Date.now() - tracker.firstAttempt > 60000) { tracker.count = 1; tracker.firstAttempt = Date.now(); }
    else { tracker.count++; }
    bruteForceTracker.set(ip, tracker);

    if (tracker.count >= 5) {
      threats.push({
        ruleId: 'BruteForce-001', name: 'Brute Force Login Detected', severity: 'High', score: 80,
        desc: `High frequency of login attempts from IP ${ip} (${tracker.count} attempts / minute).`,
        whyFlagged: 'Exceeded 5 login attempts within a 60-second window.',
        potentialImpact: 'Account takeover via credential stuffing or dictionary attack.',
        investigationSteps: ['Check targeted username accounts', 'Review account lockout events'],
        mitigations: ['Enforce IP rate limiting', 'Implement account lockouts & CAPTCHA'],
        owasp: 'A07:2021 – Auth Failures',
      });
    }
  }

  const riskScore = threats.length > 0 ? Math.max(...threats.map(t => t.score)) : 0;
  let severity: ThreatAnalysisResult['severity'] = 'None';
  if (riskScore >= 90) severity = 'Critical';
  else if (riskScore >= 70) severity = 'High';
  else if (riskScore >= 40) severity = 'Medium';
  else if (riskScore > 0) severity = 'Low';

  const isBot = matchedUA !== undefined || userAgent.toLowerCase().includes('bot') || userAgent.toLowerCase().includes('crawler');

  return { riskScore, severity, isFlagged: threats.length > 0, isBot, detectedThreats: threats };
};
