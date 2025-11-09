import axios from "axios";
import type { AxiosInstance } from "axios";

const API_URL = "http://127.0.0.1:5000"; // Flask backend URL

export const axiosClient: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Automatically add JWT if available
axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
