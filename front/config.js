const API = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://127.0.0.1:8000"
  : location.hostname.endsWith("cloudfront.net") ? "/api" : "http://32.194.222.146:8000";
