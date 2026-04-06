import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

/** Reads the (non-httpOnly) access_token from document.cookie. */
function getTokenFromCookie(): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

// Queue for concurrent requests that receive 401 while a refresh is in progress
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
    failedQueue.forEach(({ resolve, reject }) => {
        error ? reject(error) : resolve(token!);
    });
    failedQueue = [];
}

// Attach access token from cookie on every request
api.interceptors.request.use(
    (config) => {
        const token = getTokenFromCookie();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 responses with transparent token rotation
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const is401 = error.response?.status === 401;
        const isRetry = originalRequest._retry;
        const isAuthEndpoint =
            originalRequest.url?.includes("/auth/refresh") ||
            originalRequest.url?.includes("/auth/login");

        if (is401 && !isRetry && !isAuthEndpoint) {
            if (isRefreshing) {
                // Enqueue concurrent requests — they'll be resolved once the refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call the Next.js route handler — it reads the httpOnly refresh_token
                // cookie and returns the new access_token in the body
                const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
                if (!refreshRes.ok) throw new Error("Refresh failed");

                const { access_token } = await refreshRes.json();

                // The route handler already set the new cookies via Set-Cookie headers
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                processQueue(null, access_token);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                if (typeof window !== "undefined") {
                    window.location.href = "/auth/login";
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        const mensaje = error.response?.data?.detail || error.message;
        return Promise.reject(new Error(mensaje));
    }
);

export default api;
