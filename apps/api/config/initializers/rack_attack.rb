class Rack::Attack
  # throttle login attempts: 5 per 20 seconds per IP
  throttle('logins/ip', limit: 5, period: 20.seconds) do |req|
    req.ip if req.path == '/login' && req.post?
  end

  # throttle signup attempts: 3 per hour per IP
  throttle('signups/ip', limit: 3, period: 1.hour) do |req|
    req.ip if req.path == '/signup' && req.post?
  end

  # general API throttle: 300 requests per 5 minutes per IP
  throttle('api/ip', limit: 300, period: 5.minutes) do |req|
    req.ip
  end

  # return a JSON 429 on throttle
  self.throttled_responder = lambda do |req|
    [
      429,
      { 'Content-Type' => 'application/json' },
      [{ error: 'rate limit exceeded, try again later' }.to_json]
    ]
  end
end
