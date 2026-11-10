import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '5s', target: 20 },
    { duration: '20s', target: 50 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300', 'p(99)<500'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

const BASE_URL = __ENV.API_URL || 'http://localhost:3334'
const LATITUDE = __ENV.LATITUDE || '-2.4432'
const LONGITUDE = __ENV.LONGITUDE || '-54.7123'
const RAIO = __ENV.RAIO || '1600'

export default function () {
  const url = `${BASE_URL}/casos?latitude=${LATITUDE}&longitude=${LONGITUDE}&raio=${RAIO}`
  const res = http.get(url)

  check(res, {
    'status é 200': (r) => r.status === 200,
    'resposta contém casos': (r) => {
      try {
        const corpo = JSON.parse(r.body)
        return Array.isArray(corpo.casos) && corpo.casos.length > 0
      } catch (e) {
        return false
      }
    },
  })

  sleep(0.05)
}
