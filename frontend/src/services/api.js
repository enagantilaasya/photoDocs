// Automatically connects to Render backend in production or local proxy in development
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://photodocs.onrender.com/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

// Attach JWT token to all outgoing requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('photo_gallery_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthenticated sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on 401 if it expired
      if (localStorage.getItem('photo_gallery_token')) {
        localStorage.removeItem('photo_gallery_token');
        localStorage.removeItem('photo_gallery_user');
      }
    }
    return Promise.reject(error);
  }
);

/* ================= AUTH API ================= */
export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

/* ================= POSTS API ================= */
export const fetchPublicPosts = async (params = {}) => {
  const response = await api.get('/posts', { params });
  return response.data;
};

export const fetchPostById = async (id) => {
  const response = await api.get(`/posts/${id}`);
  return response.data;
};

export const createPostApi = async (formData) => {
  const response = await api.post('/posts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const fetchMyPosts = async () => {
  const response = await api.get('/posts/my-posts');
  return response.data;
};

export const fetchUserStats = async () => {
  const response = await api.get('/posts/user-stats');
  return response.data;
};

export const updatePostApi = async (id, postData) => {
  const response = await api.put(`/posts/${id}`, postData);
  return response.data;
};

export const deletePostApi = async (id) => {
  const response = await api.delete(`/posts/${id}`);
  return response.data;
};

export const getDownloadReportUrl = (postId) => {
  return `${API_BASE_URL}/posts/${postId}/report`;
};

/* ================= ADMIN API ================= */
export const fetchAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const fetchAdminPosts = async (params = {}) => {
  const response = await api.get('/admin/posts', { params });
  return response.data;
};

export const approvePostApi = async (id) => {
  const response = await api.put(`/admin/posts/${id}/approve`);
  return response.data;
};

export const rejectPostApi = async (id, reviewNote) => {
  const response = await api.put(`/admin/posts/${id}/reject`, { reviewNote });
  return response.data;
};

export const deletePostAdminApi = async (id) => {
  const response = await api.delete(`/admin/posts/${id}`);
  return response.data;
};

export const fetchAdminUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export default api;
