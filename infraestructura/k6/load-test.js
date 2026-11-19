import http from 'k6/http';
import { sleep, check, group } from 'k6';

// Configuración dinámica por variables de entorno (soporta BASE_URL y TARGET_URL)
const BASE_URL = (__ENV.BASE_URL || __ENV.TARGET_URL || 'http://localhost:8080').replace(/\/+$/, '');
const PROFILE = __ENV.PROFILE || 'local'; // 'local' o 'cloud'

const STAGES = PROFILE === 'cloud'
  ? [
      // Perfil moderado para Render (512 MB) y TiDB Cloud Serverless (cuida RUs)
      { duration: '15s', target: 5 },
      { duration: '30s', target: 5 },
      { duration: '15s', target: 0 },
    ]
  : [
      // Perfil local / CI
      { duration: '10s', target: 20 },
      { duration: '30s', target: 20 },
      { duration: '10s', target: 0 },
    ];

export const options = {
  stages: STAGES,
  thresholds: {
    // 95% de peticiones deben responder en menos de 1500ms (realista para runner de CI)
    http_req_duration: ['p(95)<1500'],
    // Tasa de fallos menor al 1%
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const headers = {
    'Accept': 'application/json',
    'User-Agent': `k6-performance-test/${PROFILE}`,
  };

  group('1. Health Check (Render / UptimeRobot)', () => {
    const resHealth = http.get(`${BASE_URL}/actuator/health`, { headers });
    check(resHealth, {
      'health status 200': (r) => r.status === 200,
      'health body contains UP': (r) => r.body && r.body.includes('UP'),
      'has X-Request-ID': (r) => r.headers['X-Request-Id'] !== undefined || r.headers['x-request-id'] !== undefined,
    });
  });

  group('2. Especificación OpenAPI / Documentación', () => {
    const resDocs = http.get(`${BASE_URL}/v3/api-docs`, { headers });
    check(resDocs, {
      'docs status 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}
