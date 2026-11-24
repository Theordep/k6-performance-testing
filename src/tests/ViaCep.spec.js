import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const getCepDuration = new Trend('get_cep', true);
export const RateContentOK = new Rate('content_OK');

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.25'],
    get_cep: ['p(90)<6800']
  },
  vus: 7,
  stages: [
    { duration: '1m', target: 40 },
    { duration: '1m30s', target: 92 },
    { duration: '1m', target: 92 }
  ]
};

export function handleSummary(data) {
  return {
    './src/output/viacep.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

const CEPS = ['01001000', '20040002', '30130010', '80010000', '70040010'];

export default function () {
  const baseUrl = 'https://viacep.com.br/ws';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  const cep = CEPS[Math.floor(Math.random() * CEPS.length)];

  const res = http.get(`${baseUrl}/${cep}/json/`, params);

  getCepDuration.add(res.timings.duration);

  RateContentOK.add(res.status === OK);

  check(res, {
    'GET CEP - Status 200': () => res.status === OK,
    'GET CEP - CEP retornado confere': () =>
      res.status === OK && res.json('cep').replace('-', '') === cep
  });

  // Pausa entre requisições: o ViaCEP bloqueia IPs com volume muito alto
  // (no GitHub Actions, com sleep(1), as conexões passaram a dar timeout).
  sleep(5);
}
